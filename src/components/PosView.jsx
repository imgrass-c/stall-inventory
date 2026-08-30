import React, { useState, useMemo } from 'react';
import { ShoppingBag, Plus, Minus, CheckCircle2, ChevronUp, X, Check, Image as ImageIcon, Search } from 'lucide-react';

export default function PosView({ products, inventory, onCheckout, user }) {
  const [category, setCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentEvent, setCurrentEvent] = useState(() => localStorage.getItem('stall_current_event') || '2026 現場出攤');
  const [cart, setCart] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('現金');
  const [discount, setDiscount] = useState(0);
  const [cashGiven, setCashGiven] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSuccess, setLastSuccess] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);

  const categories = useMemo(() => {
    const cats = ['全部'];
    products.forEach(p => {
      if (p.category && !cats.includes(p.category)) {
        cats.push(p.category);
      }
    });
    return cats;
  }, [products]);

  const productCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products
      .filter(p => category === '全部' || p.category === category)
      .filter(p => {
        if (!q) return true;
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        const matchOwner = (p.owner_name || '').toLowerCase().includes(q);
        const matchVariant = inventory.some(inv => inv.product_id === p.product_id && (inv.variant_name || '').toLowerCase().includes(q));
        return matchName || matchCat || matchOwner || matchVariant;
      })
      .map(p => ({
        ...p,
        variants: inventory.filter(inv => inv.product_id === p.product_id)
      }));
  }, [products, inventory, category, searchQuery]);

  const addToCart = (v, p) => {
    setCart(prev => {
      const ex = prev.find(i => i.skuId === v.sku_id);
      if (ex) return prev.map(i => i.skuId === v.sku_id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, {
        skuId: v.sku_id,
        productId: p.product_id,
        productName: p.name,
        variantName: v.variant_name,
        price: Number(v.price) || Number(p.base_price) || 0,
        cost: Number(v.cost) || Number(p.cost) || 0,
        image_url: p.image_url || "",
        owner_name: p.owner_name || v.owner_name || '共同',
        qty: 1
      }];
    });
  };

  const updateQty = (skuId, d) => {
    setCart(prev => prev.map(i => i.skuId === skuId ? { ...i, qty: i.qty + d } : i).filter(i => i.qty > 0));
  };

  const isPRGift = paymentMethod === '公關贈送';
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const effectiveDiscount = isPRGift ? subtotal : Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const finalAmount = isPRGift ? 0 : Math.max(0, subtotal - effectiveDiscount);
  const changeDue = paymentMethod === '現金' && cashGiven ? Number(cashGiven) - finalAmount : null;

  const doCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await onCheckout({
        items: cart,
        totalAmount: subtotal,
        discountAmount: effectiveDiscount,
        finalAmount,
        paymentMethod,
        eventName: currentEvent || '一般現場',
        operator: user ? user.name : '現場小幫手'
      });
      if (res && res.success) {
        setLastSuccess({ orderId: res.orderId, amount: finalAmount, changeDue: changeDue > 0 ? changeDue : 0 });
        setCart([]);
        setDiscount(0);
        setCashGiven('');
        setIsDrawerOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 max-w-5xl mx-auto pb-24">
      
      {/* 🎪 當前出攤活動場次標籤 */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-500">🎪 當前活動場次：</span>
          <span className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl">
            {currentEvent}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = prompt('請輸入當前出攤活動場次名稱 (例: 2026大港開唱 / 小夜埕 / 現場出攤)：', currentEvent);
            if (next && next.trim()) {
              setCurrentEvent(next.trim());
              localStorage.setItem('stall_current_event', next.trim());
            }
          }}
          className="text-xs text-purple-600 hover:text-purple-800 font-bold hover:underline"
        >
          ✎ 修改場次
        </button>
      </div>

      {/* 🔍 商品快速搜尋欄 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 快速搜尋商品名稱、規格尺寸、攤位主理人..."
          className="w-full pl-10 pr-10 py-2.5 bg-white border-2 border-slate-200 focus:border-rose-500 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 圖片點擊放大預覽 Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="bg-white rounded-3xl p-4 max-w-sm w-full space-y-3 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <img src={previewImageModal.url} alt={previewImageModal.name} className="w-full h-64 object-cover rounded-2xl" />
            <h4 className="font-black text-slate-900 text-base">{previewImageModal.name}</h4>
            <button
              onClick={() => setPreviewImageModal(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
            >
              關閉預覽
            </button>
          </div>
        </div>
      )}

      {/* 結帳成功彈窗 */}
      {lastSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">結帳扣庫完成！</h3>
              <p className="text-xs font-mono text-slate-400 mt-1">單號：{lastSuccess.orderId}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500 font-bold">實收金額</span>
                <span className="font-black text-slate-900 text-xl">NT$ {lastSuccess.amount}</span>
              </div>
              {lastSuccess.changeDue > 0 && (
                <div className="flex justify-between items-baseline border-t border-slate-200 pt-2 text-rose-600">
                  <span className="text-xs font-bold">應找零錢</span>
                  <span className="font-black text-xl">NT$ {lastSuccess.changeDue}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setLastSuccess(null)}
              className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-base transition shadow-md"
            >
              繼續下一筆點單 ➔
            </button>
          </div>
        </div>
      )}

      {/* 橫向大按鈕分類列 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-5 py-2.5 rounded-xl text-sm font-extrabold transition whitespace-nowrap border ${
              category === c
                ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 查無商品提示 */}
      {productCards.length === 0 && (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-3 shadow-sm my-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="text-sm font-black text-slate-700">
            找不到符合「{searchQuery}」的商品
          </div>
          <p className="text-xs text-slate-400">請嘗試更換關鍵字或切換分類標籤</p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setCategory('全部'); }}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition"
          >
            清除搜尋與重設分類
          </button>
        </div>
      )}

      {/* 商品卡片清單 (含照片縮圖) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {productCards.map(p => (
          <div
            key={p.product_id}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    onClick={() => setPreviewImageModal({ url: p.image_url, name: p.name })}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 flex-shrink-0 cursor-pointer shadow-sm active:scale-95 transition"
                    title="點擊放大比對"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}

                <div className="min-w-0">
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {p.category}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg mt-0.5 leading-snug truncate">
                    {p.name}
                  </h3>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="font-black text-slate-900 text-lg sm:text-xl">NT$ {p.base_price}</span>
              </div>
            </div>

            {/* 規格按鈕網格 */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 flex justify-between">
                <span>點擊規格直接加單</span>
                <span>🟢 現場 / 🏠 家內</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {p.variants.map(v => {
                  const isZero = v.stall_qty <= 0;
                  return (
                    <button
                      key={v.sku_id}
                      onClick={() => addToCart(v, p)}
                      className={`h-14 rounded-xl border-2 transition active:scale-95 flex flex-col items-center justify-center ${
                        isZero
                          ? 'bg-amber-50/60 border-amber-300 text-amber-900'
                          : 'bg-slate-50 border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 text-slate-900'
                      }`}
                    >
                      <span className="font-black text-sm tracking-tight">{v.variant_name}</span>
                      <div className="flex items-center gap-1 text-[11px] mt-0.5">
                        <span className={`font-black ${isZero ? 'text-rose-600' : 'text-emerald-700'}`}>
                          現:{v.stall_qty}
                        </span>
                        <span className="text-slate-400 font-medium">家:{v.home_qty}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 手機底部大結帳浮動列 */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 md:bottom-6 left-3 right-3 z-40 max-w-md mx-auto">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl px-5 shadow-2xl flex items-center justify-between border-2 border-rose-500 active:scale-98 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-base shadow-sm">
                {totalItems}
              </div>
              <div className="text-left">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">合計金額</div>
                <div className="text-xl font-black text-white">NT$ {finalAmount}</div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-sm font-black text-rose-400">
              <span>明細與結帳</span>
              <ChevronUp className="w-5 h-5 animate-bounce" />
            </div>
          </button>
        </div>
      )}

      {/* 手機全螢幕/抽屜結帳面版 */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl border-t border-slate-200 p-5 max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 max-w-xl mx-auto w-full">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-rose-500" />
                <h3 className="text-lg font-black text-slate-900">結帳點單清單 ({totalItems} 件)</h3>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 購物車品項 (含縮圖) */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {cart.map(i => (
                <div key={i.skuId} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {i.image_url && (
                      <img src={i.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm truncate">{i.productName}</div>
                      <div className="text-xs text-slate-500 font-bold mt-0.5">
                        <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded mr-1 font-mono font-black text-slate-800">{i.variantName}</span>
                        NT$ {i.price}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateQty(i.skuId, -1)}
                      className="w-10 h-10 bg-white border border-slate-300 rounded-xl font-black text-slate-700 flex items-center justify-center active:scale-95 shadow-sm"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-7 text-center font-black text-slate-900 text-base">{i.qty}</span>
                    <button
                      onClick={() => updateQty(i.skuId, 1)}
                      className="w-10 h-10 bg-white border border-slate-300 rounded-xl font-black text-slate-700 flex items-center justify-center active:scale-95 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 快速折讓與支付方式 */}
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-500 font-bold">折讓優惠 / 折扣：</span>
                  {isPRGift && (
                    <span className="text-amber-800 font-black bg-amber-100 px-2 py-0.5 rounded-md text-[11px]">
                      🎁 公關贈送中 (實收 NT$ 0)
                    </span>
                  )}
                </div>
                {!isPRGift && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      {[0, 10, 20, 50, 100, 150].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setDiscount(v)}
                          className={`flex-1 py-2.5 rounded-xl font-black text-xs border transition ${
                            Number(discount) === v ? 'bg-rose-50 border-rose-500 text-rose-600 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {v === 0 ? '無' : `-${v}`}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">自訂折讓金額：</span>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-rose-500">- NT$</span>
                        <input
                          type="number"
                          min="0"
                          max={subtotal}
                          placeholder="0"
                          value={discount || ''}
                          onChange={e => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-200 rounded-lg pl-14 pr-2.5 py-1.5 text-xs font-black text-rose-600 focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1.5">支付方式：</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {['現金', 'LinePay', '街口', '轉帳', '公關贈送'].map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-2.5 rounded-xl font-black text-xs border transition ${
                        paymentMethod === pm ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm font-bold' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === '現金' && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-500">實收現金找零計算：</span>
                    <span className="font-black text-slate-900 text-sm">
                      {changeDue !== null && (changeDue >= 0 ? `找零 NT$ ${changeDue}` : `尚缺 NT$ ${Math.abs(changeDue)}`)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[finalAmount, 500, 1000, 2000].filter(v => v >= finalAmount).map(val => (
                      <button
                        key={val}
                        onClick={() => setCashGiven(String(val))}
                        className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 active:scale-95 shadow-sm"
                      >
                        {val === finalAmount ? '剛好' : `$${val}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={doCheckout}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 text-white font-black rounded-2xl text-lg transition shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>確認結帳扣庫 (NT$ {finalAmount})</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
