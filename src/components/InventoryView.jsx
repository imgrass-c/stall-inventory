import React, { useState, useMemo } from 'react';
import { Search, Boxes, Store, Home, AlertTriangle, RefreshCw, Layers } from 'lucide-react';

export default function InventoryView({ inventory, onRefresh, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [stockFilter, setStockFilter] = useState('all');

  const categories = useMemo(() => {
    const cats = ['全部'];
    inventory.forEach(item => {
      if (item.category && !cats.includes(item.category)) {
        cats.push(item.category);
      }
    });
    return cats;
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (selectedCategory !== '全部' && item.category !== selectedCategory) {
        return false;
      }
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const pName = (item.product_name || '').toLowerCase();
        const vName = (item.variant_name || '').toLowerCase();
        if (!pName.includes(query) && !vName.includes(query)) {
          return false;
        }
      }
      if (stockFilter === 'low_stall' && (item.stall_qty > (item.safety_stock || 2) || item.stall_qty <= 0)) {
        return false;
      }
      if (stockFilter === 'out_of_stock' && item.stall_qty > 0) {
        return false;
      }
      return true;
    });
  }, [inventory, selectedCategory, searchTerm, stockFilter]);

  const stats = useMemo(() => {
    let totalHome = 0;
    let totalStall = 0;
    let lowStallCount = 0;
    let outOfStockCount = 0;

    inventory.forEach(item => {
      const h = Number(item.home_qty) || 0;
      const s = Number(item.stall_qty) || 0;
      const safety = Number(item.safety_stock) || 2;
      totalHome += h;
      totalStall += s;

      if (s === 0) outOfStockCount++;
      else if (s <= safety) lowStallCount++;
    });

    return {
      skuCount: inventory.length,
      totalHome,
      totalStall,
      totalAll: totalHome + totalStall,
      lowStallCount,
      outOfStockCount
    };
  }, [inventory]);

  return (
    <div className="space-y-4">
      {/* KPI 指標摘要卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>現場總庫存</span>
            <Store className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats.totalStall} <span className="text-xs text-slate-400 font-normal">件</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>家內總庫存</span>
            <Home className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats.totalHome} <span className="text-xs text-slate-400 font-normal">件</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>全體總合計</span>
            <Layers className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {stats.totalAll} <span className="text-xs text-slate-400 font-normal">件</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>庫存吃緊 / 缺貨</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {stats.outOfStockCount + stats.lowStallCount} <span className="text-xs text-slate-400 font-normal">項</span>
          </div>
        </div>
      </div>

      {/* 搜尋與過濾工具列 */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋商品名稱、尺寸或款式規格..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition ${stockFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'}`}
            >
              全部
            </button>
            <button
              onClick={() => setStockFilter('low_stall')}
              className={`px-3 py-1 rounded-md font-medium transition ${stockFilter === 'low_stall' ? 'bg-white text-amber-600 shadow-sm font-semibold' : 'text-slate-600'}`}
            >
              偏低 ({stats.lowStallCount})
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-3 py-1 rounded-md font-medium transition ${stockFilter === 'out_of_stock' ? 'bg-white text-rose-600 shadow-sm font-semibold' : 'text-slate-600'}`}
            >
              缺貨 ({stats.outOfStockCount})
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            title="重新整理庫存"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* 庫存清單表格 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">商品與規格</th>
                <th className="py-3 px-3 text-center">分類</th>
                <th className="py-3 px-3 text-right">單價</th>
                <th className="py-3 px-3 text-center">🟢 現場庫存</th>
                <th className="py-3 px-3 text-center">🏠 家內庫存</th>
                <th className="py-3 px-3 text-center">總合計</th>
                <th className="py-3 px-3 text-center">狀態</th>
                <th className="py-3 px-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-1 opacity-40" />
                    <p>沒有符合條件的商品規格</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const isZero = Number(item.stall_qty) <= 0;
                  const isLow = Number(item.stall_qty) <= Number(item.safety_stock || 2) && !isZero;

                  return (
                    <tr key={item.sku_id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.product_name}</div>
                        <span className="inline-block mt-0.5 bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold text-[11px] border border-slate-200">
                          {item.variant_name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500">{item.category}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">NT$ {item.price}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded font-bold ${
                          isZero
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : isLow
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {item.stall_qty}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-600">{item.home_qty}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {item.total_qty || (Number(item.home_qty) + Number(item.stall_qty))}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isZero ? (
                          <span className="text-rose-600 font-semibold">現場缺貨</span>
                        ) : isLow ? (
                          <span className="text-amber-600 font-semibold">偏低</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">充足</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {onDeleteItem && (
                          <button
                            onClick={() => {
                              if (confirm(`確定要刪除「${item.product_name} - ${item.variant_name}」嗎？`)) {
                                onDeleteItem(item.sku_id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="刪除此規格品項"
                          >
                            ✕
                          </button>
                        )}
                      </td>
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
