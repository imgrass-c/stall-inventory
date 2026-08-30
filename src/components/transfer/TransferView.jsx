import React, { useState } from 'react';
import { Icons } from '../common/Icons';

export default function TransferView({ inventory, onTransfer, user }) {
  const [direction, setDirection] = useState('home_to_stall');
  const [quantities, setQuantities] = useState({});
  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateVal = (skuId, val, max) => {
    const n = Math.max(0, Math.min(Number(val) || 0, max));
    setQuantities(prev => ({ ...prev, [skuId]: n }));
  };

  const activeList = Object.entries(quantities).filter(([_, q]) => q > 0);

  const submit = async () => {
    if (activeList.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setMsg('');
    try {
      const payload = activeList.map(([skuId, qty]) => ({ skuId, qty }));
      const res = await onTransfer(payload, direction, user?.name || '調撥操作員');
      if (res && res.success) {
        setMsg('調撥已成功送出並即時更新庫存！');
        setQuantities({});
      }
    } catch(err) {
      alert("調撥失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  return (
    <div className="flex-1 bg-surface-50 p-4 sm:p-6 overflow-y-auto space-y-4 max-w-4xl mx-auto w-full">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">雙向庫存調撥</h2>
        <p className="text-xs text-slate-400 font-bold">於「家內倉庫」與「市集現場攤位」之間批次調撥商品</p>
      </div>

      {/* 方向切換器 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card">
        <div className="flex bg-surface-50 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => { setDirection('home_to_stall'); setQuantities({}); }}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-black transition flex items-center justify-center gap-1.5 ${
              direction === 'home_to_stall' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            <span>家內出攤至現場</span>
          </button>
          <button
            onClick={() => { setDirection('stall_to_home'); setQuantities({}); }}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-black transition flex items-center justify-center gap-1.5 ${
              direction === 'stall_to_home' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            <span>現場撤攤回庫</span>
          </button>
        </div>
        {msg && <span className="text-emerald-600 text-xs font-black flex items-center gap-1"><Icons.Check className="w-4 h-4" />{msg}</span>}
      </div>

      {/* 商品調撥數量列表 */}
      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-card">
        {inventory.map(i => {
          const max = direction === 'home_to_stall' ? (i.home_qty || 0) : (i.stall_qty || 0);
          return (
            <div key={i.sku_id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
              <div>
                <span className="font-black text-slate-900 text-sm">{i.product_name}</span>
                <span className="text-purple-600 font-bold ml-1">({i.variant_name})</span>
                <div className="text-slate-400 text-xs mt-0.5 font-bold">來源可用: {max} 件</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateVal(i.sku_id, (quantities[i.sku_id] || 0) + 1, max)}
                  disabled={max <= 0}
                  className="px-3 py-2 bg-surface-50 hover:bg-slate-100 disabled:opacity-30 rounded-xl border border-slate-200 font-black text-slate-700 text-xs"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => updateVal(i.sku_id, (quantities[i.sku_id] || 0) + 5, max)}
                  disabled={max <= 0}
                  className="px-3 py-2 bg-surface-50 hover:bg-slate-100 disabled:opacity-30 rounded-xl border border-slate-200 font-black text-slate-700 text-xs"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => updateVal(i.sku_id, max, max)}
                  disabled={max <= 0}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 disabled:opacity-30 rounded-xl border border-amber-200 font-black text-amber-800 text-xs"
                >
                  全部
                </button>
                <input
                  type="number"
                  min="0"
                  max={max}
                  value={quantities[i.sku_id] || ''}
                  onChange={e => updateVal(i.sku_id, e.target.value, max)}
                  placeholder="0"
                  className="w-20 bg-surface-50 border border-slate-200 rounded-xl py-2 text-center font-black text-slate-900 text-sm focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 送出調撥按鈕 */}
      <button
        onClick={submit}
        disabled={activeList.length === 0 || isSubmitting}
        className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-base transition shadow-md flex items-center justify-center gap-2"
      >
        <Icons.Transfer className="w-5 h-5" />
        <span>{isSubmitting ? '調撥處理中...' : `確認送出調撥 (${activeList.length} 項)`}</span>
      </button>
    </div>
  );
}
