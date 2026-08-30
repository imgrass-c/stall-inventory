import React, { useState, useMemo } from 'react';
import { Icons } from '../common/Icons';
import { exportToCsv } from '../../utils/formatters';

export default function InventoryView({
  inventory,
  onSyncSheets,
  isAdmin,
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

  const handleExportCsv = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = ['SKU ID', '商品名稱', '規格', '進貨底價', '市集售價', '家內庫存', '現場庫存', '總庫存量', '貨品歸屬'];
    const rows = filteredInventory.map(i => [
      i.sku_id,
      i.product_name,
      i.variant_name,
      i.cost,
      i.price,
      i.home_qty,
      i.stall_qty,
      (i.home_qty || 0) + (i.stall_qty || 0),
      i.owner || '攤位公家'
    ]);
    exportToCsv(`感情失敗之友會_即時庫存清冊_${dateStr}.csv`, headers, rows);
  };

  const handleSyncToSheets = async () => {
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
    <div className="flex-1 bg-surface-50 p-4 sm:p-6 overflow-y-auto space-y-4">
      
      {/* 頂部控制列 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">即時庫存清冊</h2>
          <p className="text-xs text-slate-400 font-bold">即時監控家內庫存與現場攤位存量</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Icons.DownloadFile className="w-4 h-4 text-slate-500" />
            <span>匯出 CSV</span>
          </button>

          <button
            onClick={handleSyncToSheets}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Icons.CloudSync className={`w-4 h-4 text-rose-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? '同步中...' : '備份至 Google 試算表'}</span>
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Icons.Check className="w-4 h-4 text-emerald-600" />
          <span>{syncMsg}</span>
        </div>
      )}

      {/* 庫存 KPI 卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] font-bold text-slate-400">家內總庫存</div>
          <div className="text-xl font-black text-slate-900 mt-1">{totalHomeStock} <span className="text-xs text-slate-400 font-normal">件</span></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] font-bold text-slate-400">現場攤位存量</div>
          <div className="text-xl font-black text-rose-600 mt-1">{totalStallStock} <span className="text-xs text-slate-400 font-normal">件</span></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[11px] font-bold text-slate-400">商品總庫存</div>
          <div className="text-xl font-black text-slate-900 mt-1">{totalInventoryStock} <span className="text-xs text-slate-400 font-normal">件</span></div>
        </div>
      </div>

      {/* 篩選與搜尋列 */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋商品名稱、規格或 SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-surface-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterOwner}
            onChange={e => setFilterOwner(e.target.value)}
            className="bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            {owners.map(o => (
              <option key={o} value={o}>{o === '全部' ? '全部歸屬' : `主理人: ${o}`}</option>
            ))}
          </select>

          <select
            value={filterStockStatus}
            onChange={e => setFilterStockStatus(e.target.value)}
            className="bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="全部">全部庫存狀態</option>
            <option value="現場低庫存">現場低庫存 (≤2)</option>
            <option value="現場缺貨">現場已缺貨 (0)</option>
          </select>
        </div>
      </div>

      {/* 庫存表格 */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-50 text-[11px] font-black text-slate-500 border-b border-slate-200 uppercase tracking-wider">
                <th className="p-3.5">商品名稱與規格</th>
                <th className="p-3.5">歸屬主理人</th>
                <th className="p-3.5 text-right">售價</th>
                <th className="p-3.5 text-center">家內庫存</th>
                <th className="p-3.5 text-center">現場存量</th>
                <th className="p-3.5 text-center">總存量</th>
                {isAdmin && <th className="p-3.5 text-right">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-slate-400 font-bold">
                    無符合條件的庫存項目
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const isStallOut = item.stall_qty <= 0;
                  const isStallLow = item.stall_qty > 0 && item.stall_qty <= 2;
                  const total = (item.home_qty || 0) + (item.stall_qty || 0);

                  return (
                    <tr key={item.sku_id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5">
                        <div className="font-black text-slate-900">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                          <span className="text-rose-600 font-black">{item.variant_name}</span>
                          <span>•</span>
                          <span className="font-mono">{item.sku_id}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black border border-purple-200">
                          {item.owner || '攤位公家'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-800">
                        ${item.price}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-600">
                        {item.home_qty || 0}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                          isStallOut
                            ? 'bg-rose-100 text-rose-700'
                            : isStallLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.stall_qty || 0}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-black text-slate-900">
                        {total}
                      </td>
                      {isAdmin && (
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`確定要刪除「${item.product_name} (${item.variant_name})」此規格庫存嗎？`)) {
                                onDeleteItem(item.sku_id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 transition"
                            title="刪除此規格"
                          >
                            <Icons.Trash className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
