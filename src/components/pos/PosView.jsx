import React, { useState, useMemo } from 'react';
import { Icons } from '../common/Icons';

export default function PosView({
  products = [],
  inventory = [],
  onCheckout,
  onCheckoutSale,
  allEvents = [],
  user,
  onNavigateToProducts
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customDiscountInput, setCustomDiscountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('現金');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderSuccess, setLastOrderSuccess] = useState(null);

  // 銷售通路狀態：'market' (市集現場，扣現場庫存) 或 'online' (網路銷售，扣倉庫庫存)
  const [channelType, setChannelType] = useState('market');
  
  // 可選活動場次
  const availableEvents = useMemo(() => {
    return (allEvents || []).filter(e => {
      const status = typeof e === 'object' ? e.status : '';
      return status !== '已撤攤結算';
    });
  }, [allEvents]);

  const [channelName, setChannelName] = useState(() => {
    return availableEvents[0]?.name || '一般現場';
  });

  // 商品與其所有尺寸 SKU 的對應 Map
  const productSkusMap = useMemo(() => {
    const map = {};
    inventory.forEach(inv => {
      if (!map[inv.product_id]) map[inv.product_id] = [];
      map[inv.product_id].push(inv);
    });
    return map;
  }, [inventory]);

  // 動態分類清單
  const categories = useMemo(() => {
    const set = new Set(['全部']);
    products.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
  }, [products]);

  // 搜尋與分類過濾
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = categoryFilter === '全部' || p.category === categoryFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch = !term ||
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (productSkusMap[p.product_id] || []).some(s => s.variant_name && s.variant_name.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  }, [products, categoryFilter, searchTerm, productSkusMap]);

  // 加入購物車 (點擊尺寸按鈕)
  const addToCart = (product, sku) => {
    const maxStock = channelType === 'online' ? (sku.home_qty || 0) : (sku.stall_qty || 0);
    if (maxStock <= 0) return;

    setCart(prev => {
      const exist = prev.find(item => item.skuId === sku.sku_id);
      if (exist) {
        if (exist.qty >= maxStock) {
          alert(`已達目前${channelType === 'online' ? '倉庫' : '現場'}可用庫存上限 (${maxStock} 件)`);
          return prev;
        }
        return prev.map(item => item.skuId === sku.sku_id ? { ...item, qty: item.qty + 1 } : item);
      } else {
        return [...prev, {
          skuId: sku.sku_id,
          productId: product.product_id,
          productName: product.name,
          variantName: sku.variant_name,
          price: Number(sku.price) || 0,
          cost: Number(sku.cost) || 0,
          owner: sku.owner || '攤位公家',
          image: product.image_url || '',
          qty: 1,
          maxQty: maxStock
        }];
      }
    });
  };

  // 修改購物車數量
  const updateCartQty = (skuId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.skuId === skuId) {
          const nextQty = item.qty + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.maxQty) {
            alert(`已達可用庫存上限 (${item.maxQty} 件)`);
            return item;
          }
          return { ...item, qty: nextQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  // 計算金額
  const cartTotalOriginal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const cartTotalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  
  // 若為公關贈送，實收強制歸 0，折讓金額為原價
  const isPRGift = paymentMethod === '公關贈送';
  const effectiveDiscount = isPRGift ? cartTotalOriginal : discountAmount;
  const finalTotalAmount = Math.max(0, cartTotalOriginal - effectiveDiscount);

  // 提交結帳
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        items: cart,
        paymentMethod: paymentMethod,
        discountAmount: effectiveDiscount,
        originalTotal: cartTotalOriginal,
        finalTotal: finalTotalAmount,
        operator: user?.name || (user?.email ? user.email.split('@')[0] : '現場收銀員'),
        channelType: channelType,
        channelName: channelName,
        eventName: channelType === 'market' ? channelName : ''
      };

      const checkoutFn = onCheckoutSale || onCheckout;
      const res = await checkoutFn(payload);
      if (res && res.success) {
        setLastOrderSuccess({
          orderId: res.orderId,
          total: finalTotalAmount,
          itemsCount: cartTotalItems,
          method: paymentMethod,
          channel: payload.channelName
        });
        setCart([]);
        setDiscountAmount(0);
        setCustomDiscountInput('');
        setIsDrawerOpen(false);
      }
    } catch(err) {
      alert("結帳失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
      
      {/* ========================================================================= */}
      {/* 📱 左側 / 全螢幕：商品選購陳列區 */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-50 p-3 sm:p-5 overflow-y-auto pb-32 md:pb-6">
        
        {/* 🌟 頂部控制列 (固定置頂，大按鈕與清晰文字設計) */}
        <div className="space-y-3 mb-3 flex-shrink-0 bg-surface-50">
          
          {/* 搜尋欄 */}
          <div className="relative">
            <Icons.Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="快速搜尋商品名稱、款式、尺寸 (如: 貓貓白色, L)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-10 py-3 text-base font-bold text-slate-900 focus:outline-none focus:border-rose-400 shadow-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                <Icons.Close className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* 銷售通路快速切換列 (加大字體與觸控按鈕) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => { setChannelType('market'); setChannelName(availableEvents[0]?.name || '一般現場'); }}
                className={`min-h-[44px] px-4 py-2 rounded-xl transition flex items-center gap-1.5 text-sm sm:text-base font-black ${
                  channelType === 'market' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icons.Flag className="w-4 h-4" />
                <span>市集現場 (扣現場)</span>
              </button>
              <button
                type="button"
                onClick={() => { setChannelType('online'); setChannelName('7-11 賣貨便'); }}
                className={`min-h-[44px] px-4 py-2 rounded-xl transition flex items-center gap-1.5 text-sm sm:text-base font-black ${
                  channelType === 'online' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icons.Store className="w-4 h-4" />
                <span>網路銷售 (扣倉庫)</span>
              </button>
            </div>

            {/* 通路細項選擇器 (加大字體與觸控高度) */}
            {channelType === 'market' ? (
              <select
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                className="min-h-[48px] bg-white border-2 border-rose-300 rounded-2xl px-4 py-2 text-sm sm:text-base font-black text-rose-700 shadow-sm focus:outline-none focus:border-rose-500"
              >
                {availableEvents.length === 0 ? (
                  <option value="一般現場">一般現場 (未指定場次)</option>
                ) : (
                  availableEvents.map(e => <option key={e.event_id} value={e.name}>{e.name}</option>)
                )}
                <option value="一般現場">一般現場</option>
              </select>
            ) : (
              <select
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                className="min-h-[48px] bg-white border-2 border-purple-300 rounded-2xl px-4 py-2 text-sm sm:text-base font-black text-purple-700 shadow-sm focus:outline-none focus:border-purple-500"
              >
                <option value="7-11 賣貨便">7-11 賣貨便</option>
                <option value="官方網站">官方網站</option>
                <option value="蝦皮購物">蝦皮購物</option>
                <option value="IG 私訊訂單">IG 私訊訂單</option>
                <option value="其他網路通路">其他網路通路</option>
              </select>
            )}
          </div>

          {/* 🌟 分類標籤滑動列 (加大按鈕尺寸與字體) */}
          <div className="flex items-center gap-2.5 overflow-x-auto pt-1 pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-[46px] px-5 py-2.5 rounded-2xl text-sm sm:text-base font-black whitespace-nowrap transition shadow-sm flex-shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-rose-500 text-white shadow-rose-200 ring-2 ring-rose-400'
                    : 'bg-white text-slate-800 hover:bg-slate-100 border-2 border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* 商品與服飾規格卡片網格 */}
        {filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Icons.Products className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-700">查無符合商品</h3>
            <p className="text-sm text-slate-400 mt-1 font-bold">請嘗試不同關鍵字或切換分類</p>
            {products.length === 0 && (
              <button
                onClick={onNavigateToProducts}
                className="mt-4 px-5 py-2.5 bg-rose-500 text-white text-sm font-black rounded-2xl shadow-md"
              >
                前往商品建檔
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const skus = productSkusMap[product.product_id] || [];
              const totalStall = skus.reduce((sum, s) => sum + (s.stall_qty || 0), 0);
              const totalHome = skus.reduce((sum, s) => sum + (s.home_qty || 0), 0);

              return (
                <div
                  key={product.product_id}
                  className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-card flex flex-col justify-between"
                >
                  {/* 商品縮圖與庫存總覽 */}
                  <div className="relative aspect-video sm:aspect-square bg-slate-100 overflow-hidden flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icons.Image className="w-12 h-12 text-slate-300" />
                    )}
                    <span className="absolute top-2.5 right-2.5 bg-slate-900/90 backdrop-blur-sm text-white text-xs sm:text-sm font-black px-3 py-1 rounded-full shadow-md">
                      現場: {totalStall} • 倉庫: {totalHome}
                    </span>
                  </div>

                  {/* 商品名稱與規格尺寸按鈕 */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <span className="bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-md text-xs font-black border border-rose-100 uppercase">
                        {product.category || '衣服'}
                      </span>
                      <h4 className="font-black text-slate-900 text-base sm:text-lg line-clamp-1 mt-1">{product.name}</h4>
                    </div>

                    {/* 🌟 尺寸 / 規格 SKU 大按鈕 (超大字體與舒適觸控高度) */}
                    <div className="space-y-2">
                      {skus.map(sku => {
                        const inCart = cart.find(c => c.skuId === sku.sku_id);
                        const stallStock = Number(sku.stall_qty) || 0;
                        const homeStock = Number(sku.home_qty) || 0;
                        const currentStock = channelType === 'online' ? homeStock : stallStock;
                        const isOutOfStock = currentStock <= 0;

                        return (
                          <button
                            key={sku.sku_id}
                            disabled={isOutOfStock}
                            onClick={() => addToCart(product, sku)}
                            className={`w-full min-h-[52px] sm:min-h-[56px] px-4 py-2.5 rounded-2xl text-left transition border-2 flex items-center justify-between active:scale-98 ${
                              isOutOfStock
                                ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-60'
                                : inCart
                                ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-300'
                                : 'bg-surface-50 hover:bg-slate-100 text-slate-900 border-slate-200'
                            }`}
                          >
                            <div className="overflow-hidden flex items-baseline gap-2">
                              <span className="font-black text-base sm:text-lg text-slate-900">{sku.variant_name}</span>
                              {/* 🌟 清楚顯示現場與倉庫件數 */}
                              <span className="text-xs sm:text-sm text-slate-600 font-bold">
                                (現 <span className={`font-black ${stallStock > 0 ? 'text-rose-600 font-mono' : 'text-slate-400'}`}>{stallStock}</span> / 倉 <span className="font-black text-slate-800 font-mono">{homeStock}</span>)
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 font-mono font-black text-base sm:text-lg text-rose-600">
                              <span>${sku.price}</span>
                              {inCart && (
                                <span className="bg-rose-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-sm">
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

      {/* ========================================================================= */}
      {/* 🛒 手機端底部浮動購物車條 (Floating Bottom Cart Bar) */}
      {/* ========================================================================= */}
      {cart.length > 0 && !isDrawerOpen && (
        <div className="md:hidden fixed bottom-16 left-3 right-3 z-30 animate-in slide-in-from-bottom-5">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700 active:scale-98"
          >
            <div className="flex items-center gap-2">
              <span className="bg-rose-500 text-white text-sm font-black px-3 py-1 rounded-full">
                {cartTotalItems} 件
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-300">
                {channelType === 'online' ? `網路販售 (${channelName})` : `現場出攤 (${channelName})`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-black text-lg sm:text-xl font-mono text-rose-400">
                NT$ {finalTotalAmount.toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm bg-rose-500 text-white font-black px-3.5 py-1.5 rounded-xl">
                結帳明細
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📦 桌面側邊 / 手機端滑出式結帳抽屜 (Sliding Bottom Sheet Drawer) */}
      {/* ========================================================================= */}
      {isDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
      <aside className={`
        fixed md:static inset-x-0 bottom-0 z-50 md:z-auto
        w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200
        p-4 sm:p-5 pb-8 sm:pb-5 flex flex-col justify-between shadow-2xl md:shadow-none
        transition-transform duration-300 ease-out
        ${isDrawerOpen ? 'translate-y-0 max-h-[90vh] rounded-t-3xl overflow-y-auto' : 'translate-y-full md:translate-y-0 hidden md:flex'}
      `}>
        
        {/* 抽屜頂部標題與關閉按鈕 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
              <Icons.Pos className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg">收銀結帳明細 ({cartTotalItems} 件)</h3>
              <p className="text-xs text-slate-400 font-bold">通路: {channelName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs sm:text-sm text-slate-400 hover:text-rose-600 font-bold px-2 py-1">
                清空
              </button>
            )}
            <button onClick={() => setIsDrawerOpen(false)} className="md:hidden text-slate-400 hover:text-slate-700 p-1.5">
              <Icons.Close className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 購物車品項列表 */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-2 max-h-60 md:max-h-none">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm font-bold space-y-1">
              <p>購物車空空如也</p>
              <p className="text-xs text-slate-300">請點選左側服飾尺寸加入結帳</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.skuId} className="py-3 flex items-center justify-between text-sm">
                <div className="overflow-hidden pr-2">
                  <div className="font-black text-slate-900 text-sm sm:text-base truncate">{item.productName}</div>
                  <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                    <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md font-black">{item.variantName}</span>
                    <span>${item.price}</span>
                    <span className="text-purple-600 font-bold">[{item.owner}]</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.skuId, -1)}
                    className="w-8 h-8 rounded-xl bg-surface-50 border border-slate-200 flex items-center justify-center text-slate-700 font-black hover:bg-slate-100 text-base"
                  >
                    -
                  </button>
                  <span className="font-black font-mono text-base w-5 text-center">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.skuId, 1)}
                    disabled={item.qty >= item.maxQty}
                    className="w-8 h-8 rounded-xl bg-surface-50 border border-slate-200 flex items-center justify-center text-slate-700 font-black hover:bg-slate-100 disabled:opacity-30 text-base"
                  >
                    +
                  </button>
                  <span className="font-black font-mono text-base text-slate-900 w-16 text-right">
                    ${item.price * item.qty}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 折讓與付款方式控制 (加大按鈕高度與字體) */}
        <div className="space-y-3.5 pt-3 border-t border-slate-100">
          
          {/* 折扣選擇 */}
          <div>
            <span className="text-xs font-black text-slate-600 block mb-1">快捷折讓：</span>
            <div className="grid grid-cols-4 gap-1.5 text-xs sm:text-sm">
              {[0, 30, 50, 100].map(disc => (
                <button
                  key={disc}
                  type="button"
                  onClick={() => { setDiscountAmount(disc); setCustomDiscountInput(''); }}
                  className={`min-h-[44px] rounded-xl font-black transition ${
                    discountAmount === disc && customDiscountInput === ''
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-surface-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {disc === 0 ? '無折扣' : `-$${disc}`}
                </button>
              ))}
            </div>
          </div>

          {/* 收款方式 */}
          <div>
            <span className="text-xs font-black text-slate-600 block mb-1">收款方式：</span>
            <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm font-black">
              {['現金', 'LinePay', '街口', '轉帳', '公關贈送'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`min-h-[46px] rounded-xl transition flex items-center justify-center border-2 ${
                    paymentMethod === m
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-surface-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 金額總計與確認結帳 */}
          <div className="bg-surface-50 p-3.5 rounded-2xl border-2 border-slate-200 space-y-1.5">
            <div className="flex justify-between text-xs sm:text-sm text-slate-500 font-bold">
              <span>原價: ${cartTotalOriginal}</span>
              {effectiveDiscount > 0 && <span className="text-rose-600 font-black">折讓: -${effectiveDiscount}</span>}
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-slate-200">
              <span className="text-xs sm:text-sm font-black text-slate-900">應收金額：</span>
              <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
                NT$ {finalTotalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckoutSubmit}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full min-h-[56px] bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-base sm:text-lg transition shadow-md flex items-center justify-center gap-2 active:scale-98"
          >
            <Icons.Check className="w-5 h-5 text-white" />
            <span>{isSubmitting ? '結帳處理中...' : `確認送出結帳 (NT$ ${finalTotalAmount})`}</span>
          </button>
        </div>

      </aside>

      {/* 結帳成功提示彈窗 */}
      {lastOrderSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 border border-slate-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Icons.Check className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full uppercase">
                結帳完成
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono">NT$ {lastOrderSuccess.total}</h3>
              <p className="text-sm text-slate-600 font-bold mt-1">
                {lastOrderSuccess.channel} • {lastOrderSuccess.method} • {lastOrderSuccess.itemsCount} 件商品
              </p>
              <p className="text-xs font-mono text-slate-400 mt-0.5">{lastOrderSuccess.orderId}</p>
            </div>
            <button
              onClick={() => setLastOrderSuccess(null)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-sm transition shadow-md"
            >
              完成，繼續下一筆收銀
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
