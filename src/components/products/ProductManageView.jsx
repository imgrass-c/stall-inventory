import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '../common/Icons';
import { compressImageFile, exportToCsv } from '../../utils/formatters';
import { realtime, STORAGE_KEYS } from '../../services/realtime';

const DEFAULT_CLOTHING_SIZES = ['S', 'M', 'L', 'XL', '2XL', 'Free Size'];
const BASE_CATEGORIES = ['衣服', '配件', '文創周邊', '帽子/包袋'];
const BASE_OWNERS = ['攤位公家', '主理人 A', '主理人 B'];

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

  // 目前登入建檔者名稱
  const currentCreatorName = useMemo(() => {
    return user?.name || (user?.email ? user.email.split('@')[0] : '攤位公家');
  }, [user]);

  // 動態分類與主理人名單
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOCAL_CATEGORIES);
      return stored ? JSON.parse(stored) : BASE_CATEGORIES;
    } catch { return BASE_CATEGORIES; }
  });
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [customOwners, setCustomOwners] = useState(BASE_OWNERS);

  // 新增分類 / 新增主理人輸入彈窗
  const [newCatInput, setNewCatInput] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newOwnerInput, setNewOwnerInput] = useState('');
  const [showNewOwnerInput, setShowNewOwnerInput] = useState(false);

  // 新增商品表單狀態
  const [name, setName] = useState('');
  const [category, setCategory] = useState('衣服');
  const [basePrice, setBasePrice] = useState(590);
  const [baseCost, setBaseCost] = useState(250);
  const [defaultOwner, setDefaultOwner] = useState(currentCreatorName);
  const [imageUrl, setImageUrl] = useState('');
  const [skus, setSkus] = useState([
    { variant_name: 'Free Size', price: 590, cost: 250, home_qty: 20, owner: currentCreatorName }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當登入使用者變更時，自動更新預設主理人
  useEffect(() => {
    if (currentCreatorName) {
      setDefaultOwner(currentCreatorName);
      setSkus(prev => prev.map(s => ({
        ...s,
        owner: s.owner === '攤位公家' ? currentCreatorName : s.owner
      })));
    }
  }, [currentCreatorName]);

  // 監聽成員名單，將已核准成員/編輯者動態加入主理人歸屬清單
  useEffect(() => {
    const unsub = realtime.subscribeUsers((usersList) => {
      setRegisteredUsers(usersList || []);
      const memberNames = (usersList || [])
        .filter(u => u.status === '已核准')
        .map(u => u.name || u.email.split('@')[0]);
      
      const mergedOwners = Array.from(new Set([...BASE_OWNERS, currentCreatorName, ...memberNames]));
      setCustomOwners(mergedOwners);
    });
    return () => unsub();
  }, [currentCreatorName]);

  const allCategories = useMemo(() => {
    const set = new Set(['全部', ...customCategories]);
    products.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
  }, [products, customCategories]);

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

  // 新增自訂分類
  const handleAddNewCategory = () => {
    if (!newCatInput.trim()) return;
    const cat = newCatInput.trim();
    if (!customCategories.includes(cat)) {
      const updated = [...customCategories, cat];
      setCustomCategories(updated);
      localStorage.setItem(STORAGE_KEYS.LOCAL_CATEGORIES, JSON.stringify(updated));
    }
    setCategory(cat);
    setNewCatInput('');
    setShowNewCatInput(false);
  };

  // 新增自訂主理人
  const handleAddNewOwner = () => {
    if (!newOwnerInput.trim()) return;
    const owner = newOwnerInput.trim();
    if (!customOwners.includes(owner)) {
      setCustomOwners(prev => [...prev, owner]);
    }
    setDefaultOwner(owner);
    setNewOwnerInput('');
    setShowNewOwnerInput(false);
  };

  // 開啟建立 Modal 時初始化以目前建檔人為預設
  const handleOpenAddModal = () => {
    const creator = currentCreatorName;
    setDefaultOwner(creator);
    setSkus([{ variant_name: 'Free Size', price: basePrice, cost: baseCost, home_qty: 20, owner: creator }]);
    setShowAddModal(true);
  };

  // 一鍵帶入標準服飾尺寸
  const handleApplyClothingPreset = () => {
    const creator = defaultOwner || currentCreatorName;
    const newSkus = DEFAULT_CLOTHING_SIZES.map(sz => ({
      variant_name: sz,
      price: Number(basePrice) || 590,
      cost: Number(baseCost) || 250,
      home_qty: 10,
      owner: creator
    }));
    setSkus(newSkus);
  };

  const handleAddSkuRow = () => {
    const creator = defaultOwner || currentCreatorName;
    setSkus(prev => [
      ...prev,
      { variant_name: '', price: Number(basePrice) || 590, cost: Number(baseCost) || 250, home_qty: 10, owner: creator }
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
        category: category.trim() || '衣服',
        image_url: imageUrl || '',
        creator: currentCreatorName,
        created_at: new Date().toISOString()
      };

      const skusPayload = skus.map((s, idx) => ({
        sku_id: `${productId}-SKU${idx + 1}`,
        product_id: productId,
        product_name: name.trim(),
        variant_name: s.variant_name.trim() || '預設尺寸',
        price: Number(s.price) || 0,
        cost: Number(s.cost) || 0,
        home_qty: Number(s.home_qty) || 0,
        stall_qty: 0,
        total_qty: Number(s.home_qty) || 0,
        owner: s.owner || defaultOwner || currentCreatorName || '攤位公家',
        created_at: new Date().toISOString()
      }));

      await onAddProduct(productPayload, skusPayload);
      setShowAddModal(false);
      setName('');
      setImageUrl('');
      setSkus([{ variant_name: 'Free Size', price: 590, cost: 250, home_qty: 20, owner: currentCreatorName }]);
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
    <div className="flex-1 bg-surface-50 p-3.5 sm:p-6 overflow-y-auto space-y-4 max-w-6xl mx-auto w-full pb-28 md:pb-6">
      {/* 頂部操作列 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">商品名冊與服飾建檔</h2>
          <p className="text-xs text-slate-400 font-bold">建立衣服圖樣、多尺寸規格，預設由登入建檔者為貨品歸屬主理人</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
          >
            <Icons.DownloadFile className="w-4 h-4 text-slate-500" />
            <span>匯出名冊</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2"
          >
            <Icons.Plus className="w-5 h-5 text-white" />
            <span>建立新服飾/商品</span>
          </button>
        </div>
      </div>

      {/* 搜尋與分類列 */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋商品名稱 (如: 貓貓白色, 情緒T)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-surface-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-400"
          />
        </div>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-surface-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-black text-slate-700 focus:outline-none"
        >
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* 商品卡片清單 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => {
          const skus = productSkusMap[product.product_id] || [];
          const totalHome = skus.reduce((s, i) => s + (i.home_qty || 0), 0);
          const totalStall = skus.reduce((s, i) => s + (i.stall_qty || 0), 0);

          return (
            <div key={product.product_id} className="bg-white border border-slate-200 rounded-3xl p-4 shadow-card space-y-3 flex flex-col justify-between">
              <div className="flex gap-3">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-100">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.Image className="w-8 h-8 text-slate-300" />
                  )}
                </div>

                <div className="overflow-hidden flex-1">
                  <span className="bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-rose-100">
                    {product.category || '衣服'}
                  </span>
                  <h4 className="font-black text-slate-900 text-sm sm:text-base mt-1 truncate">{product.name}</h4>
                  <div className="text-[11px] text-slate-500 font-bold mt-1">
                    倉庫: <span className="text-slate-900 font-black">{totalHome}</span> 件 • 現場: <span className="text-rose-600 font-black">{totalStall}</span> 件
                  </div>
                </div>
              </div>

              {/* 尺寸規格標籤列表 */}
              <div className="bg-surface-50 rounded-2xl p-3 border border-slate-100 space-y-2">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">尺寸規格明細 ({skus.length} 個尺寸)</div>
                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                  {skus.map(sku => (
                    <div key={sku.sku_id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="font-black text-slate-900 text-xs sm:text-sm">{sku.variant_name}</span>
                        <span className="text-purple-600 font-bold ml-1.5 text-[11px]">({sku.owner})</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-500 font-bold">進${sku.cost} / 售${sku.price}</span>
                        <span className="bg-slate-100 text-slate-900 font-black px-2 py-0.5 rounded-lg text-xs">
                          倉:{sku.home_qty} / 現:{sku.stall_qty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    if (confirm(`確定要刪除「${product.name}」及其所有尺寸規格嗎？`)) {
                      onDeleteProduct(product.product_id);
                    }
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-black flex items-center gap-1 transition p-1.5"
                >
                  <Icons.Trash className="w-4 h-4" />
                  <span>刪除此款商品</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 👕 建立新商品 / 服飾 Modal (支援自訂分類與預設目前建檔主理人) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3.5 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">建立新服飾 / 商品母檔</h3>
                <p className="text-xs text-slate-400 font-bold">
                  預設歸屬建檔人：<span className="text-purple-700 font-black">【{currentCreatorName}】</span>
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="space-y-4">
              
              {/* 商品名稱與分類 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">圖樣/商品名稱 *</label>
                  <input
                    type="text"
                    required
                    placeholder="例：情緒T - 黑色 / 貓貓白色"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full min-h-[46px] bg-surface-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-400"
                  />
                </div>

                {/* 商品分類 (支援自訂新增分類) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-black text-slate-700">商品分類</label>
                    <button
                      type="button"
                      onClick={() => setShowNewCatInput(!showNewCatInput)}
                      className="text-[11px] font-black text-rose-600 hover:text-rose-700"
                    >
                      {showNewCatInput ? '選擇既有分類' : '+ 新增分類'}
                    </button>
                  </div>

                  {showNewCatInput ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="輸入新分類名稱..."
                        value={newCatInput}
                        onChange={e => setNewCatInput(e.target.value)}
                        className="flex-1 min-h-[46px] bg-white border-2 border-rose-300 rounded-2xl px-3 text-xs font-black text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        className="px-3 min-h-[46px] bg-rose-500 text-white rounded-2xl text-xs font-black"
                      >
                        加入
                      </button>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full min-h-[46px] bg-surface-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm font-black text-slate-900 focus:outline-none focus:border-rose-400"
                    >
                      {customCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* 預設售價、成本與主理人 (快速帶入所有尺寸) */}
              <div className="bg-surface-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-slate-700">統一設定基礎售價與歸屬</span>
                  <button
                    type="button"
                    onClick={() => setShowNewOwnerInput(!showNewOwnerInput)}
                    className="text-[10px] font-black text-purple-600 hover:text-purple-700"
                  >
                    {showNewOwnerInput ? '選擇既有人員' : '+ 自訂主理人/成員'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">預設售價</span>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={e => setBasePrice(e.target.value)}
                      className="w-full min-h-[40px] bg-white border border-slate-200 rounded-xl px-2 text-center text-sm font-black font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">進貨成本</span>
                    <input
                      type="number"
                      value={baseCost}
                      onChange={e => setBaseCost(e.target.value)}
                      className="w-full min-h-[40px] bg-white border border-slate-200 rounded-xl px-2 text-center text-sm font-black font-mono text-amber-700"
                    />
                  </div>

                  {/* 貨品歸屬人員 (預設目前登入建檔者) */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">貨品歸屬主理人</span>
                    {showNewOwnerInput ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="姓名..."
                          value={newOwnerInput}
                          onChange={e => setNewOwnerInput(e.target.value)}
                          className="w-full min-h-[40px] bg-white border-2 border-purple-300 rounded-xl px-2 text-xs font-black text-purple-900"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewOwner}
                          className="px-2 min-h-[40px] bg-purple-600 text-white rounded-xl text-[10px] font-black"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <select
                        value={defaultOwner}
                        onChange={e => setDefaultOwner(e.target.value)}
                        className="w-full min-h-[40px] bg-white border border-slate-200 rounded-xl px-1 text-center text-xs font-black text-purple-700"
                      >
                        {customOwners.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* 商品縮圖上傳 */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">商品縮圖 (支援相機拍照或相簿)</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200 flex-shrink-0">
                    {imageUrl ? <img src={imageUrl} alt="預覽" className="w-full h-full object-cover" /> : <Icons.Camera className="w-6 h-6 text-slate-400" />}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* 尺寸規格 SKU 清單編輯 */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <label className="text-xs font-black text-slate-900">尺寸規格與倉庫初始存量</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApplyClothingPreset}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-sm"
                    >
                      <Icons.Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>一鍵帶入服飾尺寸 (S~2XL)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSkuRow}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition flex items-center gap-1"
                    >
                      <Icons.Plus className="w-3.5 h-3.5" />
                      <span>加尺寸</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {skus.map((sku, idx) => (
                    <div key={idx} className="bg-surface-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="尺寸 (例: M / L / 黑M)"
                          value={sku.variant_name}
                          onChange={e => handleUpdateSkuRow(idx, 'variant_name', e.target.value)}
                          className="flex-1 min-h-[38px] bg-white border border-slate-200 rounded-xl px-3 text-xs font-black text-slate-900"
                        />
                        <select
                          value={sku.owner}
                          onChange={e => handleUpdateSkuRow(idx, 'owner', e.target.value)}
                          className="min-h-[38px] bg-white border border-slate-200 rounded-xl px-2 text-xs font-black text-purple-700"
                        >
                          {customOwners.map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                        {skus.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkuRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1.5"
                          >
                            <Icons.Close className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">售價</span>
                          <input
                            type="number"
                            value={sku.price}
                            onChange={e => handleUpdateSkuRow(idx, 'price', e.target.value)}
                            className="w-full min-h-[36px] bg-white border border-slate-200 rounded-xl p-1 text-center font-mono font-black text-slate-900"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">底價成本</span>
                          <input
                            type="number"
                            value={sku.cost}
                            onChange={e => handleUpdateSkuRow(idx, 'cost', e.target.value)}
                            className="w-full min-h-[36px] bg-white border border-slate-200 rounded-xl p-1 text-center font-mono font-black text-amber-700"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">倉庫初始進貨量</span>
                          <input
                            type="number"
                            value={sku.home_qty}
                            onChange={e => handleUpdateSkuRow(idx, 'home_qty', e.target.value)}
                            className="w-full min-h-[36px] bg-white border border-slate-200 rounded-xl p-1 text-center font-mono font-black text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[48px] bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2"
                >
                  <Icons.Check className="w-5 h-5 text-white" />
                  <span>{isSubmitting ? '建立中...' : '確認完成建立'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
