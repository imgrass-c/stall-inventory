import React, { useState, useMemo } from 'react';
import { Icons } from '../common/Icons';
import { exportToCsv } from '../../utils/formatters';

export default function InventoryView({
  inventory = [],
  onSyncSheets,
  isAdmin = false,
  isEditor = false,
  onClearData,
  onDeleteItem,
  onNavigateToProducts,
  user
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwner, setFilterOwner] = useState('全部');
  const [filterStockStatus, setFilterStockStatus] = useState('全部');
  const [syncMsg, setSyncMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const owners = useMemo(() => {
    const set = new Set(['全部']);
    inventory.forEach(i => { if (i.owner) set.add(i.owner); });
    return Array.from(set);
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(i => {
      const matchSearch = !searchTerm.trim() ||
        (i.product_name && i.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (i.variant_name && i.variant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (i.sku_id && i.sku_id.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchOwner = filterOwner === '全部' || i.owner === filterOwner;
      const matchStock = filterStockStatus === '全部'
        ? true
        : filterStockStatus === '現場低庫存'
        ? i.stall_qty <= 2
        : filterStockStatus === '現場缺貨'
        ? i.stall_qty === 0
        : true;
      return matchSearch && matchOwner && matchStock;
    });
  }, [inventory, searchTerm, filterOwner, filterStockStatus]);

  const totalHomeStock = useMemo(() => inventory.reduce((s, i) => s + (i.home_qty || 0), 0), [inventory]);
  const totalStallStock = useMemo(() => inventory.reduce((s, i) => s + (i.stall_qty || 0), 0), [inventory]);
  const totalInventoryStock = totalHomeStock + totalStallStock;
  const totalCostValue = useMemo(() => inventory.reduce((s, i) => s + ((Number(i.cost) || 0) * ((i.home_qty || 0) + (i.stall_qty || 0))), 0), [inventory]);
  const totalRetailValue = useMemo(() => inventory.reduce((s, i) => s + ((Number(i.price) || 0) * ((i.home_qty || 0) + (i.stall_qty || 0))), 0), [inventory]);

  // 🌟 超完整庫存清冊 CSV 匯出 (僅管理員與編輯者可見/可匯出)
  const handleExportCsv = () => {
    if (!isEditor) return;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = [
      'SKU ID',
      '商品名稱',
      '商品分類',
      '尺寸規格',
      '貨品歸屬主理人',
      '市集售價',
      '進貨底價成本',
      '單件預期毛利',
      '標定毛利率',
      '家內倉庫存量',
      '市集現場存量',
      '總庫存量',
      '進貨成本總貨值',
      '預期售價總貨值',
      '預期總毛利空間',
      '庫存健康狀態'
    ];
    const rows = filteredInventory.map(i => {
      const home = Number(i.home_qty) || 0;
      const stall = Number(i.stall_qty) || 0;
      const total = (i.home_qty !== undefined && i.stall_qty !== undefined) ? (home + stall) : (Number(i.total_qty) || 0);
      const price = Number(i.price) || 0;
      const cost = Number(i.cost) || 0;
      const unitProfit = price - cost;
      const margin = price > 0 ? `${((unitProfit / price) * 100).toFixed(1)}%` : '0%';
      const costVal = cost * total;
      const retailVal = price * total;
      const potentialProfit = unitProfit * total;
      const status = stall === 0 ? '現場缺貨' : (stall <= 2 ? '現場低庫存' : '正常');

      return [
        i.sku_id,
        i.product_name,
        i.category || '衣服',
        i.variant_name,
        i.owner || '攤位公家',
        price,
        cost,
        unitProfit,
        margin,
        home,
        stall,
        total,
        costVal,
        retailVal,
        potentialProfit,
        status
      ];
    });
    exportToCsv(`感情失敗之友會_即時庫存清冊_${dateStr}.csv`, headers, rows);
  };

  const handleSyncToSheets = async () => {
    if (!isEditor) return;
    setIsSyncing(true);
    setSyncMsg('');
    try {
      const res = await onSyncSheets();
      if (res && res.success) {
        setSyncMsg('已成功同步最新庫存至 Google 試算表！');
      } else {
        setSyncMsg('同步失敗：' + (res?.error || '請檢查連線設定'));
      }
    } catch(err) {
      setSyncMsg('同步錯誤：' + err.message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  return (
    <div className="flex-1 bg-surface-50 p-3.5 sm:p-6 overflow-y-auto space-y-4 max-w-6xl mx-auto w-full">
      
      {/* 頂部標題與快速操作按鈕 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">即時庫存總表</h2>
          <p className="text-xs text-slate-400 font-bold">即時雙庫存監控、現貨件數與架上庫存盤點</p>
        </div>

        {/* 🌟 匯出庫存清冊 CSV 與同步 Google 試算表：僅系統管理者與編輯者可見 */}
        {isEditor && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportCsv}
              className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-black rounded-2xl text-xs border border-slate-200 shadow-sm transition flex items-center justify-center gap-1.5"
            >
              <Icons.Download className="w-4 h-4 text-slate-600" />
              <span>匯出庫存清冊</span>
            </button>

            <button
              onClick={handleSyncToSheets}
              disabled={isSyncing}
              className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-sm transition flex items-center justify-center gap-1.5"
            >
              <Icons.Cloud className="w-4 h-4 text-white" />
              <span>{isSyncing ? '同步中...' : '同步試算表'}</span>
            </button>
          </div>
        )}
      </div>

      {syncMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold animate-in fade-in">
          {syncMsg}
        </div>
      )}

      {/* 4 大即時核心指標卡片 (小幫手隱藏進貨底價總值) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400">總庫存件數</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">{totalInventoryStock} 件</div>
          <span className="text-[10px] text-slate-400 font-bold">全商品現貨加總</span>
        </div>

        <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-500">市集現場存量</span>
          <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono mt-0.5">{totalStallStock} 件</div>
          <span className="text-[10px] text-rose-400 font-bold">攤位架上即時可用</span>
        </div>

        <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-purple-600">家內倉庫存量</span>
          <div className="text-xl sm:text-2xl font-black text-purple-700 font-mono mt-0.5">{totalHomeStock} 件</div>
          <span className="text-[10px] text-purple-400 font-bold">待出攤與網路備貨</span>
        </div>

        {/* 🌟 若為小幫手 (!isEditor)，隱藏進貨底價總值，顯示總規格款數 */}
        {isEditor ? (
          <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600">進貨成本總值</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-0.5">NT$ {totalCostValue.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 font-bold">預期售價 NT$ {totalRetailValue.toLocaleString()}</span>
          </div>
        ) : (
          <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-blue-600">在庫款式規格數</span>
            <div className="text-xl sm:text-2xl font-black text-blue-700 font-mono mt-0.5">{inventory.length} 款</div>
            <span className="text-[10px] text-slate-400 font-bold">現場在售規格總數</span>
          </div>
        )}
      </div>

      {/* 搜尋與多重篩選器 */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋商品、尺寸或 SKU (如: 黑色, XL)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-surface-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1">
              <Icons.Close className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={filterOwner}
            onChange={e => setFilterOwner(e.target.value)}
            className="bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 focus:outline-none"
          >
            {owners.map(o => (
              <option key={o} value={o}>{o === '全部' ? '全部主理人' : o}</option>
            ))}
          </select>

          <select
            value={filterStockStatus}
            onChange={e => setFilterStockStatus(e.target.value)}
            className="bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 focus:outline-none"
          >
            <option value="全部">全部庫存狀態</option>
            <option value="現場低庫存">現場低庫存 (≤ 2)</option>
            <option value="現場缺貨">現場缺貨 (0)</option>
          </select>
        </div>
      </div>

      {/* 庫存清單表格 (響應式設計) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        {filteredInventory.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs sm:text-sm font-bold space-y-2">
            <p>查無符合的庫存資料</p>
            {isEditor && inventory.length === 0 && (
              <button
                onClick={onNavigateToProducts}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-black shadow-sm mt-2"
              >
                前往商品建檔
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 border-b border-slate-200 text-slate-400 font-black">
                <tr>
                  <th className="py-3 px-4">商品與尺寸規格</th>
                  <th className="py-3 px-3">貨品歸屬</th>
                  {/* 🌟 欄位標題：小幫手只顯示「市集售價」，管理者與編輯者顯示「售價 / 成本」 */}
                  <th className="py-3 px-3 text-right">{isEditor ? '售價 / 成本' : '市集售價'}</th>
                  <th className="py-3 px-3 text-center">現場庫存</th>
                  <th className="py-3 px-3 text-center">倉庫存量</th>
                  <th className="py-3 px-3 text-center">總件數</th>
                  {/* 🌟 進貨總貨值：僅管理員與編輯者可見 */}
                  {isEditor && <th className="py-3 px-4 text-right">進貨總貨值</th>}
                  {isAdmin && <th className="py-3 px-3 text-center">管理</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map(item => {
                  const stall = Number(item.stall_qty) || 0;
                  const home = Number(item.home_qty) || 0;
                  const total = (item.home_qty !== undefined && item.stall_qty !== undefined) ? (home + stall) : (Number(item.total_qty) || 0);
                  const cost = Number(item.cost) || 0;
                  const price = Number(item.price) || 0;
                  const costVal = cost * total;

                  return (
                    <tr key={item.sku_id} className="hover:bg-surface-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900 text-sm">{item.product_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <span className="bg-rose-50 text-rose-600 px-1.5 py-0.2 rounded font-black">{item.variant_name}</span>
                          <span>{item.sku_id}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-700">
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-black text-[11px]">
                          {item.owner || '攤位公家'}
                        </span>
                      </td>

                      {/* 🌟 價格欄位：小幫手只顯示「$800」，進貨底價 $300 完全隱藏 */}
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-black text-rose-600 text-sm">${price}</div>
                        {isEditor && <div className="text-[10px] text-slate-400">成本 ${cost}</div>}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-xl font-mono font-black text-xs ${
                          stall === 0
                            ? 'bg-rose-100 text-rose-700 font-bold'
                            : stall <= 2
                            ? 'bg-amber-100 text-amber-800 font-bold'
                            : 'bg-surface-100 text-slate-900'
                        }`}>
                          {stall} 件
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                        {home} 件
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-sm">
                        {total}
                      </td>

                      {/* 🌟 進貨總貨值：僅管理員與編輯者可見 */}
                      {isEditor && (
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                          ${costVal.toLocaleString()}
                        </td>
                      )}

                      {isAdmin && (
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`確定要刪除「${item.product_name} (${item.variant_name})」的庫存規格嗎？`)) {
                                onDeleteItem(item.sku_id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="刪除庫存規格"
                          >
                            <Icons.Trash className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
