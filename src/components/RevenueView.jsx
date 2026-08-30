import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, Package, RefreshCw, XCircle, Cloud, CheckCircle2, Calendar, TrendingUp, Tag, Users, Download, ArrowLeft, ArrowRight } from 'lucide-react';

export function formatTaiwanTime(ts, mode = 'time') {
  if (!ts) return '';
  const d = (ts instanceof Date) ? ts : new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  
  try {
    const formatter = new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    const m = {};
    parts.forEach(p => m[p.type] = p.value);
    
    if (mode === 'date') return `${m.year}-${m.month}-${m.day}`;
    if (mode === 'time') return `${m.hour}:${m.minute}`;
    if (mode === 'time_sec') return `${m.hour}:${m.minute}:${m.second}`;
    if (mode === 'datetime') return `${m.year}/${m.month}/${m.day} ${m.hour}:${m.minute}`;
    if (mode === 'full') return `${m.year}/${m.month}/${m.day} ${m.hour}:${m.minute}:${m.second}`;
    return `${m.hour}:${m.minute}`;
  } catch (e) {
    const pad = n => String(n).padStart(2, '0');
    if (mode === 'date') return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if (mode === 'time_sec') return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

export default function RevenueView({
  onFetchTodaySales,
  onFetchMonthSales,
  onFetchEventSales,
  onFetchAllEvents,
  onSaveDailyReport,
  onVoidSale,
  onSyncSheets,
  user
}) {
  const [viewTab, setViewTab] = useState('today'); // 'today' | 'month' | 'event'
  const [selectedMonth, setSelectedMonth] = useState(() => formatTaiwanTime(new Date(), 'date').slice(0, 7)); // 'YYYY-MM'
  const [selectedEvent, setSelectedEvent] = useState('ALL');
  const [eventsList, setEventsList] = useState([]);
  
  const [todayData, setTodayData] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    profitMargin: 0,
    totalOrders: 0,
    totalItemsSold: 0,
    paymentBreakdown: { "現金": 0, "LinePay": 0, "街口": 0, "轉帳": 0, "公關贈送": 0 },
    recentSales: [],
    ownerBreakdown: {},
    itemRanking: []
  });

  const [monthData, setMonthData] = useState(null);
  const [eventData, setEventData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [showEodModal, setShowEodModal] = useState(false);
  const [eodEventInput, setEodEventInput] = useState('現場出攤');
  const [isClosingEod, setIsClosingEod] = useState(false);

  const exportToCsv = (filename, headers, rows) => {
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPartnerSalesCsv = (partnerName, records = [], prefix = '今日') => {
    const headers = ["訂單編號", "交易時間 (台灣時間)", "活動場次", "商品歸屬攤主", "商品名稱", "規格尺寸", "售出數量", "標價單價", "折讓", "實收分帳金額", "進貨成本", "毛利", "付款方式", "操作員"];
    const rows = records.map(r => [
      r.orderId || '',
      r.timestamp ? formatTaiwanTime(r.timestamp, 'full') : '',
      r.eventName || '',
      partnerName,
      r.productName || '',
      r.variantName || '',
      r.qty || 1,
      r.originalPrice || 0,
      r.discount || 0,
      r.realSubtotal || 0,
      r.cost || 0,
      (r.realSubtotal || 0) - ((r.cost || 0) * (r.qty || 1)),
      r.paymentMethod || '現金',
      r.operator || ''
    ]);
    const dateStr = formatTaiwanTime(new Date(), 'date');
    exportToCsv(`感情失敗之友會_夥伴分帳明細_${prefix}_${partnerName}_${dateStr}.csv`, headers, rows);
  };

  const loadToday = async () => {
    setLoading(true);
    try {
      if (onFetchTodaySales) {
        const res = await onFetchTodaySales();
        if (res && res.success) {
          setTodayData(res);
        }
      }
    } catch(err) {
      console.error("載入今日營收資料失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonth = async (m) => {
    setLoading(true);
    try {
      const target = m || selectedMonth;
      if (onFetchMonthSales) {
        const res = await onFetchMonthSales(target);
        if (res && res.success) {
          setMonthData(res);
        }
      }
    } catch(err) {
      console.error("載入月度營收資料失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvent = async (ev) => {
    setLoading(true);
    try {
      const target = ev !== undefined ? ev : selectedEvent;
      if (onFetchEventSales) {
        const res = await onFetchEventSales(target);
        if (res && res.success) {
          setEventData(res);
        }
      }
    } catch(err) {
      console.error("載入活動營收資料失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEventsList = async () => {
    try {
      if (onFetchAllEvents) {
        const res = await onFetchAllEvents();
        if (res && res.events) {
          setEventsList(res.events);
        }
      }
    } catch (err) {
      console.error("載入活動清單失敗:", err);
    }
  };

  useEffect(() => {
    loadToday();
    loadEventsList();
  }, []);

  useEffect(() => {
    if (viewTab === 'month') {
      loadMonth(selectedMonth);
    } else if (viewTab === 'event') {
      loadEvent(selectedEvent);
      loadEventsList();
    } else {
      loadToday();
    }
  }, [viewTab, selectedMonth, selectedEvent]);

  const changeMonth = (offset) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const nextMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextMonthStr);
  };

  const handleVoid = async (oid) => {
    if (!confirm(`確定要作廢訂單 ${oid} 並將商品數量回補至現場庫存？`)) return;
    if (onVoidSale) {
      await onVoidSale(oid, user ? user.name : 'admin');
      loadToday();
    }
  };

  const handleSyncSheets = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      if (onSyncSheets) {
        const res = await onSyncSheets();
        if (res && res.success) {
          setSyncMsg('✅ 已成功將今日銷售與庫存同步備份至 Google 試算表！');
        } else {
          setSyncMsg('⚠️ 同步失敗：' + (res?.error || '請檢查 GAS 設定'));
        }
      }
    } catch (e) {
      setSyncMsg('⚠️ 同步錯誤：' + e.message);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  };

  const handleDoEodCloseout = async () => {
    setIsClosingEod(true);
    try {
      const eodPayload = {
        ...todayData,
        eventName: eodEventInput || '現場出攤',
        operator: user ? user.name : '攤主'
      };
      if (onSaveDailyReport) {
        const saveRes = await onSaveDailyReport(eodPayload);
        if (saveRes && saveRes.success) {
          setShowEodModal(false);
          setSyncMsg(`🎉 【${todayData.date}】收攤日結完成！正在同步至 Google 試算表...`);
          handleSyncSheets();
        } else {
          alert('收攤日結失敗：' + (saveRes?.error || '請稍後重試'));
        }
      }
    } catch (e) {
      alert('日結發生錯誤：' + e.message);
    } finally {
      setIsClosingEod(false);
    }
  };

  const handleExportTodaySalesCsv = () => {
    const headers = ["訂單編號", "銷售時間 (台灣時間)", "商品明細", "原始金額", "折讓金額", "實收金額", "支付方式", "操作員", "狀態"];
    const rows = (todayData.recentSales || []).map(s => [
      s.order_id,
      s.timestamp ? formatTaiwanTime(s.timestamp, 'full') : '',
      (s.items || []).map(i => `${i.productName}(${i.variantName})x${i.qty}`).join('; '),
      s.totalAmount || s.total_amount || 0,
      s.discountAmount || s.discount_amount || 0,
      s.finalAmount || s.final_amount || 0,
      s.paymentMethod || s.payment_method || '現金',
      s.operator || '',
      s.status || '有效'
    ]);
    const dateStr = formatTaiwanTime(new Date(), 'date');
    exportToCsv(`感情失敗之友會_今日銷售交易明細_${dateStr}.csv`, headers, rows);
  };

  const handleExportMonthSalesCsv = () => {
    const m = monthData || todayData;
    const headers = ["訂單編號", "銷售時間 (台灣時間)", "活動場次", "商品名稱", "規格尺寸", "售出件數", "標價單價", "折讓", "實收分帳金額", "進貨成本", "毛利", "付款方式", "操作員"];
    const rows = [];
    (m.recentSales || []).filter(s => s.status !== '已作廢').forEach(s => {
      const pm = s.paymentMethod || s.payment_method || '現金';
      const isPR = pm === '公關贈送';
      const orderTot = Number(s.totalAmount || s.total_amount || 0);
      const orderFin = isPR ? 0 : Number(s.finalAmount !== undefined ? s.finalAmount : (s.final_amount !== undefined ? s.final_amount : (orderTot - Number(s.discountAmount || 0))));
      const ratio = orderTot > 0 ? (orderFin / orderTot) : (isPR ? 0 : 1);

      (s.items || []).forEach(it => {
        const q = Number(it.qty) || 1;
        const p = Number(it.price) || 0;
        const c = Number(it.cost) || 0;
        const realSub = isPR ? 0 : Math.round(p * q * ratio);
        const costTot = c * q;
        rows.push([
          s.order_id,
          s.timestamp ? formatTaiwanTime(s.timestamp, 'full') : '',
          s.eventName || s.event_name || '一般現場',
          it.productName || '商品',
          it.variantName || '一般',
          q,
          p,
          (p * q) - realSub,
          realSub,
          costTot,
          realSub - costTot,
          pm,
          s.operator || ''
        ]);
      });
    });
    exportToCsv(`感情失敗之友會_${selectedMonth}_全月交易明細.csv`, headers, rows);
  };

  const handleExportEventSalesCsv = () => {
    const ed = eventData || todayData;
    const headers = ["訂單編號", "銷售時間 (台灣時間)", "活動場次", "商品名稱", "規格尺寸", "售出件數", "實收分帳金額", "進貨成本", "毛利", "付款方式", "操作員"];
    const rows = [];
    (ed.recentSales || []).filter(s => s.status !== '已作廢').forEach(s => {
      const pm = s.paymentMethod || s.payment_method || '現金';
      const isPR = pm === '公關贈送';
      const orderTot = Number(s.totalAmount || s.total_amount || 0);
      const orderFin = isPR ? 0 : Number(s.finalAmount !== undefined ? s.finalAmount : (s.final_amount !== undefined ? s.final_amount : (orderTot - Number(s.discountAmount || 0))));
      const ratio = orderTot > 0 ? (orderFin / orderTot) : (isPR ? 0 : 1);

      (s.items || []).forEach(it => {
        const q = Number(it.qty) || 1;
        const p = Number(it.price) || 0;
        const c = Number(it.cost) || 0;
        const realSub = isPR ? 0 : Math.round(p * q * ratio);
        const costTot = c * q;
        rows.push([
          s.order_id,
          s.timestamp ? formatTaiwanTime(s.timestamp, 'full') : '',
          s.eventName || s.event_name || '一般現場',
          it.productName || '商品',
          it.variantName || '一般',
          q,
          realSub,
          costTot,
          realSub - costTot,
          pm,
          s.operator || ''
        ]);
      });
    });
    exportToCsv(`感情失敗之友會_市集場次_${selectedEvent}_銷售明細.csv`, headers, rows);
  };

  const currentActiveData = viewTab === 'month' ? (monthData || todayData) : (viewTab === 'event' ? (eventData || todayData) : todayData);
  const totalRev = Number(currentActiveData?.totalRevenue || 0);
  const totalCost = Number(currentActiveData?.totalCost || 0);
  const totalProfit = Number(currentActiveData?.totalProfit || (totalRev - totalCost));
  const profitMargin = currentActiveData?.profitMargin || (totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : 0);
  const totalItems = Number(currentActiveData?.totalItemsSold || 0);
  const totalOrders = Number(currentActiveData?.totalOrders || 0);
  const cashRev = Number(currentActiveData?.paymentBreakdown?.['現金'] || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* 🌟 頂部三重視角切換器 */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
        <button
          type="button"
          onClick={() => setViewTab('today')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            viewTab === 'today'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>📅 今日即時戰報</span>
        </button>
        <button
          type="button"
          onClick={() => setViewTab('month')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            viewTab === 'month'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>📊 當月營收統計</span>
        </button>
        <button
          type="button"
          onClick={() => setViewTab('event')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            viewTab === 'event'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>🎪 市集活動場次分析</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* 📅 視角一：今日即時戰報 */}
      {/* ================================================================= */}
      {viewTab === 'today' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h2 className="text-base font-black text-slate-900">今日即時戰報 ({todayData.date})</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-bold">現場即時出攤數據 • 毫秒同步更新</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowEodModal(true)}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl font-black flex items-center gap-1.5 shadow-sm transition active:scale-95"
              >
                <span>🏁 今日收攤日結</span>
              </button>

              <button
                type="button"
                onClick={handleExportTodaySalesCsv}
                disabled={(todayData.recentSales || []).length === 0}
                className="text-xs bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>匯出今日 CSV</span>
              </button>

              <button
                type="button"
                onClick={handleSyncSheets}
                disabled={syncing}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Cloud className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? '同步中...' : '一鍵同步 Google Sheet'}</span>
              </button>

              <button type="button" onClick={loadToday} className="text-xs bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-200 text-slate-700 font-bold shadow-sm">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {syncMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">{syncMsg}</div>}

          {/* 今日 5 大核心指標 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">今日實收營業額</div>
              <div className="text-xl font-black text-slate-900 mt-1">NT$ {totalRev.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">預估商品總成本</div>
              <div className="text-xl font-black text-amber-700 mt-1">NT$ {totalCost.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">今日實質總毛利</div>
              <div className="text-xl font-black text-emerald-600 mt-1">NT$ {totalProfit.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">當前毛利率</div>
              <div className="text-xl font-black text-purple-700 mt-1">{profitMargin}%</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-500 font-bold">現金收款 / 件數</div>
              <div className="text-xl font-black text-slate-900 mt-1">NT$ {cashRev} <span className="text-xs text-slate-400 font-normal">({totalItems}件)</span></div>
            </div>
          </div>

          {/* 今日支付管道統計 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-black text-slate-700">各支付管道即時統計：</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
              {['現金', 'LinePay', '街口', '轉帳', '公關贈送'].map(pm => {
                const amt = Number(todayData?.paymentBreakdown?.[pm] || 0);
                return (
                  <div key={pm} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="text-slate-400 text-[10px] font-bold">{pm}</div>
                    <div className="font-black text-slate-900 text-sm mt-0.5">NT$ {amt.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 👥 雙夥伴 / 攤主分帳營收即時對帳 */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <Users className="w-4 h-4 text-purple-600" />
                <span>👥 雙夥伴 / 攤主分帳營收對帳</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">依商品歸屬精確拆算實收與毛利</span>
            </div>

            {Object.keys(todayData?.ownerBreakdown || {}).length > 0 ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(todayData.ownerBreakdown).map(([ownerName, ownerData]) => {
                    const pct = totalRev > 0 ? Math.round((ownerData.totalRevenue / totalRev) * 100) : 0;
                    const isExpanded = expandedPartner === ownerName;
                    const recordsCount = (ownerData.salesRecords || []).length;
                    return (
                      <div
                        key={ownerName}
                        className={`bg-purple-50/60 border-2 rounded-2xl p-4 space-y-2.5 transition ${
                          isExpanded ? 'border-purple-500 shadow-md ring-2 ring-purple-200' : 'border-purple-200/70 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                              {ownerName[0]}
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-900">{ownerName}</span>
                              <div className="text-[10px] text-purple-700 font-bold">攤位主理人</div>
                            </div>
                          </div>
                          <span className="bg-purple-200/80 text-purple-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                            佔今日 {pct}%
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs text-slate-500 font-bold">應分實收業績：</span>
                            <span className="text-lg font-black text-purple-700">NT$ {ownerData.totalRevenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-baseline text-[11px] border-t border-purple-50 pt-1 text-slate-500">
                            <span className="font-medium">預估毛利貢獻：</span>
                            <span className="font-black text-emerald-600">NT$ {ownerData.totalProfit.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 font-bold flex justify-between px-1">
                          <span>售出商品件數：</span>
                          <span className="text-slate-900 font-black">{ownerData.totalQty} 件 ({recordsCount} 筆)</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedPartner(isExpanded ? null : ownerName)}
                          className={`w-full py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 border ${
                            isExpanded
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100/50'
                          }`}
                        >
                          <span>{isExpanded ? '收起此夥伴銷售明細 ▲' : `🔍 查看此夥伴銷售明細 (${recordsCount} 筆) ▼`}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* 📋 展開該夥伴之單一銷售詳細清單 */}
                {expandedPartner && todayData?.ownerBreakdown?.[expandedPartner] && (
                  <div className="bg-white rounded-2xl border-2 border-purple-300 p-4 space-y-3 shadow-md animate-in fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-purple-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                        <h4 className="text-xs font-black text-slate-900">
                          【{expandedPartner}】的單一銷售詳細紀錄 (共 {(todayData.ownerBreakdown[expandedPartner].salesRecords || []).length} 筆)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportPartnerSalesCsv(expandedPartner, todayData.ownerBreakdown[expandedPartner].salesRecords, '今日')}
                        className="text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 px-3 py-1.5 rounded-xl font-black flex items-center gap-1 shadow-sm transition"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-700" />
                        <span>匯出【{expandedPartner}】今日銷售 CSV</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[11px] font-black text-slate-600 border-b border-slate-200">
                            <th className="p-2.5 whitespace-nowrap">時間 (台灣)</th>
                            <th className="p-2.5 whitespace-nowrap">單號</th>
                            <th className="p-2.5 whitespace-nowrap">商品名稱與規格</th>
                            <th className="p-2.5 text-center whitespace-nowrap">數量</th>
                            <th className="p-2.5 text-right whitespace-nowrap">標價</th>
                            <th className="p-2.5 text-right whitespace-nowrap text-rose-500">折讓</th>
                            <th className="p-2.5 text-right whitespace-nowrap text-purple-700 font-black">實收分帳</th>
                            <th className="p-2.5 whitespace-nowrap">支付方式</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {(todayData.ownerBreakdown[expandedPartner].salesRecords || []).map((rec, idx) => (
                            <tr key={idx} className="hover:bg-purple-50/30 transition">
                              <td className="p-2.5 text-slate-700 font-mono text-[11px] whitespace-nowrap" title={formatTaiwanTime(rec.timestamp, 'full')}>
                                🕒 {formatTaiwanTime(rec.timestamp, 'time_sec') || '現場'}
                              </td>
                              <td className="p-2.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                {rec.orderId}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                                {rec.productName} <span className="text-purple-600 font-bold">({rec.variantName})</span>
                              </td>
                              <td className="p-2.5 text-center font-black text-slate-800">
                                {rec.qty}
                              </td>
                              <td className="p-2.5 text-right text-slate-500">
                                NT$ {rec.originalPrice * rec.qty}
                              </td>
                              <td className="p-2.5 text-right text-rose-500 font-bold">
                                {rec.discount > 0 ? `-NT$ ${rec.discount}` : '-'}
                              </td>
                              <td className="p-2.5 text-right font-black text-purple-700 text-sm">
                                NT$ {rec.realSubtotal}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  rec.paymentMethod === '公關贈送' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {rec.paymentMethod}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-5 text-slate-400 text-xs font-bold">
                今日尚無銷售分帳紀錄
              </div>
            )}
          </div>

          {/* 今日交易明細清單 */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 text-xs font-black text-slate-700 border-b border-slate-200">
              今日交易明細清單 ({(todayData.recentSales || []).length} 筆)
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {(todayData.recentSales || []).length > 0 ? (
                (todayData.recentSales || []).map(s => {
                  const amt = s.finalAmount || s.final_amount || s.totalAmount || 0;
                  const isVoid = s.status === '已作廢';
                  return (
                    <div key={s.order_id} className={`p-4 flex justify-between items-center text-xs ${isVoid ? 'opacity-40 bg-rose-50/20' : 'hover:bg-slate-50'}`}>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {(s.items || []).map(i => `${i.productName || '商品'}(${i.variantName || '一般'}) x${i.qty}`).join(', ')}
                        </div>
                        <div className="text-slate-400 text-xs mt-1 font-bold flex items-center gap-1.5 flex-wrap">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono text-[11px] flex items-center gap-1">
                            🕒 {formatTaiwanTime(s.timestamp, 'time_sec') || '現場'}
                          </span>
                          <span>•</span>
                          <span className="text-slate-700">{s.paymentMethod || s.payment_method || '現金'}</span>
                          <span>•</span>
                          <span>經手：{s.operator || '小幫手'}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-400">單號：{s.order_id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-base">NT$ {amt}</span>
                        {!isVoid && (
                          <button onClick={() => handleVoid(s.order_id)} className="px-3 py-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-black transition">
                            作廢
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : <div className="text-center py-8 text-slate-400 text-xs font-bold">今日尚無銷售交易</div>}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 📊 視角二：當月營收統計 */}
      {/* ================================================================= */}
      {viewTab === 'month' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 transition"
              >
                ◀ 上個月
              </button>
              <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-black text-sm">
                📅 {selectedMonth} 月度總報表
              </div>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 transition"
              >
                下個月 ▶
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportMonthSalesCsv}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>匯出【{selectedMonth}】全月 CSV</span>
              </button>

              <button type="button" onClick={() => loadMonth(selectedMonth)} className="text-xs bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-200 text-slate-700 font-bold shadow-sm">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 當月 5 大財務 KPI 卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">當月累積實收</div>
              <div className="text-xl font-black text-slate-900 mt-1">NT$ {totalRev.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">當月商品總成本</div>
              <div className="text-xl font-black text-amber-700 mt-1">NT$ {totalCost.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">當月實質總毛利</div>
              <div className="text-xl font-black text-emerald-600 mt-1">NT$ {totalProfit.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">當月平均毛利率</div>
              <div className="text-xl font-black text-purple-700 mt-1">{profitMargin}%</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-500 font-bold">總銷量 / 總訂單</div>
              <div className="text-xl font-black text-slate-900 mt-1">{totalItems} 件 <span className="text-xs text-slate-400 font-normal">({totalOrders}單)</span></div>
            </div>
          </div>

          {/* 👥 雙夥伴 / 攤主當月分帳 */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <Users className="w-4 h-4 text-purple-600" />
                <span>👥 【{selectedMonth}】雙夥伴月度累積分帳</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">當月應分業績與毛利佔比</span>
            </div>

            {Object.keys(currentActiveData?.ownerBreakdown || {}).length > 0 ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(currentActiveData.ownerBreakdown).map(([ownerName, ownerData]) => {
                    const pct = totalRev > 0 ? Math.round((ownerData.totalRevenue / totalRev) * 100) : 0;
                    const isExpanded = expandedPartner === ownerName;
                    const recordsCount = (ownerData.salesRecords || []).length;
                    return (
                      <div
                        key={ownerName}
                        className={`bg-purple-50/60 border-2 rounded-2xl p-4 space-y-2.5 transition ${
                          isExpanded ? 'border-purple-500 shadow-md ring-2 ring-purple-200' : 'border-purple-200/70 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                              {ownerName[0]}
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-900">{ownerName}</span>
                              <div className="text-[10px] text-purple-700 font-bold">主理人當月業績</div>
                            </div>
                          </div>
                          <span className="bg-purple-200/80 text-purple-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                            佔當月 {pct}%
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs text-slate-500 font-bold">當月應分實收：</span>
                            <span className="text-lg font-black text-purple-700">NT$ {ownerData.totalRevenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-baseline text-[11px] border-t border-purple-50 pt-1 text-slate-500">
                            <span className="font-medium">當月實質毛利：</span>
                            <span className="font-black text-emerald-600">NT$ {ownerData.totalProfit.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 font-bold flex justify-between px-1">
                          <span>當月售出件數：</span>
                          <span className="text-slate-900 font-black">{ownerData.totalQty} 件 ({recordsCount} 筆)</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedPartner(isExpanded ? null : ownerName)}
                          className={`w-full py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 border ${
                            isExpanded
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100/50'
                          }`}
                        >
                          <span>{isExpanded ? '收起當月明細 ▲' : `🔍 查看當月銷售明細 (${recordsCount} 筆) ▼`}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* 📋 展開該夥伴之當月銷售詳細清單 */}
                {expandedPartner && currentActiveData?.ownerBreakdown?.[expandedPartner] && (
                  <div className="bg-white rounded-2xl border-2 border-purple-300 p-4 space-y-3 shadow-md animate-in fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-purple-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                        <h4 className="text-xs font-black text-slate-900">
                          【{expandedPartner}】在 {selectedMonth} 的銷售明細 (共 {(currentActiveData.ownerBreakdown[expandedPartner].salesRecords || []).length} 筆)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportPartnerSalesCsv(expandedPartner, currentActiveData.ownerBreakdown[expandedPartner].salesRecords, selectedMonth)}
                        className="text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 px-3 py-1.5 rounded-xl font-black flex items-center gap-1 shadow-sm transition"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-700" />
                        <span>匯出【{expandedPartner}】當月銷售 CSV</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[11px] font-black text-slate-600 border-b border-slate-200">
                            <th className="p-2.5 whitespace-nowrap">日期時間</th>
                            <th className="p-2.5 whitespace-nowrap">場次活動</th>
                            <th className="p-2.5 whitespace-nowrap">商品名稱與規格</th>
                            <th className="p-2.5 text-center whitespace-nowrap">數量</th>
                            <th className="p-2.5 text-right whitespace-nowrap">標價</th>
                            <th className="p-2.5 text-right whitespace-nowrap text-rose-500">折讓</th>
                            <th className="p-2.5 text-right whitespace-nowrap text-purple-700 font-black">實收分帳</th>
                            <th className="p-2.5 whitespace-nowrap">支付方式</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {(currentActiveData.ownerBreakdown[expandedPartner].salesRecords || []).map((rec, idx) => (
                            <tr key={idx} className="hover:bg-purple-50/30 transition">
                              <td className="p-2.5 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                                {rec.timestamp ? formatTaiwanTime(rec.timestamp, 'datetime') : rec.date}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black border border-blue-200">
                                  {rec.eventName || '一般現場'}
                                </span>
                              </td>
                              <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                                {rec.productName} <span className="text-purple-600 font-bold">({rec.variantName})</span>
                              </td>
                              <td className="p-2.5 text-center font-black text-slate-800">
                                {rec.qty}
                              </td>
                              <td className="p-2.5 text-right text-slate-500">
                                NT$ {rec.originalPrice * rec.qty}
                              </td>
                              <td className="p-2.5 text-right text-rose-500 font-bold">
                                {rec.discount > 0 ? `-NT$ ${rec.discount}` : '-'}
                              </td>
                              <td className="p-2.5 text-right font-black text-purple-700 text-sm">
                                NT$ {rec.realSubtotal}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  rec.paymentMethod === '公關贈送' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {rec.paymentMethod}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-5 text-slate-400 text-xs font-bold">
                {selectedMonth} 尚無銷售分帳紀錄
              </div>
            )}
          </div>

          {/* 📅 當月每日營收走勢清單 */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 text-xs font-black text-slate-700 border-b border-slate-200 flex justify-between items-center">
              <span>📅 【{selectedMonth}】每日營收彙總明細表 (共 {(currentActiveData.dailyBreakdown || []).length} 天出攤)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-black text-slate-700 border-b border-slate-200">
                    <th className="p-3 whitespace-nowrap">出攤日期</th>
                    <th className="p-3 whitespace-nowrap">活動場次</th>
                    <th className="p-3 text-center whitespace-nowrap">售出件數</th>
                    <th className="p-3 text-center whitespace-nowrap">單數</th>
                    <th className="p-3 text-right whitespace-nowrap">單日營收</th>
                    <th className="p-3 text-right whitespace-nowrap">單日成本</th>
                    <th className="p-3 text-right whitespace-nowrap text-emerald-600 font-black">單日毛利</th>
                    <th className="p-3 text-right whitespace-nowrap text-purple-700">毛利率</th>
                    <th className="p-3 text-right whitespace-nowrap">現金收款</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(currentActiveData.dailyBreakdown || []).length > 0 ? (
                    (currentActiveData.dailyBreakdown || []).map((d, idx) => {
                      const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            📅 {d.date}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-black">
                              {d.eventName}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800">
                            {d.totalItems} 件
                          </td>
                          <td className="p-3 text-center text-slate-500 font-mono">
                            {d.totalOrders} 筆
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">
                            NT$ {d.revenue.toLocaleString()}
                          </td>
                          <td className="p-3 text-right text-amber-800">
                            NT$ {d.cost.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-600">
                            NT$ {d.profit.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-bold text-purple-700">
                            {margin}%
                          </td>
                          <td className="p-3 text-right text-slate-700 font-mono">
                            NT$ {d.cashRevenue.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-400 font-bold">
                        {selectedMonth} 尚無出攤銷售紀錄
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 🎪 視角三：市集活動場次分析 */}
      {/* ================================================================= */}
      {viewTab === 'event' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-700">🎪 選擇市集活動場次：</span>
              <select
                value={selectedEvent}
                onChange={e => setSelectedEvent(e.target.value)}
                className="bg-slate-50 border-2 border-purple-200 text-purple-900 rounded-xl px-3 py-1.5 text-xs font-black focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">全部活動場次總覽</option>
                {eventsList.map(ev => (
                  <option key={ev} value={ev}>{ev}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportEventSalesCsv}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>匯出【{selectedEvent}】CSV</span>
              </button>

              <button type="button" onClick={() => loadEvent(selectedEvent)} className="text-xs bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-200 text-slate-700 font-bold shadow-sm">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 活動場次 5 大指標 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">該場次總營業額</div>
              <div className="text-xl font-black text-slate-900 mt-1">NT$ {totalRev.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">該場次商品成本</div>
              <div className="text-xl font-black text-amber-700 mt-1">NT$ {totalCost.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">該場次實質總毛利</div>
              <div className="text-xl font-black text-emerald-600 mt-1">NT$ {totalProfit.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] text-slate-500 font-bold">活動毛利率</div>
              <div className="text-xl font-black text-purple-700 mt-1">{profitMargin}%</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-500 font-bold">總售出件數</div>
              <div className="text-xl font-black text-slate-900 mt-1">{totalItems} 件 <span className="text-xs text-slate-400 font-normal">({totalOrders}單)</span></div>
            </div>
          </div>

          {/* 該場次熱銷排行榜 TOP 5 */}
          {(currentActiveData?.itemRanking || []).length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-black text-slate-700">🏆 該場次熱銷商品排行 TOP 5：</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                {(currentActiveData.itemRanking.slice(0, 5)).map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="truncate">
                      <span className="text-[10px] font-black text-rose-500 mr-1.5">#{idx + 1}</span>
                      <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full ml-1 flex-shrink-0">
                      {item.qty}件
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 👥 雙夥伴 / 攤主在該場次之分帳 */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <Users className="w-4 h-4 text-purple-600" />
                <span>👥 【{selectedEvent}】雙夥伴場次分帳結果</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {Object.entries(currentActiveData?.ownerBreakdown || {}).map(([ownerName, ownerData]) => {
                const pct = totalRev > 0 ? Math.round((ownerData.totalRevenue / totalRev) * 100) : 0;
                return (
                  <div key={ownerName} className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{ownerName}</span>
                      <span className="bg-purple-200/80 text-purple-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                        佔此活動 {pct}%
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500 font-bold">場次實收業績：</span>
                        <span className="text-base font-black text-purple-700">NT$ {ownerData.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-[11px] text-slate-500">
                        <span>場次毛利貢獻：</span>
                        <span className="font-black text-emerald-600">NT$ {ownerData.totalProfit.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold flex justify-between px-1">
                      <span>售出件數：</span>
                      <span className="text-slate-900 font-black">{ownerData.totalQty} 件</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 🏁 收攤日結確認 Modal */}
      {/* ================================================================= */}
      {showEodModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">🏁</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">今日收攤日結彙總確認</h3>
                  <p className="text-[11px] text-slate-400 font-bold">結算今日數據並自動備份至 Google 試算表</p>
                </div>
              </div>
              <button onClick={() => setShowEodModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">本次出攤活動場次名稱：</label>
              <input
                type="text"
                value={eodEventInput}
                onChange={e => setEodEventInput(e.target.value)}
                placeholder="例：大港開唱 Day 1 / 小夜埕"
                className="w-full bg-slate-50 border-2 border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-purple-900 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>結算日期：</span>
                <span className="font-mono font-bold text-slate-900">{todayData.date}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>結帳單數 / 售出總件數：</span>
                <span className="font-bold text-slate-900">{todayData.totalOrders} 單 / {todayData.totalItemsSold} 件</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>今日實收營業額：</span>
                <span className="font-black text-slate-900 text-sm">NT$ {todayData.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>商品成本 / 預估總毛利：</span>
                <span className="font-black text-emerald-600">NT$ {todayData.totalCost} / NT$ {todayData.totalProfit} ({todayData.profitMargin}%)</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 border-t border-slate-200 pt-2">
                <span>現金實收 (需清點金額)：</span>
                <span className="font-black text-rose-600 text-sm">NT$ {todayData.paymentBreakdown?.['現金'] || 0}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEodModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDoEodCloseout}
                disabled={isClosingEod}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
              >
                {isClosingEod ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>✓ 確認完成收攤日結</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
