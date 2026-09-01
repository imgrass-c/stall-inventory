import React, { useState } from 'react';
import { Icons } from '../common/Icons';
import { compressImageFile } from '../../utils/formatters';

export default function EditProductModal({
  product,
  initialSkus = [],
  categories = [],
  owners = [],
  currentCreatorName,
  onSave,
  onDeleteProduct,
  onClose
}) {
  const [name, setName] = useState(product.name || '');
  const [category, setCategory] = useState(product.category || '衣服');
  const [imageUrl, setImageUrl] = useState(product.image_url || '');
  
  // 規格清單與已標記刪除的 sku_id
  const [skus, setSkus] = useState(() => {
    return initialSkus.map(s => ({
      sku_id: s.sku_id,
      product_id: product.product_id,
      variant_name: s.variant_name || 'Free Size',
      price: Number(s.price) || 800,
      cost: Number(s.cost) || 300,
      home_qty: Number(s.home_qty) || 0,
      stall_qty: Number(s.stall_qty) || 0,
      owner: s.owner || currentCreatorName || '攤位公家',
      isNew: false
    }));
  });
  const [deletedSkuIds, setDeletedSkuIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🌟 批次統一套用工具
  const [batchPrice, setBatchPrice] = useState('');
  const [batchCost, setBatchCost] = useState('');

  const handleApplyBatchPrice = () => {
    if (batchPrice === '') return;
    const num = Number(batchPrice) || 0;
    setSkus(prev => prev.map(s => ({ ...s, price: num })));
  };

  const handleApplyBatchCost = () => {
    if (batchCost === '') return;
    const num = Number(batchCost) || 0;
    setSkus(prev => prev.map(s => ({ ...s, cost: num })));
  };

  const handleApplyBatchOwner = (ownerName) => {
    if (!ownerName) return;
    setSkus(prev => prev.map(s => ({ ...s, owner: ownerName })));
  };

  // 圖片上傳
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setImageUrl(compressed);
    } catch(err) {
      alert("圖片處理失敗：" + err.message);
    }
  };

  // 修改特定 SKU 欄位
  const updateSku = (idx, field, val) => {
    setSkus(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  // 快速增減庫存數量
  const adjustQty = (idx, field, delta) => {
    setSkus(prev => {
      const next = [...prev];
      const current = Number(next[idx][field]) || 0;
      next[idx] = { ...next[idx], [field]: Math.max(0, current + delta) };
      return next;
    });
  };

  // 新增尺寸規格
  const handleAddSku = () => {
    const newSkuId = `${product.product_id}-SKU${Date.now().toString().slice(-4)}`;
    const lastSku = skus[skus.length - 1];
    setSkus(prev => [
      ...prev,
      {
        sku_id: newSkuId,
        product_id: product.product_id,
        variant_name: '',
        price: lastSku ? lastSku.price : 800,
        cost: lastSku ? lastSku.cost : 300,
        home_qty: 10,
        stall_qty: 0,
        owner: lastSku ? lastSku.owner : (currentCreatorName || '攤位公家'),
        isNew: true
      }
    ]);
  };

  // 刪除尺寸規格
  const handleRemoveSku = (idx) => {
    if (skus.length <= 1) {
      alert("每款商品至少須保留一個尺寸規格！");
      return;
    }
    const target = skus[idx];
    if (confirm(`確定要刪除「${target.variant_name || '此規格'}」嗎？`)) {
      if (!target.isNew && target.sku_id) {
        setDeletedSkuIds(prev => [...prev, target.sku_id]);
      }
      setSkus(prev => prev.filter((_, i) => i !== idx));
    }
  };

  // 提交儲存修改
  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updatedProduct = {
        ...product,
        name: name.trim(),
        category: category.trim() || '衣服',
        image_url: imageUrl || '',
        updated_at: new Date().toISOString()
      };

      const updatedSkus = skus.map(s => ({
        sku_id: s.sku_id,
        product_id: product.product_id,
        product_name: name.trim(),
        category: category.trim() || '衣服',
        variant_name: s.variant_name.trim() || '標準尺寸',
        price: Number(s.price) || 800,
        cost: Number(s.cost) || 300,
        home_qty: Number(s.home_qty) || 0,
        stall_qty: Number(s.stall_qty) || 0,
        total_qty: (Number(s.home_qty) || 0) + (Number(s.stall_qty) || 0),
        owner: s.owner || currentCreatorName || '攤位公家'
      }));

      await onSave(updatedProduct, updatedSkus, deletedSkuIds);
      alert(`商品「${name}」修改已儲存成功！`);
      onClose();
    } catch(err) {
      alert("儲存失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* 頂部標題與關閉按鈕 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
              <Icons.Products className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">編輯商品與規格庫存</h3>
              <p className="text-xs text-slate-400 font-bold">可直接修改品名、圖片、售價、成本與增減現場/倉庫庫存</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveSubmit} className="space-y-4">
          
          {/* 基本資訊：品名、分類與縮圖 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">商品名稱 *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full min-h-[44px] bg-surface-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">商品分類</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full min-h-[44px] bg-surface-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-sm font-black text-slate-900 focus:outline-none focus:border-rose-400"
                >
                  {categories.filter(c => c !== '全部').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 圖片上傳與預覽 */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">商品圖片</label>
              <div className="relative aspect-square bg-surface-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-rose-300 transition">
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white rounded-full p-1 text-xs"
                    >
                      <Icons.Close className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-2 text-center">
                    <Icons.Image className="w-7 h-7 text-slate-300 mb-1" />
                    <span className="text-[10px] text-slate-500 font-bold">點此上傳照片</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* 🌟 快速批次統一套用列 (售價 / 成本 / 主理人) */}
          <div className="bg-purple-50/60 p-3 rounded-2xl border-2 border-purple-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-black text-purple-950 flex items-center gap-1">
                <span>批次統一設定所有尺寸：</span>
                <span className="text-[10px] text-purple-700 font-bold">(輸入後一鍵更新下方全部規格)</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="統一售價"
                  value={batchPrice}
                  onChange={e => setBatchPrice(e.target.value)}
                  className="w-full bg-white border border-purple-200 rounded-xl px-2 py-1 text-xs font-mono font-black text-rose-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyBatchPrice}
                  className="px-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-black whitespace-nowrap shadow-sm"
                >
                  套用
                </button>
              </div>

              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="統一成本"
                  value={batchCost}
                  onChange={e => setBatchCost(e.target.value)}
                  className="w-full bg-white border border-purple-200 rounded-xl px-2 py-1 text-xs font-mono font-black text-amber-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyBatchCost}
                  className="px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-black whitespace-nowrap shadow-sm"
                >
                  套用
                </button>
              </div>

              <div>
                <select
                  defaultValue=""
                  onChange={e => handleApplyBatchOwner(e.target.value)}
                  className="w-full bg-white border border-purple-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="" disabled>統一套用主理人 ▾</option>
                  {owners.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 🌟 尺寸規格與即時庫存編輯列表 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1">
                <span>尺寸規格明細與庫存數量</span>
                <span className="text-slate-400 font-bold">({skus.length} 個規格)</span>
              </label>
              <button
                type="button"
                onClick={handleAddSku}
                className="text-xs font-black text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition flex items-center gap-1"
              >
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>+ 新增尺寸規格</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {skus.map((sku, idx) => (
                <div key={sku.sku_id || idx} className="bg-surface-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs animate-in fade-in">
                  
                  {/* 第一列：尺寸名稱、售價、成本、主理人、刪除 */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <span className="text-[10px] font-black text-slate-400 block mb-0.5">尺寸/規格</span>
                      <input
                        type="text"
                        placeholder="例: S / M / L"
                        value={sku.variant_name}
                        onChange={e => updateSku(idx, 'variant_name', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-black text-slate-900 text-xs focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    <div className="col-span-2">
                      <span className="text-[10px] font-black text-slate-400 block mb-0.5">售價</span>
                      <input
                        type="number"
                        value={sku.price}
                        onChange={e => updateSku(idx, 'price', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-mono font-black text-rose-600 text-xs focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    <div className="col-span-2">
                      <span className="text-[10px] font-black text-slate-400 block mb-0.5">成本</span>
                      <input
                        type="number"
                        value={sku.cost}
                        onChange={e => updateSku(idx, 'cost', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-mono font-black text-amber-700 text-xs focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    <div className="col-span-4">
                      <span className="text-[10px] font-black text-slate-400 block mb-0.5">貨品歸屬主理人</span>
                      <select
                        value={sku.owner}
                        onChange={e => updateSku(idx, 'owner', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-900 text-xs focus:outline-none"
                      >
                        {owners.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 flex justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveSku(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                        title="刪除此尺寸"
                      >
                        <Icons.Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 第二列：倉庫與現場庫存加減調控 */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                    
                    {/* 倉庫存量 */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-500">家內倉庫:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustQty(idx, 'home_qty', -1)}
                          className="w-6 h-6 rounded-lg bg-surface-50 border border-slate-200 text-slate-700 font-black flex items-center justify-center hover:bg-slate-100"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={sku.home_qty}
                          onChange={e => updateSku(idx, 'home_qty', Math.max(0, Number(e.target.value) || 0))}
                          className="w-12 text-center font-mono font-black text-slate-900 text-xs border border-slate-200 rounded-lg py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => adjustQty(idx, 'home_qty', 1)}
                          className="w-6 h-6 rounded-lg bg-surface-50 border border-slate-200 text-slate-700 font-black flex items-center justify-center hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 現場存量 */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-500">市集現場:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustQty(idx, 'stall_qty', -1)}
                          className="w-6 h-6 rounded-lg bg-surface-50 border border-slate-200 text-slate-700 font-black flex items-center justify-center hover:bg-slate-100"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={sku.stall_qty}
                          onChange={e => updateSku(idx, 'stall_qty', Math.max(0, Number(e.target.value) || 0))}
                          className="w-12 text-center font-mono font-black text-rose-600 text-xs border border-slate-200 rounded-lg py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => adjustQty(idx, 'stall_qty', 1)}
                          className="w-6 h-6 rounded-lg bg-surface-50 border border-slate-200 text-slate-700 font-black flex items-center justify-center hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* 底部操作按鈕 */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm(`確定要徹底刪除商品「${product.name}」與其所有尺寸資料嗎？`)) {
                  onDeleteProduct(product.product_id);
                  onClose();
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-black flex items-center gap-1 px-3 py-2"
            >
              <Icons.Trash className="w-4 h-4" />
              <span>刪除整個商品</span>
            </button>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none min-h-[44px] px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-1.5"
              >
                <Icons.Check className="w-4 h-4 text-white" />
                <span>{isSubmitting ? '儲存中...' : '儲存修改'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
