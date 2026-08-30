import React, { useState } from 'react';
import { Icons } from '../common/Icons';

export default function EventManageModal({
  events,
  onClose,
  onCreateEvent,
  onDeleteEvent,
  onAddExpense
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [boothCost, setBoothCost] = useState(3000);
  
  // 追加費用表單狀態
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('臨時租借/設備');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!eventName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreateEvent({
        name: eventName.trim(),
        start_date: startDate,
        end_date: endDate,
        booth_cost: Number(boothCost) || 0,
        status: '進行中'
      });
      setShowCreate(false);
      setEventName('');
      setBoothCost(3000);
    } catch(err) {
      alert("建立失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEventId || !expenseTitle.trim() || !expenseAmount || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddExpense(selectedEventId, {
        title: expenseTitle.trim(),
        amount: Number(expenseAmount) || 0,
        category: expenseCategory
      });
      setExpenseTitle('');
      setExpenseAmount('');
      setSelectedEventId(null);
    } catch(err) {
      alert("新增支出失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3.5 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
              <Icons.Flag className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">市集出攤活動管理</h3>
              <p className="text-xs text-slate-400 font-bold">預先建檔活動、設定攤位費與追加現場支出</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        {/* 頂部切換建檔按鈕 */}
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="w-full min-h-[46px] bg-rose-50 hover:bg-rose-100 border-2 border-dashed border-rose-300 text-rose-700 font-black rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>建立新的市集出攤場次 (例: 大港開唱 / 小夜埕)</span>
          </button>
        )}

        {/* 建立新場次表單 */}
        {showCreate && (
          <form onSubmit={handleCreateSubmit} className="bg-surface-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-900">建立出攤活動</h4>
              <button type="button" onClick={() => setShowCreate(false)} className="text-xs text-slate-400 font-bold hover:text-slate-600">取消</button>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">活動場次名稱 *</label>
              <input
                type="text"
                required
                placeholder="例：2026 大港開唱 (2天) / 森之市週末場"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                className="w-full min-h-[42px] bg-white border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-black text-slate-900 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">開始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full min-h-[40px] bg-white border border-slate-200 rounded-xl px-2 text-xs font-bold text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">結束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full min-h-[40px] bg-white border border-slate-200 rounded-xl px-2 text-xs font-bold text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">攤位租金 / 報名成本 (NT$)</label>
              <input
                type="number"
                value={boothCost}
                onChange={e => setBoothCost(e.target.value)}
                className="w-full min-h-[42px] bg-white border border-slate-200 rounded-xl px-3 text-sm font-mono font-black text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[44px] bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <Icons.Check className="w-4 h-4 text-white" />
              <span>{isSubmitting ? '建立中...' : '確認建立活動場次'}</span>
            </button>
          </form>
        )}

        {/* 活動列表與追加支出/刪除場次按鈕 */}
        <div className="space-y-3">
          <div className="text-xs font-black text-slate-700">現有出攤場次清單 ({events.length} 場)</div>
          
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-bold bg-surface-50 rounded-2xl border border-slate-200">
                尚未建立任何市集活動，請點擊上方按鈕建立！
              </div>
            ) : (
              events.map(e => {
                const totalExpenses = (e.expenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
                const isSelectedForExp = selectedEventId === e.event_id;

                return (
                  <div key={e.event_id} className="bg-surface-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 text-sm">{e.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            e.status === '已撤攤結算' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {e.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-bold mt-0.5">
                          {e.start_date} ~ {e.end_date} • 攤位費: <span className="font-mono font-black text-slate-700">NT$ {e.booth_cost}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedEventId(isSelectedForExp ? null : e.event_id)}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-black transition flex items-center gap-1"
                        >
                          <Icons.Plus className="w-3.5 h-3.5" />
                          <span>追加支出</span>
                        </button>

                        {/* 🌟 刪除活動場次按鈕 */}
                        {onDeleteEvent && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`確定要刪除出攤活動【${e.name}】嗎？`)) {
                                onDeleteEvent(e.event_id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                            title="刪除此場次"
                          >
                            <Icons.Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 支出明細列表 */}
                    {(e.expenses || []).length > 0 && (
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 text-xs">
                        <div className="text-[10px] font-black text-slate-400">追加現場費用 ({e.expenses.length} 筆，共 NT$ {totalExpenses})：</div>
                        <div className="space-y-0.5">
                          {e.expenses.map(exp => (
                            <div key={exp.id} className="flex justify-between items-center text-[11px] text-slate-600">
                              <span>• {exp.title} ({exp.category})</span>
                              <span className="font-mono font-black text-rose-600">-NT$ {exp.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 追加費用表單 (展開時) */}
                    {isSelectedForExp && (
                      <form onSubmit={handleAddExpenseSubmit} className="bg-purple-50/80 p-3 rounded-xl border border-purple-200 space-y-2 animate-in fade-in">
                        <div className="text-[11px] font-black text-purple-900">記錄【{e.name}】追加支出 (如: 臨時雨傘/便當)</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="支出名稱 (例: 租大雨傘)"
                            value={expenseTitle}
                            onChange={ev => setExpenseTitle(ev.target.value)}
                            className="bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-black"
                          />
                          <input
                            type="number"
                            required
                            placeholder="金額 NT$"
                            value={expenseAmount}
                            onChange={ev => setExpenseAmount(ev.target.value)}
                            className="bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-black text-rose-600"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEventId(null)}
                            className="flex-1 py-1.5 bg-white text-slate-500 rounded-lg text-xs font-bold"
                          >
                            取消
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black"
                          >
                            確認儲存支出
                          </button>
                        </div>
                      </form>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] bg-slate-900 text-white font-black rounded-2xl text-xs transition"
          >
            完成並返回調撥
          </button>
        </div>

      </div>
    </div>
  );
}
