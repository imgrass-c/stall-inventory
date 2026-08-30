import React, { useState } from 'react';
import { Icons } from '../common/Icons';
import { realtime } from '../../services/realtime';

export default function SettingsModal({
  onClose,
  user,
  onReload,
  onFullSyncSheets,
  onClearAllData,
  inventory,
  products
}) {
  const [gasUrlInput, setGasUrlInput] = useState(() => realtime.getGasUrl());
  const [importMsg, setImportMsg] = useState('');
  const [allSyncMsg, setAllSyncMsg] = useState('');
  const [isSyncingAll, setSyncingAll] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSaveGasUrl = () => {
    realtime.setGasUrl(gasUrlInput.trim());
    setImportMsg('已成功儲存 Google 試算表 GAS API 網址！');
    setTimeout(() => setImportMsg(''), 3000);
  };

  const handleImportConfigFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const configJson = JSON.parse(event.target.result);
        realtime.importConfigFile(configJson);
        setImportMsg('成功載入設定檔！系統已自動重新連線。');
        setTimeout(() => {
          onClose();
          if (onReload) onReload();
        }, 1200);
      } catch(err) {
        alert("設定檔格式錯誤：" + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadConfigBackup = () => {
    const currentConfig = {
      FIREBASE_CONFIG: window.STALL_CONFIG?.FIREBASE_CONFIG || realtime.getFirebaseConfig(),
      GAS_API_URL: realtime.getGasUrl()
    };
    const blob = new Blob([JSON.stringify(currentConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stall-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFullSync = async () => {
    setSyncingAll(true);
    setAllSyncMsg('');
    try {
      const res = await onFullSyncSheets();
      if (res && res.success) {
        setAllSyncMsg('已將【商品 + 即時庫存 + 今日銷售 + 成員白名單】全數同步備份至 Google 試算表！');
      } else {
        setAllSyncMsg('同步失敗：' + (res?.error || '請檢查 GAS 連線'));
      }
    } catch(e) {
      setAllSyncMsg('同步錯誤：' + e.message);
    } finally {
      setSyncingAll(false);
      setTimeout(() => setAllSyncMsg(''), 6000);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("警告：這將會徹底清空資料庫中「所有商品、庫存與歷史銷售訂單」，重設為完全空白的初始狀態！\n\n您確定要清空嗎？")) return;
    setIsClearing(true);
    try {
      await onClearAllData();
      setImportMsg('已成功清空所有測試資料！');
      setTimeout(() => {
        onClose();
      }, 800);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Icons.CloudSync className="w-5 h-5 text-rose-500" />
            <h3 className="text-base font-black text-slate-900">後臺連線與系統維護</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        {importMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Icons.Check className="w-4 h-4 text-emerald-600" />
            <span>{importMsg}</span>
          </div>
        )}

        {/* 連線狀態 */}
        <div className="bg-surface-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-500">Firebase 專案 ID：</span>
            <span className="font-mono font-black text-slate-900">{realtime.getConnectedProjectName()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-500">資料庫即時同步：</span>
            <span className="font-black text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>連線中 (雙向毫秒級同步)</span>
            </span>
          </div>
        </div>

        {/* Google Apps Script 網址設定 */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-700">Google Apps Script 試算表 API 網址</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={gasUrlInput}
              onChange={e => setGasUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-400"
            />
            <button
              type="button"
              onClick={handleSaveGasUrl}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition"
            >
              儲存
            </button>
          </div>
        </div>

        {/* 全量備份至試算表 */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            onClick={handleFullSync}
            disabled={isSyncingAll}
            className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-black rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Icons.CloudSync className={`w-4 h-4 text-rose-600 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? '備份同步中...' : '一鍵全量備份至 Google 試算表'}</span>
          </button>
          {allSyncMsg && (
            <div className="text-[11px] text-emerald-700 font-black text-center animate-in fade-in">
              {allSyncMsg}
            </div>
          )}
        </div>

        {/* 設定檔匯入與匯出 */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="py-2.5 bg-surface-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center">
              <Icons.UploadFile className="w-3.5 h-3.5" />
              <span>匯入設定檔</span>
              <input type="file" accept=".json" onChange={handleImportConfigFile} className="hidden" />
            </label>
            <button
              onClick={handleDownloadConfigBackup}
              className="py-2.5 bg-surface-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 text-center"
            >
              <Icons.DownloadFile className="w-3.5 h-3.5" />
              <span>下載設定備份</span>
            </button>
          </div>

          <button
            onClick={handleClearAll}
            disabled={isClearing}
            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 mt-2"
          >
            <Icons.Trash className="w-3.5 h-3.5" />
            <span>{isClearing ? '清空中...' : '徹底清空所有測試商品、庫存與營收資料'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
