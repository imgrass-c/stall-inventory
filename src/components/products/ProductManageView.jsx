import React, { useState, useMemo } from 'react';
import { Icons } from '../common/Icons';
import { compressImageFile, exportToCsv } from '../../utils/formatters';

export default function ProductManageView({
  onAddProduct,
  inventory,
  products,
  onSyncSheets,
  onClearData,
  onDeleteProduct,
  onDeleteSku,
  user
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('全部');

  // 新增商品表單狀態
  const [name, setName] = useState('');
  const [category, setCategory] = useState('文創商品');
  const [imageUrl, setImageUrl] = useState('');
  const [skus, setSkus] = useState([
    { variant_name: '預設規格', price: 100, cost: 40, home_qty: 10, stall_qty: 5, owner: '攤位公家' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(['全部']);
    products.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
  }, [products]);

  const productSkusMap = useMemo(() => {
    const map = {};
    inventory.forEach(inv => {
      if (!map[inv.product_id]) map[inv.product_id] = [];
      map[inv.product_id].push(inv);
    });
    return map;
  }, [inventory]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = filterCategory === '全部' || p.category === filterCategory;
      const matchSearch = !searchTerm.trim() ||
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, filterCategory, searchTerm]);

  const handleAddSkuRow = () => {
    setSkus(prev => [
      ...prev,
      { variant_name: '', price: 100, cost: 40, home_qty: 0, stall_qty: 0, owner: '攤位公家' }
    ]);
  };

  const handleUpdateSkuRow = (idx, field, val) => {
    setSkus(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleRemoveSkuRow = (idx) => {
    if (skus.length <= 1) return;
    setSkus(prev => prev.filter((_, i) => i !== idx));
  };

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

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const productId = `PROD-${Date.now()}`;
      const productPayload = {
        product_id: productId,
        name: name.trim(),
        category: category.trim(),
        image_url: imageUrl,
        created_at: new Date().toISOString()
      };

      const skusPayload = skus.map((s, idx) => ({
        sku_id: `${productId}-SKU${idx + 1}`,
        product_id: productId,
        product_name: name.trim(),
        variant_name: s.variant_name.trim() || '預設規格',
        price: Number(s.price) || 0,
        cost: Number(s.cost) || 0,
        home_qty: Number(s.home_qty) || 0,
        stall_qty: Number(s.stall_qty) || 0,
        total_qty: (Number(s.home_qty) || 0) + (Number(s.stall_qty) || 0),
        owner: s.owner || '攤位公家',
        created_at: new Date().toISOString()
      }));

      await onAddProduct(productPayload, skusPayload);
      setShowAddModal(false);
      setName('');
      setImageUrl('');
      setSkus([{ variant_name: '預設規格', price: 100, cost: 40, home_qty: 10, stall_qty: 5, owner: '攤位公家' }]);
    } catch(err) {
      alert("建立商品失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = ['商品 ID', '商品名稱', '分類', '規格 SKU 數量', '建立時間'];
    const rows = products.map(p => [
      p.product_id,
      p.name,
      p.category,
      (productSkusMap[p.product_id] || []).length,
      p.created_at || ''
    ]);
    exportToCsv(`感情失敗之友會_商品名冊_${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="flex-1 bg-surface-50 p-4 sm:p-6 overflow-y-auto space-y-4 max-w-6xl mx-auto w-full">
      {/* 頂部操作列 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">商品名冊與建檔管理</h2>
          <p className="text-xs text-slate-400 font-bold">建立商品母檔、多規格 SKU 與主理人分帳設定</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Icons.DownloadFile className="w-4 h-4 text-slate-500" />
            <span>匯出名冊</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
          >
            <Icons.Plus className="w-4 h-4 text-white" />
            <span>建立新商品</span>
          </button>
        </div>
      </div>

      {/* 搜尋與分類列 */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋商品名稱或分類..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-surface-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-400"
          />
        </div>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* 商品卡片清單 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => {
          const skus = productSkusMap[product.product_id] || [];
          return (
            <div key={product.product_id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-card space-y-3 flex flex-col justify-between">
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-100">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.Image className="w-6 h-6 text-slate-300" />
                  )}
                </div>

                <div className="overflow-hidden flex-1">
                  <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[10px] font-black border border-rose-100">
                    {product.category || '一般商品'}
                  </span>
                  <h4 className="font-black text-slate-900 text-sm mt-1 truncate">{product.name}</h4>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{product.product_id}</div>
                </div>
              </div>

              {/* 規格標籤 */}
              <div className="bg-surface-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5 text-xs">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">規格列表 ({skus.length} 種)</div>
                {skus.map(sku => (
                  <div key={sku.sku_id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-[11px]">
                    <div>
                      <span className="font-black text-slate-800">{sku.variant_name}</span>
                      <span className="text-purple-600 font-bold ml-1.5">({sku.owner})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 font-bold">進${sku.cost} / 售${sku.price}</span>
                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        現:{sku.stall_qty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    if (confirm(`確定要刪除商品「${product.name}」及其所有規格嗎？`)) {
                      onDeleteProduct(product.product_id);
                    }
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 transition p-1"
                >
                  <Icons.Trash className="w-3.5 h-3.5" />
                  <span>刪除商品母檔</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 建立商品 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">建立新商品母檔與規格</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-slate-700 mb-1">商品名稱 *</label>
                  <input
                    type="text"
                    required
                    placeholder="例：感情失敗T恤"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-700 mb-1">商品分類</label>
                  <input
                    type="text"
                    placeholder="例：服飾 / 文創 / 飾品"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1">商品縮圖 (支援手機拍照或上傳)</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 flex-shrink-0">
                    {imageUrl ? <img src={imageUrl} alt="預覽" className="w-full h-full object-cover" /> : <Icons.Camera className="w-5 h-5 text-slate-400" />}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* SKU 規格清單編輯 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-black text-slate-700">商品規格與庫存 (SKU)</label>
                  <button
                    type="button"
                    onClick={handleAddSkuRow}
                    className="text-rose-600 hover:text-rose-700 font-black text-xs flex items-center gap-1"
                  >
                    <Icons.Plus className="w-3.5 h-3.5" />
                    <span>新增規格</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {skus.map((sku, idx) => (
                    <div key={idx} className="bg-surface-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="規格名稱 (例: 白色 L)"
                          value={sku.variant_name}
                          onChange={e => handleUpdateSkuRow(idx, 'variant_name', e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                        />
                        <select
                          value={sku.owner}
                          onChange={e => handleUpdateSkuRow(idx, 'owner', e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-purple-700"
                        >
                          <option value="攤位公家">攤位公家</option>
                          <option value="主理人 A">主理人 A</option>
                          <option value="主理人 B">主理人 B</option>
                        </select>
                        {skus.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkuRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Icons.Close className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">售價</span>
                          <input
                            type="number"
                            value={sku.price}
                            onChange={e => handleUpdateSkuRow(idx, 'price', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono font-black"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">底價成本</span>
                          <input
                            type="number"
                            value={sku.cost}
                            onChange={e => handleUpdateSkuRow(idx, 'cost', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono font-black text-amber-700"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">家內庫存</span>
                          <input
                            type="number"
                            value={sku.home_qty}
                            onChange={e => handleUpdateSkuRow(idx, 'home_qty', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono font-bold"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">現場庫存</span>
                          <input
                            type="number"
                            value={sku.stall_qty}
                            onChange={e => handleUpdateSkuRow(idx, 'stall_qty', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono font-black text-rose-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <Icons.Check className="w-4 h-4 text-white" />
                  <span>{isSubmitting ? '建立中...' : '確認建立商品'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
