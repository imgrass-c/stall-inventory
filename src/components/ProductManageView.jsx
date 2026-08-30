import React, { useState, useRef } from 'react';
import { Camera, Plus, Trash2, CheckCircle2, AlertTriangle, X, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';

function compressImageFile(file, maxDimension = 360, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > h) {
          if (w > maxDimension) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          }
        } else {
          if (h > maxDimension) {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export default function ProductManageView({ onAddProduct, inventory = [], user }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('衣服');
  const [ownerName, setOwnerName] = useState(user?.name || '攤主');
  const [basePrice, setBasePrice] = useState('');
  const [cost, setCost] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const [variants, setVariants] = useState([
    { variantName: 'S', price: '', homeQty: 10, stallQty: 5, safetyStock: 2 },
    { variantName: 'M', price: '', homeQty: 15, stallQty: 8, safetyStock: 3 },
    { variantName: 'L', price: '', homeQty: 15, stallQty: 8, safetyStock: 3 },
    { variantName: 'XL', price: '', homeQty: 10, stallQty: 4, safetyStock: 2 },
    { variantName: '2XL', price: '', homeQty: 5, stallQty: 2, safetyStock: 2 },
  ]);

  const [msg, setMsg] = useState('');

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImageFile(file, 360, 0.75);
      setImageUrl(compressed);
    } catch {
      alert('圖片處理失敗，請改用其他圖片。');
    } finally {
      setIsCompressing(false);
    }
  };

  const updateVariant = (idx, field, val) => {
    setVariants(prev => {
      const c = [...prev];
      c[idx] = { ...c[idx], [field]: val };
      return c;
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !basePrice) return;
    setShowConfirmModal(true);
  };

  const executeConfirmUpload = async () => {
    setIsSubmitting(true);
    try {
      const res = await onAddProduct({
        name: name.trim(),
        category,
        basePrice: Number(basePrice),
        cost: Number(cost || 0),
        image_url: imageUrl,
        variants,
        operator: user ? user.name : 'admin'
      });
      if (res && res.success) {
        setMsg(`商品「${name}」已成功新增！`);
        setName(''); setBasePrice(''); setCost(''); setImageUrl('');
        setShowConfirmModal(false);
        setTimeout(() => setMsg(''), 4000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalStallInit = variants.reduce((s, v) => s + (Number(v.stallQty) || 0), 0);
  const totalHomeInit = variants.reduce((s, v) => s + (Number(v.homeQty) || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      
      {/* 二次確認彈窗 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">確認是否建立上傳此商品？</h3>
                <p className="text-xs text-slate-400">請核對即將寫入資料庫的商品資訊</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-300 shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">{category}</span>
                  <div className="text-sm font-black text-slate-900 mt-0.5">{name}</div>
                  <div className="font-black text-rose-600">NT$ {basePrice}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>規格數量：</span>
                  <strong className="text-slate-900">{variants.length} 種規格 ({variants.map(v => v.variantName).join(' / ')})</strong>
                </div>
                <div className="flex justify-between">
                  <span>初始配置庫存：</span>
                  <span className="font-bold">
                    <span className="text-emerald-700">現場 {totalStallInit} 件</span> / <span className="text-blue-700">家內 {totalHomeInit} 件</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
              >
                ✕ 取消
              </button>
              <button
                type="button"
                onClick={executeConfirmUpload}
                disabled={isSubmitting}
                className="py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>是，確定建立上傳</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-black text-slate-900">新增商品與多規格</h2>
          <p className="text-xs text-slate-500 mt-0.5">系統將自動產生內部編號並即時同步至資料庫</p>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{msg}</span>
          </div>
        )}

        {/* 照片上傳區域 */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          {imageUrl ? (
            <div className="relative group">
              <img src={imageUrl} alt="預覽" className="w-24 h-24 rounded-2xl object-cover border-2 border-rose-500 shadow-md" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-rose-400 bg-white flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-rose-500 transition active:scale-95"
            >
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold">上傳照片</span>
            </div>
          )}

          <div className="text-left space-y-1">
            <div className="text-xs font-black text-slate-800">📸 商品辨識照片（選填）</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              上傳商品實體照或設計圖，系統將自動進行輕量化壓縮。
              <strong className="text-rose-600 ml-1">現場收銀台會顯示縮圖，方便小幫手快速核對防呆！</strong>
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-rose-500 hover:underline inline-block mt-1"
            >
              {isCompressing ? '處理壓縮中...' : imageUrl ? '更換其他照片' : '選擇照片或手機拍照'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">商品名稱 *</label>
            <input
              type="text"
              placeholder="例如：限定短T"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">分類</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="衣服">衣服</option>
              <option value="吊飾">吊飾</option>
              <option value="貼紙">貼紙</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">歸屬攤主 / 夥伴 *</label>
            <input
              type="text"
              placeholder="例如：小明 / 攤主A"
              value={ownerName || ''}
              onChange={e => setOwnerName(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-purple-700 focus:outline-none focus:border-purple-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">基準售價 (NT$) *</label>
            <input
              type="number"
              placeholder="590"
              value={basePrice}
              onChange={e => setBasePrice(e.target.value)}
              required
              min="1"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-900 focus:outline-none focus:border-rose-400"
            />
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-slate-100">
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs font-black text-slate-900">
              規格尺寸、成本與初始庫存配置：
            </label>
            <span className="text-[11px] text-slate-400 font-bold">（自訂售價留空則自動套用基準售價）</span>
          </div>

          {/* 🏷️ 明確欄位標題 (含商品成本) */}
          <div className="bg-slate-100/90 rounded-xl p-2 text-[11px] font-black text-slate-600 flex items-center gap-1.5 border border-slate-200 shadow-sm">
            <div className="flex-1 min-w-[65px] pl-1">規格名稱</div>
            <div className="w-14 text-center text-amber-800 font-black">💰 成本</div>
            <div className="w-16 text-center">自訂售價</div>
            <div className="w-12 text-center text-blue-700 font-black">🏠 家內</div>
            <div className="w-12 text-center text-emerald-700 font-black">🟢 現場</div>
            <div className="w-7 text-center text-slate-400">刪除</div>
          </div>

          {/* 📋 規格輸入列表 (手機不切邊、不破版) */}
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-surface-50 p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <input
                  type="text"
                  value={v.variantName}
                  onChange={e => updateVariant(i, 'variantName', e.target.value)}
                  placeholder="例: S"
                  className="flex-1 min-w-[65px] bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-black text-slate-900 focus:outline-none focus:border-rose-400"
                />
                <input
                  type="number"
                  placeholder="成本"
                  value={v.cost || ''}
                  onChange={e => updateVariant(i, 'cost', e.target.value)}
                  className="w-14 bg-amber-50/60 border border-amber-200 rounded-lg py-2 text-center text-xs font-bold text-amber-900 focus:outline-none focus:border-amber-400"
                  title="進貨成本"
                />
                <input
                  type="number"
                  placeholder={basePrice ? `$${basePrice}` : '售價'}
                  value={v.price}
                  onChange={e => updateVariant(i, 'price', e.target.value)}
                  className="w-16 bg-white border border-slate-200 rounded-lg py-2 text-center text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-400"
                  title="自訂特殊定價"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={v.homeQty}
                  onChange={e => updateVariant(i, 'homeQty', e.target.value)}
                  className="w-12 bg-blue-50 border border-blue-200 rounded-lg py-2 text-center text-xs font-black text-blue-700 focus:outline-none focus:border-blue-400"
                  title="家內總部庫存"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={v.stallQty}
                  onChange={e => updateVariant(i, 'stallQty', e.target.value)}
                  className="w-12 bg-emerald-50 border border-emerald-200 rounded-lg py-2 text-center text-xs font-black text-emerald-700 focus:outline-none focus:border-emerald-400"
                  title="現場出攤庫存"
                />
                <button
                  type="button"
                  onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                  className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-xs font-black"
                  title="刪除此規格"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setVariants([...variants, { variantName: `款式 ${variants.length+1}`, cost: '', price: basePrice, homeQty: 10, stallQty: 5 }])}
            className="text-xs text-rose-500 font-bold hover:underline"
          >
            + 新增一列規格
          </button>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-sm transition shadow-md"
        >
          確認建立商品 ➔
        </button>
      </form>
    </div>
  );
}
