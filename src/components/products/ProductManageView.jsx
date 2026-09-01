import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '../common/Icons';
import { compressImageFile, exportToCsv } from '../../utils/formatters';
import { realtime, STORAGE_KEYS } from '../../services/realtime';
import EditProductModal from './EditProductModal';

const DEFAULT_CLOTHING_SIZES = ['S', 'M', 'L', 'XL', '2XL', 'Free Size'];
const BASE_CATEGORIES = ['衣服', '配件', '文創周邊', '帽子/包袋'];
const BASE_OWNERS = ['攤位公家', '主理人 A', '主理人 B'];

export default function ProductManageView({
  onAddProduct,
  onUpdateProduct,
  inventory,
  products,
  onSyncSheets,
  onClearData,
  onDeleteProduct,
  onDeleteSku,
  user
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
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

  // 🌟 新增商品表單狀態 (預設售價調整為 800，成本預設為 300)
  const [name, setName] = useState('');
  const [category, setCategory] = useState('衣服');
  const [basePrice, setBasePrice] = useState(800);
  const [baseCost, setBaseCost] = useState(300);
  const [defaultOwner, setDefaultOwner] = useState(currentCreatorName);
  const [imageUrl, setImageUrl] = useState('');
  const [skus, setSkus] = useState([
    { variant_name: 'Free Size', price: 800, cost: 300, home_qty: 20, owner: currentCreatorName }
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
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (productSkusMap[p.product_id] || []).some(s => s.variant_name && s.variant_name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, filterCategory, searchTerm, productSkusMap]);

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

  // 新增自訂主理人並同步連動下方尺寸清單
  const handleAddNewOwner = () => {
    if (!newOwnerInput.trim()) return;
    const owner = newOwnerInput.trim();
    if (!customOwners.includes(owner)) {
      setCustomOwners(prev => [...prev, owner]);
    }
    setDefaultOwner(owner);
    setSkus(prev => prev.map(s => ({ ...s, owner: owner })));
    setNewOwnerInput('');
    setShowNewOwnerInput(false);
  };

  // 🌟 連動更新基礎售價（同步更新下方所有尺寸規格）
  const handleBasePriceChange = (val) => {
    setBasePrice(val);
    const num = val === '' ? '' : (Number(val) || 0);
    setSkus(prev => prev.map(s => ({ ...s, price: num })));
  };

  // 🌟 連動更新基礎成本（同步更新下方所有尺寸規格）
  const handleBaseCostChange = (val) => {
    setBaseCost(val);
    const num = val === '' ? '' : (Number(val) || 0);
    setSkus(prev => prev.map(s => ({ ...s, cost: num })));
  };

  // 🌟 連動更新預設歸屬主理人（同步更新下方所有尺寸規格）
  const handleDefaultOwnerChange = (val) => {
    setDefaultOwner(val);
    setSkus(prev => prev.map(s => ({ ...s, owner: val })));
  };

  // 開啟建立 Modal 時初始化以目前建檔人為預設，售價 800，成本 300
  const handleOpenAddModal = () => {
    const creator = currentCreatorName;
    setDefaultOwner(creator);
    setBasePrice(800);
    setBaseCost(300);
    setSkus([{ variant_name: 'Free Size', price: 800, cost: 300, home_qty: 20, owner: creator }]);
    setShowAddModal(true);
  };

  // 🌟 一鍵帶入標準服飾尺寸 (套用當前 basePrice 與 baseCost)
  const handleApplyClothingPreset = () => {
    const creator = defaultOwner || currentCreatorName;
    const currentPrice = Number(basePrice) || 800;
    const currentCost = Number(baseCost) || 300;
    const newSkus = DEFAULT_CLOTHING_SIZES.map(sz => ({
      variant_name: sz,
      price: currentPrice,
      cost: currentCost,
      home_qty: 10,
      owner: creator
    }));
    setSkus(newSkus);
  };

  const handleAddSkuRow = () => {
    const creator = defaultOwner || currentCreatorName;
    setSkus(prev => [
      ...prev,
      { variant_name: '', price: Number(basePrice) || 800, cost: Number(baseCost) || 300, home_qty: 10, owner: creator }
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
        price: Number(s.price) || 800,
        cost: Number(s.cost) || 300,
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
      setSkus([{ variant_name: 'Free Size', price: 800, cost: 300, home_qty: 20, owner: currentCreatorName }]);
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
          <p className="text-xs text-slate-400 font-bold">點選商品卡片可直接編輯品名、追加/刪除尺寸、調整庫存與售價</p>
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
            placeholder="搜尋商品名稱或尺寸 (如: 貓貓白色, 情緒T, L)..."
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

      {/* 🌟 商品名冊卡片清單 (支援點擊進入編輯) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => {
          const skus = productSkusMap[product.product_id] || [];
          const totalHome = skus.reduce((s, i) => s + (i.home_qty || 0), 0);
          const totalStall = skus.reduce((s, i) => s + (i.stall_qty || 0), 0);

          return (
            <div
              key={product.product_id}
              className="bg-white border-2 border-slate-200 hover:border-rose-300 rounded-3xl p-4 shadow-card space-y-3 flex flex-col justify-between transition group"
            >
              {/* 商品基本縮圖與點擊編輯標籤 */}
              <div
                onClick={() => setEditingProduct(product)}
                className="flex gap-3 cursor-pointer"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-100 relative group-hover:shadow-md transition">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.Image className="w-8 h-8 text-slate-300" />
                  )}
                  <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white rounded p-0.5 text-[10px]">
                    <Icons.Edit className="w-3 h-3" />
                  </span>
                </div>

                <div className="overflow-hidden flex-1">
                  <div className="flex justify-between items-start">
                    <span className="bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-rose-100">
                      {product.category || '衣服'}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 group-hover:underline flex items-center gap-0.5">
                      <Icons.Edit className="w-3 h-3" />
                      <span>編輯</span>
                    </span>
                  </div>
                  
                  <h4 className="font-black text-slate-900 text-sm sm:text-base mt-1 truncate group-hover:text-rose-600 transition">
                    {product.name}
                  </h4>
                  <div className="text-[11px] text-slate-500 font-bold mt-1">
                    倉庫: <span className="text-slate-900 font-black">{totalHome}</span> 件 • 現場: <span className="text-rose-600 font-black">{totalStall}</span> 件
                  </div>
                </div>
              </div>

              {/* 尺寸規格標籤列表 */}
              <div className="bg-surface-50 rounded-2xl p-3 border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <span>尺寸規格明細 ({skus.length} 個尺寸)</span>
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="text-purple-600 hover:text-purple-700 font-bold"
                  >
                    + 調整數量/尺寸
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                  {skus.map(sku => (
                    <div
                      key={sku.sku_id}
                      onClick={() => setEditingProduct(product)}
                      className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 text-xs cursor-pointer hover:bg-purple-50/40 transition"
                    >
                      <div>
                        <span className="font-black text-slate-900 text-xs sm:text-sm">{sku.variant_name}</span>
                        <span className="text-purple-600 font-bold ml-1.5 text-[11px]">({sku.owner})</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-500 font-bold text-[11px]">進${sku.cost} / 售${sku.price}</span>
                        <span className="bg-slate-100 text-slate-900 font-black px-2 py-0.5 rounded-lg text-xs">
                          倉:<span className="text-slate-900">{sku.home_qty}</span> / 現:<span className="text-rose-600">{sku.stall_qty}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 底部卡片按鈕 */}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <button
                  onClick={() => setEditingProduct(product)}
                  className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl font-black flex items-center gap-1 transition"
                >
                  <Icons.Edit className="w-3.5 h-3.5 text-rose-600" />
                  <span>點此編輯商品與庫存</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm(`確定要刪除「${product.name}」及其所有尺寸規格嗎？`)) {
                      onDeleteProduct(product.product_id);
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-rose-600 font-black flex items-center gap-1 transition p-1.5"
                >
                  <Icons.Trash className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ✏️ 點開編輯商品與庫存 Modal */}
      {/* ========================================================================= */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          initialSkus={productSkusMap[editingProduct.product_id] || []}
          categories={customCategories}
          owners={customOwners}
          currentCreatorName={currentCreatorName}
          onSave={onUpdateProduct}
          onDeleteProduct={onDeleteProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* 👕 建立新商品 / 服飾 Modal (支援售價與成本即時連動下方所有規格) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3.5 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">建立新服飾 / 商品母檔</h3>
                <p className="text-xs text-slate-400 font-bold">
                  預設歸屬建檔人：<span className="text-purple-700 font-black">【{defaultOwner}】</span>
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

                {/* 商品分類 */}
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

              {/* 🌟 統一設定基礎售價 (800)、成本 (300) 與主理人 (即時連動下方所有規格尺寸) */}
              <div className="bg-purple-50/70 p-3.5 rounded-2xl border-2 border-purple-200 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-purple-950">統一設定售價與歸屬</span>
                    <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-1.5 py-0.2 rounded-md">即時連動下方尺寸</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewOwnerInput(!showNewOwnerInput)}
                    className="text-[10px] font-black text-purple-700 hover:text-purple-900 underline"
                  >
                    {showNewOwnerInput ? '選擇既有人員' : '+ 自訂主理人'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-purple-900 mb-1">統一售價 (元)</label>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={e => handleBasePriceChange(e.target.value)}
                      placeholder="800"
                      className="w-full bg-white border-2 border-purple-200 focus:border-purple-500 rounded-xl px-2.5 py-1.5 text-xs font-mono font-black text-rose-600 focus:outline-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-purple-900 mb-1">統一成本 (元)</label>
                    <input
                      type="number"
                      value={baseCost}
                      onChange={e => handleBaseCostChange(e.target.value)}
                      placeholder="300"
                      className="w-full bg-white border-2 border-purple-200 focus:border-purple-500 rounded-xl px-2.5 py-1.5 text-xs font-mono font-black text-amber-700 focus:outline-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-purple-900 mb-1">歸屬主理人</label>
                    {showNewOwnerInput ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="姓名..."
                          value={newOwnerInput}
                          onChange={e => setNewOwnerInput(e.target.value)}
                          className="w-full bg-white border border-purple-300 rounded-xl px-2 py-1 text-xs font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewOwner}
                          className="bg-purple-600 text-white rounded-xl px-2 text-xs font-black"
                        >
                          加
                        </button>
                      </div>
                    ) : (
                      <select
                        value={defaultOwner}
                        onChange={e => handleDefaultOwnerChange(e.target.value)}
                        className="w-full bg-white border-2 border-purple-200 focus:border-purple-500 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none shadow-sm"
                      >
                        {customOwners.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* 圖片上傳 */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">商品展示照片 (縮圖)</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-surface-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                    {imageUrl ? (
                      <>
                        <img src={imageUrl} alt="預覽" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-0.5 text-xs"
                        >
                          <Icons.Close className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <Icons.Image className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <label className="flex-1 min-h-[46px] bg-surface-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-700 transition">
                    <Icons.Image className="w-4 h-4 text-slate-400" />
                    <span>{imageUrl ? '更換照片' : '選擇照片 (自動壓縮)'}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* 尺寸 / 規格明細設定 (支援一鍵服飾標準尺寸) */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900">尺寸規格明細設定 ({skus.length} 個尺寸)：</span>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleApplyClothingPreset}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-black transition flex items-center gap-1 shadow-sm"
                    >
                      <Icons.Products className="w-3 h-3" />
                      <span>+ 一鍵套用衣服標準尺碼 (S~2XL)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSkuRow}
                      className="px-2.5 py-1 bg-surface-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-black transition"
                    >
                      + 新增尺寸
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {skus.map((sku, idx) => (
                    <div key={idx} className="bg-surface-50 p-2.5 rounded-2xl border border-slate-200 flex items-center gap-2 text-xs animate-in fade-in">
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block font-bold">尺寸/規格</span>
                        <input
                          type="text"
                          required
                          placeholder="例: S / M / L"
                          value={sku.variant_name}
                          onChange={e => handleUpdateSkuRow(idx, 'variant_name', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1 font-black text-slate-900 text-xs"
                        />
                      </div>

                      <div className="w-16">
                        <span className="text-[10px] text-slate-400 block font-bold">售價</span>
                        <input
                          type="number"
                          value={sku.price}
                          onChange={e => handleUpdateSkuRow(idx, 'price', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-1.5 py-1 font-mono font-black text-rose-600 text-xs"
                        />
                      </div>

                      <div className="w-16">
                        <span className="text-[10px] text-slate-400 block font-bold">成本</span>
                        <input
                          type="number"
                          value={sku.cost}
                          onChange={e => handleUpdateSkuRow(idx, 'cost', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-1.5 py-1 font-mono font-black text-amber-700 text-xs"
                        />
                      </div>

                      <div className="w-16">
                        <span className="text-[10px] text-slate-400 block font-bold">家內庫存</span>
                        <input
                          type="number"
                          value={sku.home_qty}
                          onChange={e => handleUpdateSkuRow(idx, 'home_qty', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-1.5 py-1 font-mono font-black text-slate-900 text-xs"
                        />
                      </div>

                      <div className="w-24">
                        <span className="text-[10px] text-slate-400 block font-bold">歸屬主理人</span>
                        <select
                          value={sku.owner}
                          onChange={e => handleUpdateSkuRow(idx, 'owner', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-1 py-1 text-[11px] font-bold text-slate-900"
                        >
                          {customOwners.map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>

                      {skus.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSkuRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 pt-3"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 底部確認按鈕 */}
              <div className="pt-2 flex gap-2">
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
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <Icons.Check className="w-4 h-4 text-white" />
                  <span>{isSubmitting ? '建立中...' : '確認完成建檔'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
