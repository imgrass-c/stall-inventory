import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '../common/Icons';
import { realtime } from '../../services/realtime';

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
  
  // 銷售通路與出攤場次
  const [channelType, setChannelType] = useState('market'); // 'market' (市集現場) or 'online' (網路通路)
  const [channelName, setChannelName] = useState('一般現場');
  const [availableEvents, setAvailableEvents] = useState([]);
  
  // 手機端底部抽屜展開狀態
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderSuccess, setLastOrderSuccess] = useState(null);

  useEffect(() => {
    const unsub = realtime.subscribeEvents((eventsList) => {
      const active = (eventsList || []).filter(e => e.status !== '已撤攤結算');
      setAvailableEvents(active);
      if (active.length > 0 && channelType === 'market' && channelName === '一般現場') {
        setChannelName(active[0].name);
      }
    });
    return () => unsub();
  }, []);

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
    const availableStock = channelType === 'online' ? (sku.home_qty || 0) : (sku.stall_qty || 0);
    if (availableStock <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.skuId === sku.sku_id);
      if (existing) {
        if (existing.qty >= availableStock) return prev;
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
          maxQty: availableStock,
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
        operator: user?.name || '現場收銀員',
        channelType,
        channelName: channelName.trim() || (channelType === 'market' ? '一般現場' : '網路賣貨便'),
        eventName: channelType === 'market' ? (channelName.trim() || '一般現場') : channelName.trim()
      };
      const res = await onCheckout(payload);
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
      {/*  左側 / 全螢幕：商品選購陳列區 */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-50 p-3.5 sm:p-6 overflow-y-auto pb-28 md:pb-6">
        
        {/* 頂部搜尋欄與通路/場次切換標籤 */}
        <div className="space-y-2.5 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="快速搜尋商品名稱、款式、尺寸..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-8 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-400 shadow-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                  <Icons.Close className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 銷售通路快速切換列 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm text-xs font-black">
              <button
                type="button"
                onClick={() => { setChannelType('market'); setChannelName(availableEvents[0]?.name || '一般現場'); }}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                  channelType === 'market' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icons.Flag className="w-3.5 h-3.5" />
                <span>市集現場 (扣現場)</span>
              </button>
              <button
                type="button"
                onClick={() => { setChannelType('online'); setChannelName('7-11 賣貨便'); }}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                  channelType === 'online' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icons.Store className="w-3.5 h-3.5" />
                <span>網路銷售 (扣倉庫)</span>
              </button>
            </div>

            {/* 通路細項選擇器 */}
            {channelType === 'market' ? (
              <select
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                className="bg-white border-2 border-rose-200 rounded-2xl px-3 py-1.5 text-xs font-black text-rose-700 shadow-sm focus:outline-none"
              >
                {availableEvents.length === 0 ? (
                  <option value="一般現場">一般現場 (未指定場次)</option>
                ) : (
                  availableEvents.map(e => <option key={e.event_id} value={e.name}> {e.name}</option>)
                )}
                <option value="一般現場"> 一般現場</option>
              </select>
            ) : (
              <select
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                className="bg-white border-2 border-purple-200 rounded-2xl px-3 py-1.5 text-xs font-black text-purple-700 shadow-sm focus:outline-none"
              >
                <option value="7-11 賣貨便"> 7-11 賣貨便</option>
                <option value="官方網站"> 官方網站</option>
                <option value="蝦皮購物"> 蝦皮購物</option>
                <option value="IG 私訊訂單"> IG 私訊訂單</option>
                <option value="其他網路通路"> 其他網路通路</option>
              </select>
            )}
          </div>
        </div>

        {/* 分類標籤滑動列 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition shadow-sm ${
                categoryFilter === cat
                  ? 'bg-rose-500 text-white shadow-rose-200'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 商品與服飾規格卡片網格 */}
        {filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Icons.Products className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800">尚無符合的商品</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">請切換分類或前往商品名冊建立新商品</p>
            {onNavigateToProducts && (
              <button
                onClick={onNavigateToProducts}
                className="mt-4 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-xs font-black border border-rose-200 transition"
              >
                前往商品建檔
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(product => {
              const skus = productSkusMap[product.product_id] || [];
              const totalStock = skus.reduce((sum, s) => {
                return sum + (channelType === 'online' ? (s.home_qty || 0) : (s.stall_qty || 0));
              }, 0);

              return (
                <div
                  key={product.product_id}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-card flex flex-col justify-between"
                >
                  {/* 商品縮圖 */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icons.Image className="w-10 h-10 text-slate-300" />
                    )}
                    <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {channelType === 'online' ? `倉庫庫存: ${totalStock}` : `現場存量: ${totalStock}`}
                    </span>
                  </div>

                  {/* 商品名稱與規格尺寸按鈕 */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{product.category || '服飾'}</div>
                      <h4 className="font-black text-slate-900 text-sm line-clamp-1 mt-0.5">{product.name}</h4>
                    </div>

                    {/* 尺寸 / 規格 SKU 觸控按鈕 */}
                    <div className="mt-2.5 space-y-1.5">
                      {skus.map(sku => {
                        const inCart = cart.find(c => c.skuId === sku.sku_id);
                        const currentStock = channelType === 'online' ? (sku.home_qty || 0) : (sku.stall_qty || 0);
                        const isOutOfStock = currentStock <= 0;

                        return (
                          <button
                            key={sku.sku_id}
                            disabled={isOutOfStock}
                            onClick={() => addToCart(product, sku)}
                            className={`w-full min-h-[44px] px-2.5 py-1.5 rounded-xl text-left transition border flex items-center justify-between active:scale-98 ${
                              isOutOfStock
                                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                : inCart
                                ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-sm ring-1 ring-rose-300'
                                : 'bg-surface-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <span className="font-black text-xs sm:text-sm text-slate-900">{sku.variant_name}</span>
                              <span className="text-[11px] text-slate-400 ml-1 font-bold">({currentStock}件)</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 font-mono font-black text-xs sm:text-sm text-rose-600">
                              <span>${sku.price}</span>
                              {inCart && (
                                <span className="bg-rose-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">
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
      {/*  手機端：底部懸浮購物車條 (點擊滑出結帳抽屜) */}
      {/* ========================================================================= */}
      {cart.length > 0 && !isDrawerOpen && (
        <div className="md:hidden fixed bottom-20 left-3 right-3 z-30 animate-in slide-in-from-bottom duration-200">
          <div
            onClick={() => setIsDrawerOpen(true)}
            className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-drawer flex items-center justify-between cursor-pointer border border-slate-700 active:scale-98 transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-rose-500 text-white rounded-xl flex items-center justify-center font-black text-sm">
                {cartTotalItems}
              </div>
              <div>
                <div className="text-xs text-slate-300 font-bold">目前購物車</div>
                <div className="text-base font-black font-mono text-white">NT$ {finalTotalAmount}</div>
              </div>
            </div>

            <button
              type="button"
              className="bg-rose-500 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1 shadow-sm"
            >
              <span>結帳明細</span>
              <Icons.ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/*  結帳抽屜面板 (手機為滑出式 Bottom Sheet，桌面為右側固定欄) */}
      {/* ========================================================================= */}
      <div className={`
        fixed md:static inset-x-0 bottom-0 z-50 md:z-auto
        w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200
        flex flex-col shadow-2xl md:shadow-none flex-shrink-0 transition-transform duration-300 max-h-[85vh] md:max-h-none rounded-t-3xl md:rounded-none
        ${isDrawerOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
      `}>
        
        {/* 抽屜頂部標題 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <Icons.Pos className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">收銀結帳明細 ({cartTotalItems} 件)</h3>
              <div className="text-[10px] text-slate-400 font-bold">通路: {channelName}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs font-bold text-slate-400 hover:text-rose-600 px-2 py-1"
              >
                清空
              </button>
            )}
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="md:hidden p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <Icons.Close className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 購物車品項列表 */}
        <div className="flex-1 p-4 space-y-2.5 overflow-y-auto max-h-52 md:max-h-none">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Icons.Logo className="w-8 h-8 text-slate-200 mb-2" />
              <div className="text-xs font-bold text-slate-600">購物車目前為空</div>
              <div className="text-[11px] text-slate-400 mt-1">請點擊左側商品尺寸加入收銀</div>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.skuId}
                className="bg-surface-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-2"
              >
                <div className="overflow-hidden flex-1">
                  <div className="font-black text-slate-900 text-xs sm:text-sm truncate">{item.productName}</div>
                  <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                    <span className="text-rose-600 font-black">{item.variantName}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-700">${item.price}</span>
                    <span>•</span>
                    <span className="text-purple-600 font-bold">{item.owner}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.skuId, -1)}
                    className="w-8 h-8 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 flex items-center justify-center font-black shadow-sm"
                  >
                    <Icons.Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-mono font-black text-sm text-slate-900">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.skuId, 1)}
                    disabled={item.qty >= item.maxQty}
                    className="w-8 h-8 bg-white hover:bg-slate-100 disabled:opacity-30 rounded-xl border border-slate-200 text-slate-700 flex items-center justify-center font-black shadow-sm"
                  >
                    <Icons.Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部折讓與支付方式控制 (手機大按鈕設計) */}
        <div className="p-4 bg-surface-50 border-t border-slate-200 space-y-3 safe-bottom">
          
          {/* 快捷折讓按鈕列 */}
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">快捷折讓</div>
            <div className="flex items-center gap-1.5">
              {[0, 10, 20, 50].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setDiscountAmount(amt); setCustomDiscountInput(''); }}
                  className={`flex-1 min-h-[38px] rounded-xl text-xs font-black transition border ${
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
                className="w-16 min-h-[38px] bg-white border border-slate-200 rounded-xl text-center text-xs font-black text-slate-900 focus:outline-none focus:border-rose-400"
              />
            </div>
          </div>

          {/* 收款方式切換 (大按鈕好按) */}
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">收款方式</div>
            <div className="grid grid-cols-3 gap-1.5">
              {['現金', 'LinePay', '街口', '轉帳', '公關贈送'].map(pm => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`min-h-[44px] rounded-2xl text-xs font-black transition border ${
                    paymentMethod === pm
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
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
            <div className="text-2xl font-black text-rose-600 font-mono">
              NT$ {finalTotalAmount}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckoutSubmit}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full min-h-[50px] bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-base transition shadow-md flex items-center justify-center gap-2 active:scale-98"
          >
            <Icons.Check className="w-5 h-5 text-white" />
            <span>{isSubmitting ? '結帳中...' : `確認送出結帳 (NT$ ${finalTotalAmount})`}</span>
          </button>
        </div>

      </div>

      {/* 遮罩 (手機端展開抽屜時顯示) */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        />
      )}

      {/* 結帳成功提示彈窗 */}
      {lastOrderSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-4 border border-slate-200 my-auto">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Icons.Check className="w-7 h-7 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">結帳成功！</h3>
              <div className="text-2xl font-black text-rose-600 font-mono mt-1">NT$ {lastOrderSuccess.total}</div>
              <div className="text-xs text-slate-500 font-bold mt-1">
                {lastOrderSuccess.channel} • {lastOrderSuccess.method} • {lastOrderSuccess.itemsCount} 件
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLastOrderSuccess(null)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-sm transition shadow-sm"
            >
              完成 / 下一筆
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
