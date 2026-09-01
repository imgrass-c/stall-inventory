import React, { useState } from 'react';
import { Icons } from '../common/Icons';
import { formatTaiwanTime, exportToCsv } from '../../utils/formatters';

export default function MonthTab({
  selectedMonth,
  onChangeMonth,
  currentMonthData,
  loading,
  onRefresh,
  onExportMonthCsv
}) {
  const [expandedPartner, setExpandedPartner] = useState(null);

  const totalRev = currentMonthData.totalRevenue || 0;
  const totalCost = currentMonthData.totalCost || 0;
  const totalProfit = currentMonthData.totalProfit || 0;
  const profitMargin = currentMonthData.profitMargin || 0;
  const totalItems = currentMonthData.totalItemsSold || 0;
  const totalOrders = currentMonthData.totalOrders || 0;

  const handleExportPartnerSalesCsv = (partnerName, salesRecords, monthStr) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = [
      '訂單編號',
      '日期時間',
      '場次活動/通路',
      '商品名稱',
      '規格尺寸',
      '貨品歸屬主理人',
      '銷售數量',
      '標價單價',
      '標價總額',
      '折讓金額',
      '實收分帳金額',
      '進貨成本小計',
      '實質毛利',
      '收款方式',
      '收款人/收銀員'
    ];
    const rows = (salesRecords || []).map(r => {
      const origPrice = Number(r.originalPrice || r.price || 0);
      const qty = Number(r.qty || 1);
      const origTotal = origPrice * qty;
      const costTotal = (Number(r.cost) || 0) * qty;
      const realSubtotal = Number(r.realSubtotal !== undefined ? r.realSubtotal : (origTotal - (r.discount || 0)));
      const realProfit = Number(r.realProfit !== undefined ? r.realProfit : (realSubtotal - costTotal));

      return [
        r.orderId || '-',
        r.timestamp ? formatTaiwanTime(r.timestamp, 'datetime') : r.date,
        r.eventName || '一般現場',
        r.productName,
        r.variantName,
        partnerName,
        qty,
        origPrice,
        origTotal,
        r.discount || 0,
        realSubtotal,
        costTotal,
        realProfit,
        r.paymentMethod,
        r.operator || '現場收銀員'
      ];
    });
    exportToCsv(`感情失敗之友會_夥伴分帳明細_${monthStr}_${partnerName}_${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* 月份選擇器與操作列 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeMonth(-1)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 transition flex items-center gap-1"
          >
            <Icons.ChevronLeft className="w-3.5 h-3.5" />
            <span>上個月</span>
          </button>
          <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-black text-sm flex items-center gap-1.5">
            <Icons.Calendar className="w-4 h-4 text-rose-600" />
            <span>{selectedMonth} 月度總報表</span>
          </div>
          <button
            type="button"
            onClick={() => onChangeMonth(1)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 transition flex items-center gap-1"
          >
            <span>下個月</span>
            <Icons.ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportMonthCsv}
            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Icons.DownloadFile className="w-3.5 h-3.5" />
            <span>匯出【{selectedMonth}】全月 CSV</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="text-xs bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-200 text-slate-700 font-bold shadow-sm"
          >
            <Icons.Refresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 當月 5 大財務 KPI 卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] text-slate-500 font-bold">當月累積實收</div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">NT$ {totalRev.toLocaleString()}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] text-slate-500 font-bold">當月商品總成本</div>
          <div className="text-xl font-black text-amber-700 mt-1 font-mono">NT$ {totalCost.toLocaleString()}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] text-slate-500 font-bold">當月實質總毛利</div>
          <div className="text-xl font-black text-emerald-600 mt-1 font-mono">NT$ {totalProfit.toLocaleString()}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] text-slate-500 font-bold">當月平均毛利率</div>
          <div className="text-xl font-black text-purple-700 mt-1 font-mono">{profitMargin}%</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-500 font-bold">總銷量 / 總訂單</div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">{totalItems} 件 <span className="text-xs text-slate-400 font-normal">({totalOrders}單)</span></div>
        </div>
      </div>

      {/* 雙夥伴 / 攤主當月分帳 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
            <Icons.Users className="w-4 h-4 text-purple-600" />
            <span>【{selectedMonth}】雙夥伴月度累積分帳</span>
          </div>
          <span className="text-[11px] font-bold text-slate-400">當月應分業績與毛利佔比</span>
        </div>

        {Object.keys(currentMonthData?.ownerBreakdown || {}).length > 0 ? (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(currentMonthData.ownerBreakdown).map(([ownerName, ownerData]) => {
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
                        <span className="text-lg font-black text-purple-700 font-mono">NT$ {ownerData.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-[11px] border-t border-purple-50 pt-1 text-slate-500">
                        <span className="font-medium">當月實質毛利：</span>
                        <span className="font-black text-emerald-600 font-mono">NT$ {ownerData.totalProfit.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-bold flex justify-between px-1">
                      <span>當月售出件數：</span>
                      <span className="text-slate-900 font-black">{ownerData.totalQty} 件 ({recordsCount} 筆)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedPartner(isExpanded ? null : ownerName)}
                      className={`w-full py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border ${
                        isExpanded
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100/50'
                      }`}
                    >
                      <Icons.Search className="w-3.5 h-3.5" />
                      <span>{isExpanded ? '收起當月明細' : `查看當月銷售明細 (${recordsCount} 筆)`}</span>
                      {isExpanded ? <Icons.ChevronUp className="w-3.5 h-3.5" /> : <Icons.ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 🌟 展開該夥伴當月銷售清單 (倒序排列，最新在最前) */}
            {expandedPartner && currentMonthData?.ownerBreakdown?.[expandedPartner] && (
              <div className="bg-white rounded-2xl border-2 border-purple-300 p-4 space-y-3 shadow-md animate-in fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                    <h4 className="text-xs font-black text-slate-900">
                      【{expandedPartner}】在 {selectedMonth} 的銷售明細 (最新在最前，共 {(currentMonthData.ownerBreakdown[expandedPartner].salesRecords || []).length} 筆)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportPartnerSalesCsv(expandedPartner, currentMonthData.ownerBreakdown[expandedPartner].salesRecords, selectedMonth)}
                    className="text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 px-3 py-1.5 rounded-xl font-black flex items-center gap-1 shadow-sm transition"
                  >
                    <Icons.DownloadFile className="w-3.5 h-3.5 text-purple-700" />
                    <span>匯出【{expandedPartner}】當月銷售 CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-50 text-[11px] font-black text-slate-600 border-b border-slate-200">
                        <th className="p-2.5 whitespace-nowrap">日期時間</th>
                        <th className="p-2.5 whitespace-nowrap">場次活動</th>
                        <th className="p-2.5 whitespace-nowrap">商品名稱與規格</th>
                        <th className="p-2.5 text-center whitespace-nowrap">數量</th>
                        <th className="p-2.5 text-right whitespace-nowrap">原標價</th>
                        <th className="p-2.5 text-right whitespace-nowrap text-rose-500">折讓</th>
                        <th className="p-2.5 text-right whitespace-nowrap text-purple-700 font-black">實收分帳</th>
                        <th className="p-2.5 text-right whitespace-nowrap text-emerald-600 font-black">實質毛利</th>
                        <th className="p-2.5 whitespace-nowrap">支付方式</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {[...(currentMonthData.ownerBreakdown[expandedPartner].salesRecords || [])]
                        .sort((a, b) => (b.timestamp || b.orderId || '').localeCompare(a.timestamp || a.orderId || ''))
                        .map((rec, idx) => {
                          const isPR = rec.paymentMethod === '公關贈送';
                          const origTotal = Number(rec.originalPrice || rec.price || 0) * Number(rec.qty || 1);
                          const realProfit = rec.realProfit !== undefined ? rec.realProfit : (Number(rec.realSubtotal || 0) - (Number(rec.cost || 0) * Number(rec.qty || 1)));

                          return (
                            <tr key={idx} className="hover:bg-purple-50/30 transition">
                              <td className="p-2.5 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                                <Icons.Clock className="w-3 h-3 text-slate-400 inline mr-1" />
                                <span>{rec.timestamp ? formatTaiwanTime(rec.timestamp, 'datetime') : rec.date}</span>
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black border border-blue-200">
                                  {rec.eventName || '一般現場'}
                                </span>
                              </td>
                              <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                                {rec.productName} <span className="text-purple-600 font-bold">({rec.variantName})</span>
                              </td>
                              <td className="p-2.5 text-center font-black text-slate-800 font-mono">
                                {rec.qty}
                              </td>
                              <td className="p-2.5 text-right text-slate-500 font-mono">
                                NT$ {origTotal}
                              </td>
                              <td className="p-2.5 text-right text-rose-500 font-bold font-mono">
                                {rec.discount > 0 ? `-NT$ ${rec.discount}` : '-'}
                              </td>
                              <td className="p-2.5 text-right font-black font-mono">
                                {isPR ? (
                                  <span className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">公關 $0</span>
                                ) : (
                                  <span className="text-purple-700 text-sm">NT$ {rec.realSubtotal}</span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-black font-mono">
                                <span className={realProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                  {realProfit >= 0 ? `+NT$ ${realProfit}` : `-NT$ ${Math.abs(realProfit)}`}
                                </span>
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  isPR ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {rec.paymentMethod}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
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

      {/* 當月每日營收走勢清單 */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="p-4 bg-surface-50 text-xs font-black text-slate-700 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Icons.Calendar className="w-4 h-4 text-slate-600" />
            <span>【{selectedMonth}】每日營收彙總明細表 (共 {(currentMonthData.dailyBreakdown || []).length} 天出攤)</span>
          </div>
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
              {(currentMonthData.dailyBreakdown || []).length > 0 ? (
                (currentMonthData.dailyBreakdown || []).map((d, idx) => {
                  const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <Icons.Calendar className="w-3 h-3 text-slate-400 inline mr-1" />
                        <span>{d.date}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(d.events && d.events.length > 0 ? d.events : [d.eventName || "一般現場"]).map((evName, eIdx) => (
                            <span key={eIdx} className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap">
                              {evName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800 font-mono">
                        {d.totalItems} 件
                      </td>
                      <td className="p-3 text-center text-slate-500 font-mono">
                        {d.totalOrders} 筆
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 font-mono">
                        NT$ {d.revenue.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-amber-800 font-mono">
                        NT$ {d.cost.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600 font-mono">
                        NT$ {d.profit.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-bold text-purple-700 font-mono">
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
  );
}
