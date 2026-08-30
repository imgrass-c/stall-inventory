import React, { useState } from 'react';
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
  const [expandedOwner, setExpandedOwner] = useState(null);

  const totalRev = todayData.totalRevenue || 0;
  const totalCost = todayData.totalCost || 0;
  const totalProfit = todayData.totalProfit || 0;
  const profitMargin = todayData.profitMargin || 0;
  const totalItems = todayData.totalItemsSold || 0;
  const totalOrders = todayData.totalOrders || 0;

  // 取得特定主理人的今日銷貨單品清單
  const getOwnerItemDetails = (ownerName) => {
    const list = [];
    (todaySales || []).filter(s => s.status !== '已作廢').forEach(s => {
      (s.items || []).forEach(it => {
        const itemOwner = it.owner || '攤位公家';
        if (itemOwner === ownerName) {
          const qty = Number(it.qty) || 1;
          const price = Number(it.price) || 0;
          const cost = Number(it.cost) || 0;
          const revenue = price * qty;
          const profit = (price - cost) * qty;

          list.push({
            orderId: s.order_id,
            time: s.timestamp ? formatTaiwanTime(s.timestamp, 'time') : '剛才',
            channel: s.channelName || s.eventName || '現場',
            paymentMethod: s.payment_method || '現金',
            productName: it.productName || '服飾',
            variantName: it.variantName || '標準',
            qty: qty,
            price: price,
            cost: cost,
            revenue: revenue,
            profit: profit
          });
        }
      });
    });
    return list;
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-28 md:pb-6">
      
      {/* 頂部操作列與日結按鈕 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-black text-xs sm:text-sm flex items-center gap-2">
            <Icons.Calendar className="w-4 h-4 text-rose-600" />
            <span>今日日期：{todayData.date}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onExportCsv}
            className="flex-1 sm:flex-none min-h-[44px] text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-2xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Icons.DownloadFile className="w-4 h-4 text-slate-500" />
            <span>匯出今日 CSV</span>
          </button>

          <button
            onClick={onOpenEodModal}
            className="flex-1 sm:flex-none min-h-[44px] text-xs sm:text-sm bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-md transition active:scale-98"
          >
            <Icons.Flag className="w-4 h-4" />
            <span>收攤日結結算</span>
          </button>

          <button
            onClick={onRefresh}
            className="min-h-[44px] text-xs bg-surface-50 hover:bg-slate-100 p-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold shadow-sm"
          >
            <Icons.Refresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 🌟 今日雙夥伴即時分帳卡片 (支援展開檢視該員今日詳細銷貨明細) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card space-y-3">
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 font-black text-slate-900 text-sm sm:text-base">
            <Icons.Users className="w-5 h-5 text-purple-600" />
            <span>今日雙夥伴即時利潤分帳</span>
          </div>
          <span className="text-xs font-bold text-slate-400">點擊卡片下方可展開詳細銷貨清單</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {Object.entries(todayData.ownerBreakdown || {}).map(([ownerName, ownerData]) => {
            const pct = totalRev > 0 ? Math.round((ownerData.totalRevenue / totalRev) * 100) : 0;
            const itemsList = getOwnerItemDetails(ownerName);
            const isExpanded = expandedOwner === ownerName;

            return (
              <div key={ownerName} className="bg-purple-50/70 border-2 border-purple-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                        {ownerName[0]}
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-slate-900">{ownerName}</span>
                        <div className="text-[10px] text-purple-700 font-bold">今日業績貢獻</div>
                      </div>
                    </div>
                    <span className="bg-purple-200 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                      佔今日 {pct}%
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-1 shadow-sm mt-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-500 font-bold">今日應分實收：</span>
                      <span className="text-base sm:text-lg font-black text-purple-700 font-mono">
                        NT$ {ownerData.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs text-slate-500 border-t border-purple-50 pt-1">
                      <span>今日實質毛利：</span>
                      <span className="font-black text-emerald-600 font-mono">NT$ {ownerData.totalProfit.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-bold flex justify-between px-1 mt-2">
                    <span>今日售出件數：</span>
                    <span className="text-slate-900 font-black font-mono">{ownerData.totalQty} 件</span>
                  </div>
                </div>

                {/* 🌟 展開/收合該員當日詳細銷貨明細按鈕 */}
                <div className="pt-2 border-t border-purple-100">
                  <button
                    type="button"
                    onClick={() => setExpandedOwner(isExpanded ? null : ownerName)}
                    className="w-full py-2 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Icons.Clock className="w-3.5 h-3.5" />
                    <span>{isExpanded ? '收合銷貨明細' : `檢視今日銷貨明細 (${itemsList.length} 件)`}</span>
                    {isExpanded ? <Icons.ChevronUp className="w-3.5 h-3.5" /> : <Icons.ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* 展開後的銷貨明細列表 */}
                  {isExpanded && (
                    <div className="mt-2.5 bg-white rounded-xl border border-purple-200 p-2.5 space-y-2 max-h-60 overflow-y-auto animate-in fade-in">
                      <div className="text-[11px] font-black text-purple-900 pb-1 border-b border-slate-100 flex justify-between">
                        <span>【{ownerName}】今日售出品項</span>
                        <span>共 {itemsList.length} 筆</span>
                      </div>
                      {itemsList.length === 0 ? (
                        <div className="text-center py-4 text-slate-400 text-xs font-bold">今日尚無售出品項</div>
                      ) : (
                        itemsList.map((it, idx) => (
                          <div key={idx} className="p-2 bg-surface-50 rounded-lg border border-slate-100 space-y-1 text-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-black text-slate-900">{it.productName}</span>
                                <span className="text-rose-600 font-bold ml-1 text-[11px]">({it.variantName})</span>
                                <span className="text-slate-500 font-black font-mono ml-1.5">x{it.qty}</span>
                              </div>
                              <span className="font-mono font-black text-purple-700 text-xs">
                                NT$ {it.revenue}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                              <span className="flex items-center gap-1">
                                <span className="font-mono text-slate-600">{it.time}</span>
                                <span>•</span>
                                <span className="bg-slate-200 text-slate-700 px-1 py-0.2 rounded">{it.channel}</span>
                                <span>•</span>
                                <span>{it.paymentMethod}</span>
                              </span>
                              <span className="font-mono text-emerald-600 font-black">
                                毛利 +${it.profit}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* 5 大財務 KPI 卡片 (大字體好讀) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
          <div className="text-xs text-slate-500 font-bold">今日實收營業額</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">NT$ {totalRev.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
          <div className="text-xs text-slate-500 font-bold">今日衣服底價成本</div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1 font-mono">NT$ {totalCost.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
          <div className="text-xs text-slate-500 font-bold">今日實質總毛利</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 font-mono">NT$ {totalProfit.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
          <div className="text-xs text-slate-500 font-bold">預估毛利率</div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1 font-mono">{profitMargin}%</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-500 font-bold">總售出 / 總單數</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">{totalItems} 件 <span className="text-xs text-slate-400 font-normal">({totalOrders}單)</span></div>
        </div>
      </div>

      {/* 收款方式佔比分佈 */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-2">
        <div className="text-xs font-black text-slate-700">收款方式分佈 (實收現金需與現場錢包核對)</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(todayData.paymentBreakdown || {}).map(([pm, amt]) => (
            <div key={pm} className="bg-surface-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-[11px] text-slate-400 font-bold">{pm}</div>
              <div className="text-base font-black text-slate-900 mt-0.5 font-mono">NT$ {amt.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 今日交易明細清單 (附精確至秒之時間戳記) */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-card">
        <div className="p-4 bg-surface-50 text-xs font-black text-slate-700 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Icons.Clock className="w-4 h-4 text-slate-500" />
            <span>今日銷售交易明細 ({todaySales.length} 筆)</span>
          </div>
          <span className="text-[11px] text-slate-400 font-bold">精確時間 • 通路場次 • 實收金額</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {todaySales.length > 0 ? (
            todaySales.map(s => {
              const isVoid = s.status === '已作廢';
              const amt = s.final_amount !== undefined ? s.final_amount : (s.finalAmount !== undefined ? s.finalAmount : s.total_amount);
              return (
                <div key={s.order_id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm transition ${isVoid ? 'bg-slate-50 opacity-50' : 'hover:bg-slate-50'}`}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-slate-900 text-white font-mono font-black px-2 py-0.5 rounded-lg text-xs">
                        {s.timestamp ? formatTaiwanTime(s.timestamp, 'time') : '剛才'}
                      </span>
                      <span className="font-mono font-bold text-slate-500 text-xs">{s.order_id}</span>
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[11px] font-black border border-blue-200">
                        {s.channelName || s.eventName || '現場'}
                      </span>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-bold">{s.payment_method}</span>
                      {isVoid && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg text-[11px] font-black">已作廢</span>}
                    </div>
                    <div className="text-slate-700 text-xs mt-1.5 font-bold flex flex-wrap gap-1.5">
                      {(s.items || []).map((i, idx) => (
                        <span key={idx} className="bg-surface-50 border border-slate-200 px-2 py-0.5 rounded-lg text-slate-800">
                          {i.productName} ({i.variantName}) x{i.qty}
                          {i.owner && <span className="text-purple-600 ml-1 font-black">[{i.owner}]</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                    <span className="font-black text-slate-900 text-base sm:text-lg font-mono">NT$ {amt}</span>
                    {!isVoid && (
                      <button
                        onClick={() => {
                          if (confirm(`確定要作廢訂單「${s.order_id}」嗎？相關庫存將會自動加回！`)) {
                            onVoidSale(s.order_id, user?.name || '管理員');
                          }
                        }}
                        className="px-3.5 py-1.5 bg-surface-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-black transition"
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
