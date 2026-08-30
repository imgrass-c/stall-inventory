import React, { useState } from 'react';
import { Icons } from '../common/Icons';

export default function EodModal({
  todayData,
  onClose,
  onConfirmCloseout
}) {
  const [eodEventInput, setEodEventInput] = useState('');
  const [isClosingEod, setIsClosingEod] = useState(false);

  const handleDoEodCloseout = async () => {
    setIsClosingEod(true);
    try {
      const reportPayload = {
        date: todayData.date,
        eventName: eodEventInput.trim() || '一般現場',
        totalRevenue: todayData.totalRevenue || 0,
        totalCost: todayData.totalCost || 0,
        totalProfit: todayData.totalProfit || 0,
        profitMargin: todayData.profitMargin || 0,
        totalOrders: todayData.totalOrders || 0,
        totalItemsSold: todayData.totalItemsSold || 0,
        paymentBreakdown: todayData.paymentBreakdown || {},
        ownerBreakdown: todayData.ownerBreakdown || {},
        closedAt: new Date().toISOString()
      };
      await onConfirmCloseout(reportPayload);
      alert(`今日【${todayData.date}】收攤日結彙總完成！\n\n已成功將營收數據與日結戰報自動同步至 Google 試算表備份！`);
      onClose();
    } catch(err) {
      alert("日結失敗：" + err.message);
    } finally {
      setIsClosingEod(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">
              <Icons.Flag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">今日收攤日結彙總確認</h3>
              <p className="text-[11px] text-slate-400 font-bold">結算今日數據並自動備份至 Google 試算表</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-700 mb-1">本次出攤活動場次名稱：</label>
          <input
            type="text"
            value={eodEventInput}
            onChange={e => setEodEventInput(e.target.value)}
            placeholder="例：大港開唱 Day 1 / 小夜埕"
            className="w-full bg-slate-50 border-2 border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-purple-900 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>結算日期：</span>
            <span className="font-mono font-bold text-slate-900">{todayData.date}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>結帳單數 / 售出總件數：</span>
            <span className="font-bold text-slate-900">{todayData.totalOrders} 單 / {todayData.totalItemsSold} 件</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>今日實收營業額：</span>
            <span className="font-black text-slate-900 text-sm font-mono">NT$ {(todayData.totalRevenue || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>商品成本 / 預估總毛利：</span>
            <span className="font-black text-emerald-600 font-mono">NT$ {todayData.totalCost} / NT$ {todayData.totalProfit} ({todayData.profitMargin}%)</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 border-t border-slate-200 pt-2">
            <span>現金實收 (需清點金額)：</span>
            <span className="font-black text-rose-600 text-sm font-mono">NT$ {todayData.paymentBreakdown?.['現金'] || 0}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleDoEodCloseout}
            disabled={isClosingEod}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
          >
            <Icons.Check className="w-4 h-4 text-white" />
            <span>{isClosingEod ? '日結上傳中...' : '確認完成收攤日結'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
