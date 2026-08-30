import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';
import TodayTab from './TodayTab';
import MonthTab from './MonthTab';
import EventTab from './EventTab';
import EodModal from './EodModal';
import { exportToCsv, formatTaiwanTime } from '../../utils/formatters';
import { realtime } from '../../services/realtime';

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
  const [viewTab, setViewTab] = useState('today');
  const [todaySales, setTodaySales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [currentMonthData, setCurrentMonthData] = useState({});
  const [allEvents, setAllEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [currentEventData, setCurrentEventData] = useState({});
  const [showEodModal, setShowEodModal] = useState(false);

  const calculateStats = (salesList = []) => {
    const valid = salesList.filter(s => s.status !== '已作廢');
    let rev = 0, cost = 0, items = 0;
    let pm = { "現金": 0, "LinePay": 0, "街口": 0, "轉帳": 0, "公關贈送": 0 };
    let owners = {};
    let dailyMap = {};

    valid.forEach(s => {
      const pMethod = s.payment_method || '現金';
      const isPR = pMethod === '公關贈送';
      const orderOrig = Number(s.total_amount || 0);
      const orderFinal = isPR ? 0 : Number(s.final_amount !== undefined ? s.final_amount : (s.finalAmount !== undefined ? s.finalAmount : (orderOrig - Number(s.discount_amount || 0))));

      rev += orderFinal;
      pm[pMethod] = (pm[pMethod] || 0) + orderFinal;

      const discountRatio = orderOrig > 0 ? (orderFinal / orderOrig) : (isPR ? 0 : 1);
      const sDate = s.timestamp ? formatTaiwanTime(s.timestamp, 'date') : (s.date || '未知日期');
      const sEvent = s.eventName || s.channelName || '一般現場';

      if (!dailyMap[sDate]) {
        dailyMap[sDate] = {
          date: sDate,
          eventName: sEvent,
          totalOrders: 0,
          totalItems: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          cashRevenue: 0
        };
      }
      dailyMap[sDate].totalOrders += 1;
      dailyMap[sDate].revenue += orderFinal;
      if (pMethod === '現金') dailyMap[sDate].cashRevenue += orderFinal;

      (s.items || []).forEach(item => {
        const itemQty = Number(item.qty || 1);
        const itemPrice = Number(item.price || 0);
        const itemCost = Number(item.cost || 0);
        const itemOwner = item.owner || '攤位公家';

        const itemSubtotal = itemPrice * itemQty;
        const itemRealSubtotal = isPR ? 0 : Math.round(itemSubtotal * discountRatio);
        const itemTotalCost = itemCost * itemQty;
        const itemRealProfit = itemRealSubtotal - itemTotalCost;

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
        owners[itemOwner].salesRecords.push({
          timestamp: s.timestamp,
          date: sDate,
          orderId: s.order_id,
          eventName: sEvent,
          productName: item.productName,
          variantName: item.variantName,
          qty: itemQty,
          originalPrice: itemPrice,
          discount: itemSubtotal - itemRealSubtotal,
          realSubtotal: itemRealSubtotal,
          paymentMethod: pMethod
        });
      });
    });

    const profit = rev - cost;
    const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : 0;
    const dailyBreakdown = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

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
      dailyBreakdown,
      salesRecords: valid.flatMap(s => (s.items || []).map(i => ({
        ...i,
        timestamp: s.timestamp,
        date: s.date,
        orderId: s.order_id,
        eventName: s.eventName || s.channelName,
        paymentMethod: s.payment_method
      })))
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

  const handleExportTodayCsv = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = ['訂單編號', '日期時間', '活動場次/通路', '商品名稱', '商品規格', '數量', '單價', '實收金額', '付款方式', '操作員', '狀態'];
    const rows = [];
    todaySales.forEach(s => {
      (s.items || []).forEach(item => {
        rows.push([
          s.order_id,
          s.timestamp ? formatTaiwanTime(s.timestamp, 'datetime') : s.date,
          s.eventName || s.channelName || '一般現場',
          item.productName,
          item.variantName,
          item.qty,
          item.price,
          s.final_amount,
          s.payment_method,
          s.operator || '現場小幫手',
          s.status || '已完成'
        ]);
      });
    });
    exportToCsv(`感情失敗之友會_今日銷售明細_${dateStr}.csv`, headers, rows);
  };

  const handleExportMonthSalesCsv = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = ['訂單編號', '日期時間', '活動場次/通路', '商品名稱', '規格', '主理人', '數量', '售價', '收款方式', '狀態'];
    const rows = (currentMonthData.salesRecords || []).map(r => [
      r.orderId,
      r.timestamp ? formatTaiwanTime(r.timestamp, 'datetime') : r.date,
      r.eventName || r.channelName || '一般現場',
      r.productName,
      r.variantName,
      r.owner || '攤位公家',
      r.qty,
      r.price,
      r.paymentMethod,
      '已完成'
    ]);
    exportToCsv(`感情失敗之友會_${selectedMonth}_全月交易明細_${dateStr}.csv`, headers, rows);
  };

  const handleExportEventSalesCsv = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = ['訂單編號', '日期時間', '場次名稱', '商品名稱', '規格', '主理人', '數量', '售價', '收款方式'];
    const rows = (currentEventData.salesRecords || []).map(r => [
      r.orderId,
      r.timestamp ? formatTaiwanTime(r.timestamp, 'datetime') : r.date,
      selectedEvent,
      r.productName,
      r.variantName,
      r.owner || '攤位公家',
      r.qty,
      r.price,
      r.paymentMethod
    ]);
    exportToCsv(`感情失敗之友會_市集場次_${selectedEvent}_銷售明細_${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="flex-1 bg-surface-50 p-3.5 sm:p-6 overflow-y-auto space-y-4 max-w-6xl mx-auto w-full">
      {/* 頂部分頁切換視角 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">營收與分帳分析中心</h2>
          <p className="text-xs text-slate-400 font-bold">今日即時戰報、雙夥伴利潤分帳與市集場次毛利統計</p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm text-xs font-black w-full sm:w-auto">
          <button
            onClick={() => setViewTab('today')}
            className={`flex-1 sm:flex-none min-h-[40px] px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              viewTab === 'today' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.TrendingUp className="w-3.5 h-3.5" />
            <span>今日戰報</span>
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

      {/* 視角一：今日戰報 */}
      {viewTab === 'today' && (
        <TodayTab
          todayData={todayData}
          todaySales={todaySales}
          loading={loading}
          onRefresh={loadToday}
          onOpenEodModal={() => setShowEodModal(true)}
          onExportCsv={handleExportTodayCsv}
          onVoidSale={onVoidSale}
          user={user}
        />
      )}

      {/* 視角二：當月統計 */}
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

      {/* 視角三：市集場次分析 */}
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

      {/* 收攤日結確認 Modal */}
      {showEodModal && (
        <EodModal
          todayData={todayData}
          onClose={() => setShowEodModal(false)}
          onConfirmCloseout={async (reportData) => {
            await onSaveDailyReport(reportData);
            await onSyncSheets();
          }}
        />
      )}
    </div>
  );
}
