import React from 'react';
import { Icons } from '../common/Icons';
import { formatTaiwanTime } from '../../utils/formatters';

export default function EventTab({
  allEvents,
  selectedEvent,
  onSelectEvent,
  currentEventData,
  loading,
  onRefresh,
  onExportEventCsv
}) {
  const totalRev = currentEventData.totalRevenue || 0;
  const totalCost = currentEventData.totalCost || 0;
  const totalProfit = currentEventData.totalProfit || 0;
  const profitMargin = currentEventData.profitMargin || 0;
  const totalItems = currentEventData.totalItemsSold || 0;
  const totalOrders = currentEventData.totalOrders || 0;

  // 活動成本與真實淨利 (攤位費 + 現場追加支出)
  const eventObj = (allEvents || []).find(e => (typeof e === 'object' ? e.name === selectedEvent : e === selectedEvent));
  const boothCost = (typeof eventObj === 'object' && eventObj?.booth_cost) ? Number(eventObj.booth_cost) : 0;
  const extraExpenses = (typeof eventObj === 'object' && eventObj?.expenses) ? (eventObj.expenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) : 0;
  const totalEventExpenses = boothCost + extraExpenses;
  const trueNetProfit = totalProfit - totalEventExpenses;

  return (
    <div className="space-y-4 animate-in fade-in pb-28 md:pb-6">
      
      {/* 場次選擇器與操作列 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 font-black text-slate-800 text-xs sm:text-sm flex-shrink-0">
            <Icons.Flag className="w-4 h-4 text-purple-600" />
            <span>選擇市集場次：</span>
          </div>
          <select
            value={selectedEvent}
            onChange={e => onSelectEvent(e.target.value)}
            className="flex-1 sm:flex-none min-h-[42px] bg-surface-50 border-2 border-purple-200 rounded-2xl px-3 py-1.5 text-xs sm:text-sm font-black text-purple-900 focus:outline-none focus:border-purple-400"
          >
            {allEvents.length === 0 ? (
              <option value="一般現場">一般現場 (未建檔活動)</option>
            ) : (
              allEvents.map(ev => {
                const name = typeof ev === 'object' ? ev.name : ev;
                return <option key={name} value={name}> {name}</option>;
              })
            )}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onExportEventCsv}
            disabled={!selectedEvent}
            className="flex-1 sm:flex-none min-h-[44px] text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2 rounded-2xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Icons.DownloadFile className="w-4 h-4" />
            <span>匯出【{selectedEvent}】場次 CSV</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="min-h-[44px] text-xs bg-surface-50 hover:bg-slate-100 p-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold shadow-sm"
          >
            <Icons.Refresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 場次 5 大財務 KPI 卡片 (含扣除攤位費與租雨傘等之真實淨利) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
          <div className="text-xs text-slate-500 font-bold">場次總實收營業額</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">NT$ {totalRev.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
          <div className="text-xs text-slate-500 font-bold">衣服總底價成本</div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1 font-mono">NT$ {totalCost.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
          <div className="text-xs text-slate-500 font-bold">攤位費 + 現場追加支出</div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1 font-mono">NT$ {totalEventExpenses.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">(租金 ${boothCost} + 雜支 ${extraExpenses})</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border-2 border-emerald-300 bg-emerald-50/40 shadow-card">
          <div className="text-xs text-emerald-800 font-black">場次真實純淨利</div>
          <div className={`text-xl sm:text-2xl font-black font-mono mt-1 ${trueNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            NT$ {trueNetProfit.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700 font-bold mt-0.5">已扣除所有商品成本與攤位支出</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-500 font-bold">總售出 / 總訂單</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">{totalItems} 件 <span className="text-xs text-slate-400 font-normal">({totalOrders}單)</span></div>
        </div>
      </div>

      {/* 場次雙夥伴分帳 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card space-y-3">
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 font-black text-slate-900 text-sm sm:text-base">
            <Icons.Users className="w-5 h-5 text-purple-600" />
            <span>【{selectedEvent}】場次夥伴利潤分帳</span>
          </div>
          <span className="text-xs font-bold text-slate-400">各夥伴此場次業績貢獻</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {Object.entries(currentEventData?.ownerBreakdown || {}).map(([ownerName, ownerData]) => {
            const pct = totalRev > 0 ? Math.round((ownerData.totalRevenue / totalRev) * 100) : 0;
            return (
              <div key={ownerName} className="bg-purple-50/70 border-2 border-purple-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                      {ownerName[0]}
                    </div>
                    <span className="text-xs sm:text-sm font-black text-slate-900">{ownerName}</span>
                  </div>
                  <span className="bg-purple-200 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                    佔此場次 {pct}%
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-1 shadow-sm">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500 font-bold">場次實收業績：</span>
                    <span className="text-base sm:text-lg font-black text-purple-700 font-mono">
                      NT$ {ownerData.totalRevenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs text-slate-500 border-t border-purple-50 pt-1">
                    <span>商品毛利貢獻：</span>
                    <span className="font-black text-emerald-600 font-mono">NT$ {ownerData.totalProfit.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-bold flex justify-between px-1">
                  <span>售出件數：</span>
                  <span className="text-slate-900 font-black font-mono">{ownerData.totalQty} 件</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 場次明細表格 */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-card">
        <div className="p-4 bg-surface-50 text-xs font-black text-slate-700 border-b border-slate-200">
          場次銷售交易清單 (共 {(currentEventData.salesRecords || []).length} 筆)
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-black text-slate-600 border-b border-slate-200">
                <th className="p-3 whitespace-nowrap">日期時間</th>
                <th className="p-3 whitespace-nowrap">商品名稱與規格</th>
                <th className="p-3 whitespace-nowrap">主理人</th>
                <th className="p-3 text-center whitespace-nowrap">數量</th>
                <th className="p-3 text-right whitespace-nowrap">標價</th>
                <th className="p-3 text-right whitespace-nowrap text-rose-500">折讓</th>
                <th className="p-3 text-right whitespace-nowrap text-purple-700 font-black">實收</th>
                <th className="p-3 whitespace-nowrap">收款方式</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(currentEventData.salesRecords || []).map((rec, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-slate-700 font-mono text-xs whitespace-nowrap">
                    <Icons.Clock className="w-3.5 h-3.5 text-slate-400 inline mr-1" />
                    <span>{rec.timestamp ? formatTaiwanTime(rec.timestamp, 'datetime') : rec.date}</span>
                  </td>
                  <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                    {rec.productName} <span className="text-purple-600 font-bold">({rec.variantName})</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black border border-purple-200">
                      {rec.owner || '攤位公家'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-black text-slate-800 font-mono text-xs">
                    {rec.qty}
                  </td>
                  <td className="p-3 text-right text-slate-500 font-mono">
                    NT$ {rec.originalPrice * rec.qty}
                  </td>
                  <td className="p-3 text-right text-rose-500 font-bold font-mono">
                    {rec.discount > 0 ? `-NT$ ${rec.discount}` : '-'}
                  </td>
                  <td className="p-3 text-right font-black text-purple-700 text-sm font-mono">
                    NT$ {rec.realSubtotal}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700">
                      {rec.paymentMethod}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
