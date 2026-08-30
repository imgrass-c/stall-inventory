import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';
import { realtime } from '../../services/realtime';
import { formatTaiwanTime } from '../../utils/formatters';

export default function EodModal({
  todayData,
  onClose,
  onConfirmCloseout
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return todayData.date || new Date().toISOString().split('T')[0];
  });
  const [events, setEvents] = useState([]);
  const [selectedEventName, setSelectedEventName] = useState('一般現場');
  const [customEventInput, setCustomEventInput] = useState('');
  const [showCustomEvent, setShowCustomEvent] = useState(false);

  // 該日銷售數據與載入狀態
  const [daySales, setDaySales] = useState([]);
  const [loadingDate, setLoadingDate] = useState(false);
  const [isClosingEod, setIsClosingEod] = useState(false);

  // 監聽出攤活動清單
  useEffect(() => {
    const unsub = realtime.subscribeEvents((eventsList) => {
      setEvents(eventsList || []);
      const active = (eventsList || []).filter(e => e.status !== '已撤攤結算');
      if (active.length > 0) {
        setSelectedEventName(active[0].name);
      }
    });
    return () => unsub();
  }, []);

  // 當結算日期變更時，抓取該日銷售資料並動態運算
  const loadDateData = async (dateStr) => {
    setLoadingDate(true);
    try {
      let sales = [];
      if (realtime.isFirebaseReady && realtime.db) {
        const snap = await realtime.db.collection('sales_orders').where('date', '==', dateStr).get();
        snap.forEach(d => sales.push(d.data()));
      } else {
        const allSales = JSON.parse(localStorage.getItem('stall_local_sales') || '[]');
        sales = allSales.filter(s => s.date === dateStr);
      }
      setDaySales(sales);
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingDate(false);
    }
  };

  useEffect(() => {
    loadDateData(selectedDate);
  }, [selectedDate]);

  // 切換前一日 / 後一日
  const handleShiftDate = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const newDateStr = current.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
  };

  // 運算該選擇日之財務指標
  const stats = React.useMemo(() => {
    const valid = daySales.filter(s => s.status !== '已作廢');
    let totalRevenue = 0, totalCost = 0, totalItems = 0;
    let pm = { "現金": 0, "LinePay": 0, "街口": 0, "轉帳": 0, "公關贈送": 0 };
    let owners = {};

    valid.forEach(s => {
      const pMethod = s.payment_method || '現金';
      const isPR = pMethod === '公關贈送';
      const orig = Number(s.total_amount || 0);
      const finalAmt = isPR ? 0 : Number(s.final_amount !== undefined ? s.final_amount : (s.finalAmount !== undefined ? s.finalAmount : (orig - Number(s.discount_amount || 0))));
      
      totalRevenue += finalAmt;
      pm[pMethod] = (pm[pMethod] || 0) + finalAmt;

      const discountRatio = orig > 0 ? (finalAmt / orig) : (isPR ? 0 : 1);

      (s.items || []).forEach(it => {
        const q = Number(it.qty || 1);
        const p = Number(it.price || 0);
        const c = Number(it.cost || 0);
        const owner = it.owner || '攤位公家';

        const itemSubtotal = p * q;
        const itemReal = isPR ? 0 : Math.round(itemSubtotal * discountRatio);
        const itemCost = c * q;
        const itemProfit = itemReal - itemCost;

        totalCost += itemCost;
        totalItems += q;

        if (!owners[owner]) {
          owners[owner] = { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalQty: 0 };
        }
        owners[owner].totalRevenue += itemReal;
        owners[owner].totalCost += itemCost;
        owners[owner].totalProfit += itemProfit;
        owners[owner].totalQty += q;
      });
    });

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      totalOrders: valid.length,
      totalItemsSold: totalItems,
      paymentBreakdown: pm,
      ownerBreakdown: owners
    };
  }, [daySales]);

  const handleDoEodCloseout = async () => {
    setIsClosingEod(true);
    try {
      const effectiveEvent = showCustomEvent ? (customEventInput.trim() || '一般現場') : selectedEventName;
      const reportPayload = {
        date: selectedDate,
        eventName: effectiveEvent,
        totalRevenue: stats.totalRevenue,
        totalCost: stats.totalCost,
        totalProfit: stats.totalProfit,
        profitMargin: stats.profitMargin,
        totalOrders: stats.totalOrders,
        totalItemsSold: stats.totalItemsSold,
        paymentBreakdown: stats.paymentBreakdown,
        ownerBreakdown: stats.ownerBreakdown,
        closedAt: new Date().toISOString()
      };
      await onConfirmCloseout(reportPayload);
      alert(`【${selectedDate}】收攤日結彙總完成！\n\n已成功將營收數據與日結戰報自動同步至 Google 試算表備份！`);
      onClose();
    } catch(err) {
      alert("日結失敗：" + err.message);
    } finally {
      setIsClosingEod(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3.5 animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* 頂部標題 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
              <Icons.Flag className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">收攤日結彙總與上傳確認</h3>
              <p className="text-xs text-slate-400 font-bold">可切換檢視前一日/當日數據，確認無誤後上傳 Google 試算表</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        {/* 🌟 結算日期選擇器 (支援快速切換前一日、後一日) */}
        <div className="bg-surface-50 p-3 rounded-2xl border border-slate-200 space-y-2">
          <label className="block text-xs font-black text-slate-700">選擇結算日期：</label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="min-h-[40px] px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 transition flex items-center gap-1 shadow-sm"
            >
              <Icons.ChevronLeft className="w-3.5 h-3.5" />
              <span>前一日</span>
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="flex-1 min-h-[40px] bg-white border border-slate-200 rounded-xl px-2 text-center text-xs sm:text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-purple-400 shadow-sm"
            />
            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="min-h-[40px] px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 transition flex items-center gap-1 shadow-sm"
            >
              <span>後一日</span>
              <Icons.ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 🌟 出攤活動場次選擇 (自動帶入已建檔場次) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black text-slate-700">本日出攤活動場次：</label>
            <button
              type="button"
              onClick={() => setShowCustomEvent(!showCustomEvent)}
              className="text-[11px] font-black text-purple-600 hover:text-purple-700"
            >
              {showCustomEvent ? '選擇既有場次' : '+ 自訂場次名稱'}
            </button>
          </div>

          {showCustomEvent ? (
            <input
              type="text"
              placeholder="輸入自訂場次 (例: 2026 大港開唱 Day 2)..."
              value={customEventInput}
              onChange={e => setCustomEventInput(e.target.value)}
              className="w-full min-h-[42px] bg-surface-50 border-2 border-purple-300 rounded-2xl px-3 text-xs font-black text-purple-900 focus:outline-none"
            />
          ) : (
            <select
              value={selectedEventName}
              onChange={e => setSelectedEventName(e.target.value)}
              className="w-full min-h-[42px] bg-surface-50 border border-slate-200 rounded-2xl px-3 text-xs sm:text-sm font-black text-slate-900 focus:outline-none focus:border-purple-400"
            >
              {events.length === 0 ? (
                <option value="一般現場">一般現場 (尚未建立出攤活動)</option>
              ) : (
                events.map(ev => (
                  <option key={ev.event_id} value={ev.name}>
                    {ev.name} ({ev.status})
                  </option>
                ))
              )}
              <option value="一般現場">一般現場</option>
            </select>
          )}
        </div>

        {/* 該日數據即時彙總卡片 (確認內容) */}
        <div className="bg-purple-50/60 rounded-3xl p-4 border border-purple-200 space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-purple-100">
            <span className="font-black text-purple-900 text-sm">
              【{selectedDate}】單日數據預覽
            </span>
            {loadingDate && <span className="text-purple-600 animate-pulse font-bold">載入資料中...</span>}
            <span className="bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
              {stats.totalOrders} 單 • {stats.totalItemsSold} 件商品
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-700 font-bold">
            <div className="bg-white p-2.5 rounded-xl border border-purple-100">
              <span className="text-[10px] text-slate-400 block">單日實收營業額</span>
              <span className="text-base font-black text-slate-900 font-mono">NT$ {stats.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-purple-100">
              <span className="text-[10px] text-slate-400 block">單日實質總毛利</span>
              <span className="text-base font-black text-emerald-600 font-mono">NT$ {stats.totalProfit.toLocaleString()} ({stats.profitMargin}%)</span>
            </div>
          </div>

          {/* 現金需清點金額 */}
          <div className="bg-white p-3 rounded-xl border border-rose-200 flex justify-between items-center">
            <div>
              <span className="text-slate-700 font-black block">現場現金需清點金額：</span>
              <span className="text-[10px] text-slate-400 font-bold">請核對現場錢包現金</span>
            </div>
            <span className="text-lg font-black text-rose-600 font-mono">
              NT$ {(stats.paymentBreakdown['現金'] || 0).toLocaleString()}
            </span>
          </div>

          {/* 雙夥伴分帳預覽 */}
          {Object.keys(stats.ownerBreakdown).length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-purple-800 font-black">夥伴今日業績與毛利貢獻：</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {Object.entries(stats.ownerBreakdown).map(([owner, oData]) => (
                  <div key={owner} className="bg-white p-2 rounded-lg border border-purple-100 flex justify-between items-center text-[11px]">
                    <span className="font-black text-slate-800">{owner} ({oData.totalQty}件)</span>
                    <span className="font-mono text-purple-700 font-bold">收${oData.totalRevenue} / 利${oData.totalProfit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[46px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleDoEodCloseout}
            disabled={isClosingEod || loadingDate}
            className="flex-1 min-h-[46px] bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-1.5"
          >
            <Icons.Check className="w-4 h-4 text-white" />
            <span>{isClosingEod ? '日結上傳中...' : '確認完成收攤日結並上傳'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
