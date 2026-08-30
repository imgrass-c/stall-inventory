import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '../common/Icons';
import { realtime } from '../../services/realtime';
import EventManageModal from './EventManageModal';

export default function TransferView({ inventory, onTransfer, user }) {
  const [direction, setDirection] = useState('home_to_stall');
  const [quantities, setQuantities] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 出攤活動管理狀態
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showEventModal, setShowEventModal] = useState(false);
  const [isReturningAll, setIsReturningAll] = useState(false);

  useEffect(() => {
    const unsub = realtime.subscribeEvents((eventsList) => {
      setEvents(eventsList || []);
      const active = (eventsList || []).filter(e => e.status !== '已撤攤結算');
      if (active.length > 0 && !selectedEventId) {
        setSelectedEventId(active[0].event_id);
      }
    });
    return () => unsub();
  }, []);

  const currentEvent = events.find(e => e.event_id === selectedEventId);

  const filteredInventory = useMemo(() => {
    if (!searchTerm.trim()) return inventory;
    const term = searchTerm.toLowerCase().trim();
    return inventory.filter(i => 
      (i.product_name && i.product_name.toLowerCase().includes(term)) ||
      (i.variant_name && i.variant_name.toLowerCase().includes(term)) ||
      (i.sku_id && i.sku_id.toLowerCase().includes(term)) ||
      (i.owner && i.owner.toLowerCase().includes(term))
    );
  }, [inventory, searchTerm]);

  const updateVal = (skuId, val, max) => {
    const n = Math.max(0, Math.min(Number(val) || 0, max));
    setQuantities(prev => ({ ...prev, [skuId]: n }));
  };

  const activeList = Object.entries(quantities).filter(([_, q]) => q > 0);

  const submitTransfer = async () => {
    if (activeList.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setMsg('');
    try {
      const payload = activeList.map(([skuId, qty]) => ({ skuId, qty }));
      const res = await onTransfer(payload, direction, user?.name || '調撥操作員', currentEvent?.name || '');
      if (res && res.success) {
        setMsg(`已成功將 ${activeList.length} 項商品調撥完成！`);
        setQuantities({});
      }
    } catch(err) {
      alert("調撥失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  // 市集最後一日「一鍵撤攤清點」
  const handleCloseoutAndReturnAll = async () => {
    const totalStallStock = inventory.reduce((sum, i) => sum + (i.stall_qty || 0), 0);
    if (totalStallStock === 0) {
      alert("目前現場無任何剩餘商品！");
      return;
    }

    const eventPrompt = currentEvent ? `【${currentEvent.name}】` : '現場攤位';
    if (!confirm(`確定要將${eventPrompt}目前剩餘的 ${totalStallStock} 件商品一鍵全數撤回倉庫嗎？\n\n確認後，現場庫存將全數回補至家內倉庫，並將活動標記為已結算！`)) {
      return;
    }

    setIsReturningAll(true);
    try {
      await realtime.closeEventAndReturnStock(selectedEventId, currentEvent?.name, user?.name || '主理人');
      alert(`撤攤清點完成！\n\n已成功將 ${totalStallStock} 件現場剩餘衣服全數歸入家內倉庫！`);
    } catch(err) {
      alert("撤攤失敗：" + err.message);
    } finally {
      setIsReturningAll(false);
    }
  };

  return (
    <div className="flex-1 bg-surface-50 p-3.5 sm:p-6 overflow-y-auto space-y-4 max-w-4xl mx-auto w-full pb-28 md:pb-6">
      
      {/* 頂部標題與活動管理按鈕 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">市集控管與雙向調撥</h2>
          <p className="text-xs text-slate-400 font-bold">鎖定出攤活動、批次調撥衣服或活動結束一鍵撤攤</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowEventModal(true)}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl text-xs sm:text-sm font-black transition shadow-sm flex items-center justify-center gap-1.5"
          >
            <Icons.Flag className="w-4 h-4 text-purple-600" />
            <span>出攤活動清單 ({events.length})</span>
          </button>

          <button
            type="button"
            onClick={handleCloseoutAndReturnAll}
            disabled={isReturningAll}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-black transition shadow-md flex items-center justify-center gap-1.5"
          >
            <Icons.LogOut className="w-4 h-4 text-white" />
            <span>{isReturningAll ? '撤攤中...' : '活動結束一鍵撤攤'}</span>
          </button>
        </div>
      </div>

      {/* 出攤活動綁定與方向切換卡片 */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-3">
        
        {/* 綁定出攤活動 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700">選擇本次調撥場次：</span>
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="bg-surface-50 border-2 border-rose-200 rounded-xl px-3 py-1.5 text-xs font-black text-rose-700 focus:outline-none"
            >
              {events.length === 0 ? (
                <option value="">一般現場 (未建檔活動)</option>
              ) : (
                events.map(ev => (
                  <option key={ev.event_id} value={ev.event_id}>
                    {ev.name} ({ev.status})
                  </option>
                ))
              )}
            </select>
          </div>

          {currentEvent && (
            <div className="text-[11px] text-slate-400 font-bold">
              攤位成本: <span className="font-mono text-slate-700 font-black">NT$ {currentEvent.booth_cost}</span>
            </div>
          )}
        </div>

        {/* 調撥方向切換大按鈕 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex bg-surface-50 p-1 rounded-2xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => { setDirection('home_to_stall'); setQuantities({}); }}
              className={`flex-1 sm:flex-none min-h-[44px] px-6 py-2.5 rounded-xl font-black transition flex items-center justify-center gap-1.5 ${
                direction === 'home_to_stall' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icons.ArrowRight className="w-4 h-4" />
              <span>倉庫出攤至現場</span>
            </button>
            <button
              type="button"
              onClick={() => { setDirection('stall_to_home'); setQuantities({}); }}
              className={`flex-1 sm:flex-none min-h-[44px] px-6 py-2.5 rounded-xl font-black transition flex items-center justify-center gap-1.5 ${
                direction === 'stall_to_home' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icons.ArrowLeft className="w-4 h-4" />
              <span>現場撤攤回倉庫</span>
            </button>
          </div>

          {msg && (
            <span className="text-emerald-600 text-xs font-black flex items-center gap-1">
              <Icons.Check className="w-4 h-4" />
              {msg}
            </span>
          )}
        </div>

      </div>

      {/* 🌟 搜尋欄 (使用者指定：雙向調撥新增搜尋選取) */}
      <div className="relative">
        <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="快速搜尋欲調撥之衣服款式、尺寸規格或主理人..."
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

      {/* 商品調撥數量列表 (大觸控按鈕) */}
      <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100 shadow-card overflow-hidden">
        {filteredInventory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">
            {searchTerm ? `找不到符合「${searchTerm}」的庫存項目` : '目前無可調撥的商品庫存'}
          </div>
        ) : (
          filteredInventory.map(i => {
            const max = direction === 'home_to_stall' ? (i.home_qty || 0) : (i.stall_qty || 0);
            return (
              <div key={i.sku_id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 text-sm sm:text-base">{i.product_name}</span>
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg text-xs font-black">
                      {i.variant_name}
                    </span>
                  </div>
                  <div className="text-slate-500 text-xs mt-1 font-bold">
                    {direction === 'home_to_stall' ? '倉庫可用: ' : '現場存量: '}
                    <span className="font-mono font-black text-slate-900 text-sm">{max}</span> 件
                    <span className="text-slate-400 ml-2">({i.owner})</span>
                  </div>
                </div>

                {/* 數量調撥大按鈕與輸入框 */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateVal(i.sku_id, (quantities[i.sku_id] || 0) + 1, max)}
                    disabled={max <= 0}
                    className="min-h-[44px] px-3.5 py-2 bg-surface-50 hover:bg-slate-100 disabled:opacity-30 rounded-xl border border-slate-200 font-black text-slate-800 text-xs sm:text-sm active:scale-95"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => updateVal(i.sku_id, (quantities[i.sku_id] || 0) + 5, max)}
                    disabled={max <= 0}
                    className="min-h-[44px] px-3.5 py-2 bg-surface-50 hover:bg-slate-100 disabled:opacity-30 rounded-xl border border-slate-200 font-black text-slate-800 text-xs sm:text-sm active:scale-95"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => updateVal(i.sku_id, max, max)}
                    disabled={max <= 0}
                    className="min-h-[44px] px-3.5 py-2 bg-amber-50 hover:bg-amber-100 disabled:opacity-30 rounded-xl border border-amber-200 font-black text-amber-800 text-xs sm:text-sm active:scale-95"
                  >
                    全調
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={max}
                    value={quantities[i.sku_id] || ''}
                    onChange={e => updateVal(i.sku_id, e.target.value, max)}
                    placeholder="0"
                    className="w-20 min-h-[44px] bg-surface-50 border-2 border-slate-200 rounded-xl py-1 text-center font-black font-mono text-slate-900 text-base focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 送出調撥按鈕 */}
      <button
        type="button"
        onClick={submitTransfer}
        disabled={activeList.length === 0 || isSubmitting}
        className="w-full min-h-[52px] bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-base transition shadow-md flex items-center justify-center gap-2 active:scale-98"
      >
        <Icons.Transfer className="w-5 h-5 text-white" />
        <span>{isSubmitting ? '調撥處理中...' : `確認送出調撥 (${activeList.length} 項商品)`}</span>
      </button>

      {/* 出攤活動管理 Modal */}
      {showEventModal && (
        <EventManageModal
          events={events}
          onClose={() => setShowEventModal(false)}
          onCreateEvent={async (evData) => {
            const res = await realtime.createEvent(evData);
            if (res && res.success) setSelectedEventId(res.eventId);
          }}
          onAddExpense={(eId, exp) => realtime.addEventExpense(eId, exp)}
          onDeleteEvent={(eId) => realtime.deleteEvent(eId)}
        />
      )}

    </div>
  );
}
