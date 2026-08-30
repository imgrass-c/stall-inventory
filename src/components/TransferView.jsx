import React, { useState } from 'react';
import { ArrowRight, Check, Send } from 'lucide-react';

export default function TransferView({ inventory, onTransfer, user }) {
  const [direction, setDirection] = useState('home_to_stall');
  const [eventName, setEventName] = useState('市集出攤調撥');
  const [transferQuantities, setTransferQuantities] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleQtyChange = (skuId, val, maxLimit) => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (maxLimit !== undefined && num > maxLimit) num = maxLimit;

    setTransferQuantities(prev => ({
      ...prev,
      [skuId]: num
    }));
  };

  const setFullQty = (skuId, maxQty) => {
    setTransferQuantities(prev => ({
      ...prev,
      [skuId]: maxQty
    }));
  };

  const clearAll = () => {
    setTransferQuantities({});
  };

  const activeTransfers = Object.keys(transferQuantities)
    .filter(skuId => transferQuantities[skuId] > 0)
    .map(skuId => ({
      skuId,
      qty: transferQuantities[skuId],
      direction
    }));

  const totalTransferUnits = activeTransfers.reduce((sum, item) => sum + item.qty, 0);

  const handleSubmit = async () => {
    if (activeTransfers.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        transfers: activeTransfers,
        operator: user ? user.name || user.email : '工作人員',
        eventName: eventName
      };

      const res = await onTransfer(payload);
      if (res && res.success) {
        setSuccessMsg(`調撥完成！共調撥 ${activeTransfers.length} 項規格，合計 ${totalTransferUnits} 件。`);
        clearAll();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* 頂部設定卡片 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* 調撥方向切換 */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto text-xs">
            <button
              onClick={() => { setDirection('home_to_stall'); clearAll(); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-md font-semibold transition ${
                direction === 'home_to_stall'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🏠 家內</span>
              <ArrowRight className="w-3 h-3" />
              <span>🟢 現場出攤</span>
            </button>

            <button
              onClick={() => { setDirection('stall_to_home'); clearAll(); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-md font-semibold transition ${
                direction === 'stall_to_home'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🟢 現場</span>
              <ArrowRight className="w-3 h-3" />
              <span>🏠 收攤回庫</span>
            </button>
          </div>

          {/* 活動場次名稱備註 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="輸入活動/場次名稱 (選填)"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400"
            />
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* 調撥清單表 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            請輸入欲調撥之件數：
          </span>
          {activeTransfers.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-rose-500 font-medium"
            >
              全部清空重選
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {inventory.map(item => {
            const availableSourceQty = direction === 'home_to_stall' ? item.home_qty : item.stall_qty;
            const currentQty = transferQuantities[item.sku_id] || 0;

            return (
              <div
                key={item.sku_id}
                className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
              >
                {/* 商品與規格 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {item.product_name}
                    </span>
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[11px] font-mono font-bold border border-slate-200">
                      {item.variant_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>
                      來源 ({direction === 'home_to_stall' ? '家內' : '現場'}):{' '}
                      <strong className="text-slate-800">{availableSourceQty}</strong> 件
                    </span>
                    <span>•</span>
                    <span>
                      目標 ({direction === 'home_to_stall' ? '現場' : '家內'}):{' '}
                      <strong className="text-slate-800">
                        {direction === 'home_to_stall' ? item.stall_qty : item.home_qty}
                      </strong> 件
                    </span>
                  </div>
                </div>

                {/* 調撥數量操作區 */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    {[1, 5].map(step => (
                      <button
                        key={step}
                        onClick={() => handleQtyChange(item.sku_id, currentQty + step, availableSourceQty)}
                        disabled={availableSourceQty <= 0}
                        className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-bold transition disabled:opacity-40"
                      >
                        +{step}
                      </button>
                    ))}
                    <button
                      onClick={() => setFullQty(item.sku_id, availableSourceQty)}
                      disabled={availableSourceQty <= 0}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-bold transition disabled:opacity-40"
                    >
                      全調
                    </button>
                  </div>

                  <input
                    type="number"
                    min="0"
                    max={availableSourceQty}
                    value={currentQty === 0 ? '' : currentQty}
                    onChange={e => handleQtyChange(item.sku_id, e.target.value, availableSourceQty)}
                    placeholder="0"
                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-400"
                  />
                  <span className="text-xs text-slate-400 font-medium">件</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部確認按鈕 */}
      <button
        onClick={handleSubmit}
        disabled={activeTransfers.length === 0 || isSubmitting}
        className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-1.5"
      >
        {isSubmitting ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            <span>確認送出調撥 ({activeTransfers.length} 項商品，合計 {totalTransferUnits} 件)</span>
          </>
        )}
      </button>
    </div>
  );
}
