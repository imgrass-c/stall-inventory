import React from 'react';
import { Icons } from '../common/Icons';
import { formatTaiwanTime } from '../../utils/formatters';

export default function TodayTab({
  todayData,
  todaySales,
  loading,
  onRefresh,
  onOpenEodModal,
  onExportCsv,
  onVoidSale,
  user
}) {
  const totalRev = todayData.totalRevenue || 0;
  const totalCost = todayData.totalCost || 0;
  const totalProfit = todayData.totalProfit || 0;
  const profitMargin = todayData.profitMargin || 0;
  const totalItems = todayData.totalItemsSold || 0;
  const totalOrders = todayData.totalOrders || 0;

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* 頂部操作列與日結按鈕 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-black text-xs flex items-center gap-1.5">
            <Icons.Calendar className="w-4 h-4 text-rose-600" />
            <span>今日日期：{todayData.date}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onExportCsv}
            className="flex-1 sm:flex-none text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Icons.DownloadFile className="w-3.5 h-3.5 text-slate-500" />
            <span>匯出今日 CSV</span>
          </button>

          <button
            onClick={onOpenEodModal}
            className="flex-1 sm:flex-none text-xs bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl font-black flex items-center justify-center gap-1.5 shadow-md transition"
          >
            <Icons.Flag className="w-3.5 h-3.5" />
            <span>收攤日結結算</span>
          </button>

          <button
            onClick={onRefresh}
            className="text-xs bg-surface-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-200 text-slate-700 font-bold shadow-sm"
          >
            <Icons.Refresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 5 大財務 KPI 卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] text-slate-500 font-bold">今日實收營收</div>
          <div className="text-xl font-black text-slate-900 mt-1">NT$ {totalRev.toLocaleString()}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] text-slate-500 font-bold">今日商品底價成本</div>
          <div className="text-xl font-black text-amber-700 mt-1">NT$ {totalCost.toLocaleString()}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] text-slate-500 font-bold">今日實質總毛利</div>
          <div className="text-xl font-black text-emerald-600 mt-1">NT$ {totalProfit.toLocaleString()}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] text-slate-500 font-bold">預估毛利率</div>
          <div className="text-xl font-black text-purple-700 mt-1">{profitMargin}%</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-500 font-bold">總售出 / 總單數</div>
          <div className="text-xl font-black text-slate-900 mt-1">{totalItems} 件 <span className="text-xs text-slate-400 font-normal">({totalOrders}單)</span></div>
        </div>
      </div>

      {/* 收款方式佔比分佈 */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card space-y-2">
        <div className="text-xs font-black text-slate-700">收款方式分佈 (實收現金需與錢包核對)</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(todayData.paymentBreakdown || {}).map(([pm, amt]) => (
            <div key={pm} className="bg-surface-50 p-2.5 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-400 font-bold">{pm}</div>
              <div className="text-sm font-black text-slate-900 mt-0.5 font-mono">NT$ {amt.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 今日交易明細清單 */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="p-4 bg-surface-50 text-xs font-black text-slate-700 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Icons.Clock className="w-4 h-4 text-slate-500" />
            <span>今日銷售交易明細 ({todaySales.length} 筆)</span>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {todaySales.length > 0 ? (
            todaySales.map(s => {
              const isVoid = s.status === '已作廢';
              const amt = s.final_amount !== undefined ? s.final_amount : (s.finalAmount !== undefined ? s.finalAmount : s.total_amount);
              return (
                <div key={s.order_id} className={`p-4 flex items-center justify-between text-xs transition ${isVoid ? 'bg-slate-50 opacity-50' : 'hover:bg-slate-50'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400 text-[11px]">
                        {s.timestamp ? formatTaiwanTime(s.timestamp, 'time') : '剛才'}
                      </span>
                      <span className="font-mono font-black text-slate-900">{s.order_id}</span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{s.payment_method}</span>
                      {isVoid && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black">已作廢</span>}
                    </div>
                    <div className="text-slate-500 text-[11px] mt-1 font-bold">
                      {(s.items || []).map(i => `${i.productName} (${i.variantName}) x${i.qty}`).join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-900 text-base font-mono">NT$ {amt}</span>
                    {!isVoid && (
                      <button
                        onClick={() => {
                          if (confirm(`確定要作廢訂單「${s.order_id}」嗎？相關庫存將會自動加回！`)) {
                            onVoidSale(s.order_id, user?.name || '管理員');
                          }
                        }}
                        className="px-3 py-1.5 bg-surface-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-black transition"
                      >
                        作廢
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs font-bold">今日尚無銷售交易</div>
          )}
        </div>
      </div>
    </div>
  );
}
