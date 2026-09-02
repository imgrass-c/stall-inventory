import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';
import { realtime } from '../../services/realtime';
import { formatTaiwanTime, exportToCsv } from '../../utils/formatters';
import TodayTab from './TodayTab';
import MonthTab from './MonthTab';
import EventTab from './EventTab';
import EodModal from './EodModal';

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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEvent, setSelectedEvent] = useState('');
  const [allEvents, setAllEvents] = useState([]);
  
  const [todaySales, setTodaySales] = useState([]);
  const [currentMonthData, setCurrentMonthData] = useState({});
  const [currentEventData, setCurrentEventData] = useState({});
  const [loading, setLoading] = useState(false);
  const [isEodModalOpen, setIsEodModalOpen] = useState(false);

  // 統一統計計算函式 (含折讓加權分攤、毛利正負值計算、多活動標籤聚合)
  const calculateStats = (salesList = []) => {
    const valid = salesList.filter(s => s.status !== '已作廢');
    let rev = 0;
    let cost = 0;
    let items = 0;
    const pm = {};
    const owners = {};
    const dailyMap = {};
    const allSalesRecords = [];

    valid.forEach(s => {
      const isPR = s.payment_method === '公關贈送';
      const orderOrig = Number(s.total_amount || 0);
      const orderFinal = isPR ? 0 : (s.final_amount !== undefined ? Number(s.final_amount) : (s.finalAmount !== undefined ? Number(s.finalAmount) : orderOrig));
      const discountRatio = isPR ? 0 : (orderOrig > 0 ? (orderFinal / orderOrig) : 1);
      const sDate = s.date || (s.timestamp ? s.timestamp.split('T')[0] : formatTaiwanTime(new Date(), 'date'));
      const sEvent = s.eventName || s.channelName || '一般現場';
      const sChannelType = s.channelType === 'online' || s.channelName?.includes('賣貨便') || s.channelName?.includes('網路') ? '網路銷售' : '市集現場';
      const pMethod = s.payment_method || '現金';
      const operatorName = s.operator || '現場收銀員';

      rev += orderFinal;
      pm[pMethod] = (pm[pMethod] || 0) + orderFinal;

      if (!dailyMap[sDate]) {
        dailyMap[sDate] = {
          date: sDate,
          eventNames: new Set(),
          totalOrders: 0,
          totalItems: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          cashRevenue: 0
        };
      }
      dailyMap[sDate].eventNames.add(sEvent);
      dailyMap[sDate].totalOrders += 1;
      dailyMap[sDate].revenue += orderFinal;
      if (pMethod === '現金') dailyMap[sDate].cashRevenue += orderFinal;

      (s.items || []).forEach(item => {
        const itemQty = Number(item.qty || 1);
        const itemPrice = Number(item.price || 0);
        const itemCost = Number(item.cost || 0);
        const itemOwner = item.owner || '攤位公家';
        const itemCategory = item.category || '衣服';

        const itemSubtotal = itemPrice * itemQty;
        const itemRealSubtotal = isPR ? 0 : Math.round(itemSubtotal * discountRatio);
        const itemDiscount = itemSubtotal - itemRealSubtotal;
        const itemTotalCost = itemCost * itemQty;
        const itemRealProfit = itemRealSubtotal - itemTotalCost;
        const itemMargin = itemRealSubtotal > 0 ? `${((itemRealProfit / itemRealSubtotal) * 100).toFixed(1)}%` : (isPR ? '-100%' : '0%');

        cost += itemTotalCost;
        items += itemQty;
        dailyMap[sDate].totalItems += itemQty;
        dailyMap[sDate].cost += itemTotalCost;
        dailyMap[sDate].profit += itemRealProfit;

        if (!owners[itemOwner]) {
          owners[itemOwner] = {
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            totalQty: 0,
            salesRecords: []
          };
        }
        owners[itemOwner].totalRevenue += itemRealSubtotal;
        owners[itemOwner].totalCost += itemTotalCost;
        owners[itemOwner].totalProfit += itemRealProfit;
        owners[itemOwner].totalQty += itemQty;

        const itemRecord = {
          timestamp: s.timestamp,
          date: sDate,
          orderId: s.order_id,
          eventName: sEvent,
          channelType: sChannelType,
          productName: item.productName,
          category: itemCategory,
          variantName: item.variantName,
          owner: itemOwner,
          qty: itemQty,
          price: itemPrice,
          originalPrice: itemPrice,
          cost: itemCost,
          unitDiscount: itemQty > 0 ? Math.round(itemDiscount / itemQty) : 0,
          discount: itemDiscount,
          realSubtotal: itemRealSubtotal,
          costTotal: itemTotalCost,
          realProfit: itemRealProfit,
          profitMargin: itemMargin,
          paymentMethod: pMethod,
          operator: operatorName,
          status: s.status || '已完成'
        };
        owners[itemOwner].salesRecords.push(itemRecord);
        allSalesRecords.push(itemRecord);
      });
    });

    const profit = rev - cost;
    const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : 0;
    const dailyBreakdown = Object.values(dailyMap).map(d => ({
      ...d,
      events: Array.from(d.eventNames || []),
      eventName: Array.from(d.eventNames || []).join(", ") || "一般現場"
    })).sort((a, b) => b.date.localeCompare(a.date));

    return {
      date: salesList[0]?.date || formatTaiwanTime(new Date(), 'date'),
      totalRevenue: rev,
      totalCost: cost,
      totalProfit: profit,
      profitMargin: margin,
      totalOrders: valid.length,
      totalItemsSold: items,
      paymentBreakdown: pm,
      ownerBreakdown: owners,
      dailyBreakdown: dailyBreakdown,
      salesRecords: allSalesRecords
    };
  };

  const loadToday = async () => {
    setLoading(true);
    try {
      const sales = await onFetchTodaySales();
      setTodaySales(sales || []);
    } finally {
      setLoading(false);
    }
  };

  const loadMonth = async (m) => {
    setLoading(true);
    try {
      const sales = await onFetchMonthSales(m);
      setCurrentMonthData(calculateStats(sales || []));
    } finally {
      setLoading(false);
    }
  };

  const loadEvent = async (ev) => {
    if (!ev) return;
    setLoading(true);
    try {
      const sales = await onFetchEventSales(ev);
      setCurrentEventData(calculateStats(sales || []));
    } finally {
      setLoading(false);
    }
  };

  const loadAllEventsList = async () => {
    try {
      const masterList = await realtime.getEvents();
      const allNames = await onFetchAllEvents();
      
      const combined = [...masterList];
      allNames.forEach(name => {
        if (!combined.some(e => (typeof e === 'object' ? e.name === name : e === name))) {
          combined.push({ event_id: name, name, booth_cost: 0, expenses: [], status: '已結算' });
        }
      });

      setAllEvents(combined);
      if (combined.length > 0 && !selectedEvent) {
        setSelectedEvent(typeof combined[0] === 'object' ? combined[0].name : combined[0]);
      }
    } catch(e) {}
  };

  useEffect(() => {
    if (viewTab === 'today') loadToday();
    else if (viewTab === 'month') loadMonth(selectedMonth);
    else if (viewTab === 'event') {
      loadAllEventsList();
      if (selectedEvent) loadEvent(selectedEvent);
    }
  }, [viewTab]);

  useEffect(() => {
    if (viewTab === 'event' && selectedEvent) {
      loadEvent(selectedEvent);
    }
  }, [selectedEvent]);

  const changeMonth = (offset) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
    loadMonth(newMonth);
  };

  const todayData = calculateStats(todaySales);

  // 🌟 匯出今日銷售明細 CSV (完整包含通路類型、商品分類、折讓、成本、毛利與毛利率)
  const handleExportTodayCsv = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = [
      '訂單編號',
      '日期時間',
      '活動場次/通路',
      '通路類型',
      '商品名稱',
      '商品分類',
      '規格尺寸',
      '貨品歸屬主理人',
      '數量',
      '標價單價',
      '標價總額',
      '折讓金額',
      '實收分帳金額',
      '進貨成本小計',
      '實質毛利',
      '實質毛利率',
      '收款方式',
      '收款人/收銀員',
      '訂單狀態'
    ];
    const rows = [];
    todaySales.forEach(s => {
      const isPR = s.payment_method === '公關贈送';
      const origTotal = Number(s.total_amount || 0);
      const finalTotal = isPR ? 0 : (s.final_amount !== undefined ? Number(s.final_amount) : Number(s.total_amount || 0));
      const discountRatio = isPR ? 0 : (origTotal > 0 ? (finalTotal / origTotal) : 1);
      const channelTypeStr = s.channelType === 'online' || s.channelName?.includes('賣貨便') ? '網路銷售' : '市集現場';

      (s.items || []).forEach(item => {
        const itemQty = Number(item.qty || 1);
        const itemPrice = Number(item.price || 0);
        const itemCost = Number(item.cost || 0);
        const itemOrigTotal = itemPrice * itemQty;
        const itemRealSubtotal = isPR ? 0 : Math.round(itemOrigTotal * discountRatio);
        const itemDiscount = itemOrigTotal - itemRealSubtotal;
        const itemTotalCost = itemCost * itemQty;
        const itemProfit = itemRealSubtotal - itemTotalCost;
        const itemMargin = itemRealSubtotal > 0 ? `${((itemProfit / itemRealSubtotal) * 100).toFixed(1)}%` : (isPR ? '-100%' : '0%');

        rows.push([
          s.order_id,
          s.timestamp ? formatTaiwanTime(s.timestamp, 'datetime') : s.date,
          s.eventName || s.channelName || '一般現場',
          channelTypeStr,
          item.productName,
          item.category || '衣服',
          item.variantName,
          item.owner || '攤位公家',
          itemQty,
          itemPrice,
          itemOrigTotal,
          itemDiscount > 0 ? itemDiscount : 0,
          itemRealSubtotal,
          itemTotalCost,
          itemProfit,
          itemMargin,
          s.payment_method,
          s.operator || '現場收銀員',
          s.status || '已完成'
        ]);
      });
    });
    exportToCsv(`感情失敗之友會_今日銷售明細_${dateStr}.csv`, headers, rows);
  };

  // 🌟 匯出當月全月交易明細 CSV (完整包含通路類型、商品分類、折讓、成本、毛利與毛利率)
  const handleExportMonthSalesCsv = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = [
      '訂單編號',
      '日期時間',
      '活動場次/通路',
      '通路類型',
      '商品名稱',
      '商品分類',
      '規格尺寸',
      '貨品歸屬主理人',
      '數量',
      '標價單價',
      '標價總額',
      '折讓金額',
      '實收分帳金額',
      '進貨成本小計',
      '實質毛利',
      '實質毛利率',
      '收款方式',
      '收款人/收銀員',
      '訂單狀態'
    ];
    const rows = (currentMonthData.salesRecords || []).map(r => {
      const origPrice = Number(r.originalPrice || r.price || 0);
      const qty = Number(r.qty || 1);
      const origTotal = origPrice * qty;
      const costTotal = (Number(r.cost) || 0) * qty;
      const realSubtotal = Number(r.realSubtotal !== undefined ? r.realSubtotal : (origTotal - (r.discount || 0)));
      const realProfit = Number(r.realProfit !== undefined ? r.realProfit : (realSubtotal - costTotal));
      const margin = realSubtotal > 0 ? `${((realProfit / realSubtotal) * 100).toFixed(1)}%` : (realProfit < 0 ? '-100%' : '0%');

      return [
        r.orderId,
        r.timestamp ? formatTaiwanTime(r.timestamp, 'datetime') : r.date,
        r.eventName || r.channelName || '一般現場',
        r.channelType || '市集現場',
        r.productName,
        r.category || '衣服',
        r.variantName,
        r.owner || '攤位公家',
        qty,
        origPrice,
        origTotal,
        r.discount || 0,
        realSubtotal,
        costTotal,
        realProfit,
        margin,
        r.paymentMethod,
        r.operator || '現場收銀員',
        r.status || '已完成'
      ];
    });
    exportToCsv(`感情失敗之友會_${selectedMonth}_全月交易明細_${dateStr}.csv`, headers, rows);
  };

  // 🌟 匯出市集場次銷售明細 CSV (完整包含商品分類、折讓、成本、毛利與毛利率)
  const handleExportEventSalesCsv = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = [
      '訂單編號',
      '日期時間',
      '場次名稱',
      '通路類型',
      '商品名稱',
      '商品分類',
      '規格尺寸',
      '貨品歸屬主理人',
      '數量',
      '標價單價',
      '標價總額',
      '折讓金額',
      '實收分帳金額',
      '進貨成本小計',
      '實質毛利',
      '實質毛利率',
      '收款方式',
      '收款人/收銀員'
    ];
    const rows = (currentEventData.salesRecords || []).map(r => {
      const origPrice = Number(r.originalPrice || r.price || 0);
      const qty = Number(r.qty || 1);
      const origTotal = origPrice * qty;
      const costTotal = (Number(r.cost) || 0) * qty;
      const realSubtotal = Number(r.realSubtotal !== undefined ? r.realSubtotal : (origTotal - (r.discount || 0)));
      const realProfit = Number(r.realProfit !== undefined ? r.realProfit : (realSubtotal - costTotal));
      const margin = realSubtotal > 0 ? `${((realProfit / realSubtotal) * 100).toFixed(1)}%` : (realProfit < 0 ? '-100%' : '0%');

      return [
        r.orderId,
        r.timestamp ? formatTaiwanTime(r.timestamp, 'datetime') : r.date,
        selectedEvent,
        r.channelType || '市集現場',
        r.productName,
        r.category || '衣服',
        r.variantName,
        r.owner || '攤位公家',
        qty,
        origPrice,
        origTotal,
        r.discount || 0,
        realSubtotal,
        costTotal,
        realProfit,
        margin,
        r.paymentMethod,
        r.operator || '現場收銀員'
      ];
    });
    exportToCsv(`感情失敗之友會_市集場次_${selectedEvent}_銷售明細_${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="flex-1 bg-surface-50 p-3.5 sm:p-6 overflow-y-auto space-y-4 max-w-6xl mx-auto w-full">
      {/* 頂部分頁切換視角 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">營收中心</h2>
          <p className="text-xs text-slate-400 font-bold">今日即時營收、夥伴利潤分帳與市集場次毛利統計</p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm text-xs font-black w-full sm:w-auto">
          <button
            onClick={() => setViewTab('today')}
            className={`flex-1 sm:flex-none min-h-[40px] px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              viewTab === 'today' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.TrendingUp className="w-3.5 h-3.5" />
            <span>今日營收</span>
          </button>
          <button
            onClick={() => setViewTab('month')}
            className={`flex-1 sm:flex-none min-h-[40px] px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              viewTab === 'month' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Calendar className="w-3.5 h-3.5" />
            <span>當月統計</span>
          </button>
          <button
            onClick={() => setViewTab('event')}
            className={`flex-1 sm:flex-none min-h-[40px] px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              viewTab === 'event' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Flag className="w-3.5 h-3.5" />
            <span>市集場次分析</span>
          </button>
        </div>
      </div>

      {/* 主要視圖內容切換 */}
      {viewTab === 'today' && (
        <TodayTab
          todayData={todayData}
          todaySales={todaySales}
          loading={loading}
          onRefresh={loadToday}
          onOpenEodModal={() => setIsEodModalOpen(true)}
          onExportCsv={handleExportTodayCsv}
          onVoidSale={async (orderId, operator) => {
            await onVoidSale(orderId, operator);
            loadToday();
          }}
          user={user}
        />
      )}

      {viewTab === 'month' && (
        <MonthTab
          selectedMonth={selectedMonth}
          onChangeMonth={changeMonth}
          currentMonthData={currentMonthData}
          loading={loading}
          onRefresh={() => loadMonth(selectedMonth)}
          onExportMonthCsv={handleExportMonthSalesCsv}
        />
      )}

      {viewTab === 'event' && (
        <EventTab
          allEvents={allEvents}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
          currentEventData={currentEventData}
          loading={loading}
          onRefresh={() => loadEvent(selectedEvent)}
          onExportEventCsv={handleExportEventSalesCsv}
        />
      )}

      {/* 收攤日結結算彈窗 */}
      {isEodModalOpen && (
        <EodModal
          isOpen={isEodModalOpen}
          onClose={() => setIsEodModalOpen(false)}
          todaySales={todaySales}
          user={user}
          allEvents={allEvents}
          onSaveReport={async (reportData) => {
            const res = await onSaveDailyReport(reportData);
            if (res && res.success) {
              alert("日結戰報已成功上傳至 Google 試算表！");
              setIsEodModalOpen(false);
              loadToday();
            }
          }}
        />
      )}
    </div>
  );
}
