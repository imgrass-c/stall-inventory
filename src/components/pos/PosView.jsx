import React, { useState, useMemo } from 'react';
import { Icons } from '../common/Icons';

export default function PosView({
  products,
  inventory,
  onCheckout,
  user,
  onNavigateToProducts
}) {
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('現金');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customDiscountInput, setCustomDiscountInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [searchTerm, setSearchTerm] = useState('');
  const [eventName, setEventName] = useState('一般現場');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderSuccess, setLastOrderSuccess] = useState(null);

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
      const matchCat = categoryFilter === '全部' || p.category === categoryFilter;
      const matchSearch = !searchTerm.trim() || 
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (productSkusMap[p.product_id] || []).some(s => s.variant_name && s.variant_name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, categoryFilter, searchTerm, productSkusMap]);

  const addToCart = (product, sku) => {
    if (sku.stall_qty <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.skuId === sku.sku_id);
      if (existing) {
        if (existing.qty >= sku.stall_qty) return prev;
        return prev.map(item =>
          item.skuId === sku.sku_id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prev, {
          skuId: sku.sku_id,
          productId: product.product_id,
          productName: product.name,
          variantName: sku.variant_name,
          price: sku.price,
          cost: sku.cost,
          owner: sku.owner || '攤位公家',
          image: product.image_url || '',
          maxQty: sku.stall_qty,
          qty: 1
        }];
      }
    });
  };

  const updateCartQty = (skuId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.skuId === skuId) {
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (newQty > item.maxQty) return item;
          return { ...item, qty: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const cartTotalOriginal = useMemo(() => {
    return cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  }, [cart]);

  const cartTotalItems = useMemo(() => {
    return cart.reduce((sum, i) => sum + i.qty, 0);
  }, [cart]);

  const finalTotalAmount = useMemo(() => {
    if (paymentMethod === '公關贈送') return 0;
    return Math.max(0, cartTotalOriginal - (Number(discountAmount) || 0));
  }, [cartTotalOriginal, discountAmount, paymentMethod]);

  const handleCheckoutSubmit = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        items: cart,
        paymentMethod,
        discountAmount: paymentMethod === '公關贈送' ? cartTotalOriginal : Number(discountAmount) || 0,
        originalTotal: cartTotalOriginal,
        finalTotal: finalTotalAmount,
        operator: user?.name || '現場小幫手',
        eventName: eventName.trim() || '一般現場'
      };
      const res = await onCheckout(payload);
      if (res && res.success) {
        setLastOrderSuccess({
          orderId: res.orderId,
          total: finalTotalAmount,
          itemsCount: cartTotalItems,
          method: paymentMethod
        });
        setCart([]);
        setDiscountAmount(0);
        setCustomDiscountInput('');
      }
    } catch(err) {
      alert("結帳失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      
      {/* 左側：商品選購區 */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-50 p-4 sm:p-6 overflow-y-auto">
        
        {/* 頂部搜尋欄與場次標籤 */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="快速搜尋商品名稱、分類、規格..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-400 shadow-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Icons.Close className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm text-xs font-bold text-slate-700">
              <Icons.Flag className="w-3.5 h-3.5 text-rose-500 mr-1.5" />
              <input
                type="text"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="出攤場次"
                className="w-24 sm:w-28 bg-transparent text-xs font-black text-rose-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 分類標籤滑動列 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition shadow-sm ${
                categoryFilter === cat
                  ? 'bg-rose-500 text-white shadow-rose-200'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 商品與規格卡片網格 */}
        {filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Icons.Products className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800">尚無符合的商品</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">請切換分類、清除搜尋或前往商品名冊建立新商品</p>
            {onNavigateToProducts && (
              <button
                onClick={onNavigateToProducts}
                className="mt-4 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black border border-rose-200 transition"
              >
                前往商品建檔
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(product => {
              const skus = productSkusMap[product.product_id] || [];
              const totalStallStock = skus.reduce((sum, s) => sum + s.stall_qty, 0);

              return (
                <div
                  key={product.product_id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card flex flex-col"
                >
                  {/* 商品縮圖 */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icons.Image className="w-10 h-10 text-slate-300" />
                    )}
                    <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      現場存量: {totalStallStock}
                    </span>
                  </div>

                  {/* 商品名稱與分類 */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{product.category || '未分類'}</div>
                      <h4 className="font-black text-slate-900 text-xs sm:text-sm line-clamp-1 mt-0.5">{product.name}</h4>
                    </div>

                    {/* SKU 規格按鈕清單 */}
                    <div className="mt-2.5 space-y-1.5">
                      {skus.map(sku => {
                        const inCart = cart.find(c => c.skuId === sku.sku_id);
                        const isOutOfStock = sku.stall_qty <= 0;

                        return (
                          <button
                            key={sku.sku_id}
                            disabled={isOutOfStock}
                            onClick={() => addToCart(product, sku)}
                            className={`w-full p-2 rounded-xl text-left text-xs transition border flex items-center justify-between ${
                              isOutOfStock
                                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                : inCart
                                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                                : 'bg-surface-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <span className="font-black text-slate-800">{sku.variant_name}</span>
                              <span className="text-[10px] text-slate-400 ml-1">({sku.stall_qty}件)</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 font-mono font-black text-rose-600">
                              <span>${sku.price}</span>
                              {inCart && (
                                <span className="bg-rose-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                  {inCart.qty}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 右側：購物車與結帳抽屜 */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shadow-lg flex-shrink-0">
        
        {/* 購物車頂部標題 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.Pos className="w-5 h-5 text-rose-500" />
            <h3 className="font-black text-slate-900 text-sm">收銀明細 ({cartTotalItems} 件)</h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition"
            >
              清空
            </button>
          )}
        </div>

        {/* 購物車品項列表 */}
        <div className="flex-1 p-4 space-y-2.5 overflow-y-auto max-h-56 md:max-h-none">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <Icons.Logo className="w-8 h-8 text-slate-200 mb-2" />
              <div className="text-xs font-bold">尚未加入任何商品</div>
              <div className="text-[10px] text-slate-400 mt-0.5">點擊左側規格即可加入收銀購物車</div>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.skuId}
                className="bg-surface-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-2"
              >
                <div className="overflow-hidden flex-1">
                  <div className="font-black text-slate-900 text-xs truncate">{item.productName}</div>
                  <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                    <span className="text-rose-600 font-black">{item.variantName}</span>
                    <span>•</span>
                    <span>${item.price}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateCartQty(item.skuId, -1)}
                    className="w-7 h-7 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center font-black transition"
                  >
                    <Icons.Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-mono font-black text-xs text-slate-900">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateCartQty(item.skuId, 1)}
                    disabled={item.qty >= item.maxQty}
                    className="w-7 h-7 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center font-black transition"
                  >
                    <Icons.Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部折讓與支付方式控制 */}
        <div className="p-4 bg-surface-50 border-t border-slate-200 space-y-3.5">
          
          {/* 折讓按鈕列 */}
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">快捷折讓</div>
            <div className="flex items-center gap-1.5">
              {[0, 10, 20, 50].map(amt => (
                <button
                  key={amt}
                  onClick={() => { setDiscountAmount(amt); setCustomDiscountInput(''); }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black transition border ${
                    discountAmount === amt && !customDiscountInput
                      ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {amt === 0 ? '無' : `-$${amt}`}
                </button>
              ))}
              <input
                type="number"
                placeholder="自訂"
                value={customDiscountInput}
                onChange={e => {
                  setCustomDiscountInput(e.target.value);
                  setDiscountAmount(Number(e.target.value) || 0);
                }}
                className="w-16 bg-white border border-slate-200 rounded-xl py-1.5 text-center text-xs font-black text-slate-900 focus:outline-none focus:border-rose-400"
              />
            </div>
          </div>

          {/* 支付方式切換 */}
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">收款方式</div>
            <div className="grid grid-cols-3 gap-1.5">
              {['現金', 'LinePay', '街口', '轉帳', '公關贈送'].map(pm => (
                <button
                  key={pm}
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-2 rounded-xl text-xs font-black transition border ${
                    paymentMethod === pm
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          {/* 金額統計與確認結帳 */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
            <div className="text-xs font-bold text-slate-500">
              原價: ${cartTotalOriginal} {discountAmount > 0 && <span className="text-rose-500 font-bold ml-1">(-${discountAmount})</span>}
            </div>
            <div className="text-xl font-black text-rose-600 font-mono">
              NT$ {finalTotalAmount}
            </div>
          </div>

          <button
            onClick={handleCheckoutSubmit}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2"
          >
            <Icons.Check className="w-4 h-4 text-white" />
            <span>{isSubmitting ? '結帳處理中...' : `確認結帳 (NT$ ${finalTotalAmount})`}</span>
          </button>
        </div>

      </div>

      {/* 結帳成功提示彈窗 */}
      {lastOrderSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-4 border border-slate-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Icons.Check className="w-7 h-7 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">結帳成功！</h3>
              <div className="text-xl font-black text-rose-600 font-mono mt-1">NT$ {lastOrderSuccess.total}</div>
              <div className="text-xs text-slate-400 font-bold mt-0.5">{lastOrderSuccess.method} • {lastOrderSuccess.itemsCount} 件商品</div>
            </div>
            <button
              onClick={() => setLastOrderSuccess(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs transition"
            >
              下一筆交易
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
