import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Settings, RefreshCw, UploadCloud, DownloadCloud, CheckCircle2, Shield } from 'lucide-react';
import { apiService } from '../services/api';

export default function SettingsModal({ onClose, user, onReload }) {
  const [activeTab, setActiveTab] = useState('members');
  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [msg, setMsg] = useState('');
  const configFileRef = useRef(null);

  const isAdmin = user && user.role === '系統管理者';

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await apiService.callApi('getUsers');
      if (res && res.success) {
        setUsersList(res.users || []);
      }
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'members') {
      loadUsers();
    }
  }, [activeTab]);

  const handleUpdateRole = async (email, newRole, newStatus) => {
    const res = await apiService.callApi('updateUserRole', {
      email,
      role: newRole,
      status: newStatus
    });
    if (res && res.success) {
      setMsg(`已成功更新 ${email} 的權限！`);
      await loadUsers();
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleImportConfigFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const configObj = JSON.parse(event.target.result);
        if (configObj.GAS_API_URL) {
          apiService.setApiUrl(configObj.GAS_API_URL);
        }
        setMsg('設定檔匯入成功！');
        setTimeout(() => {
          onReload();
          onClose();
        }, 1200);
      } catch (err) {
        alert('JSON 格式錯誤，請確認設定檔。');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadConfigBackup = () => {
    const currentConfig = {
      GAS_API_URL: apiService.getApiUrl()
    };
    const blob = new Blob([JSON.stringify(currentConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stall-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* 標頭 */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-black text-slate-900">系統管理與對接設定</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 分頁標籤 */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 pt-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 成員權限審核管理</span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'database'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>📁 設定檔匯入 / 安全對接</span>
          </button>
        </div>

        {/* 內容區 */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {msg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{msg}</span>
            </div>
          )}

          {activeTab === 'members' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">攤位小幫手與成員帳號：</span>
                <button onClick={loadUsers} className="text-rose-500 font-bold flex items-center gap-1">
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  <span>重新整理</span>
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {usersList.map(u => (
                  <div key={u.email} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">{u.name || u.email}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <select
                        value={u.role || '一般使用者'}
                        onChange={e => handleUpdateRole(u.email, e.target.value, u.status)}
                        className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 font-bold focus:outline-none"
                      >
                        <option value="系統管理者">系統管理者</option>
                        <option value="編輯者">編輯者</option>
                        <option value="一般使用者">一般使用者</option>
                      </select>

                      <select
                        value={u.status || '待審核'}
                        onChange={e => handleUpdateRole(u.email, u.role, e.target.value)}
                        className={`text-xs rounded-xl px-2.5 py-1.5 border font-black ${
                          u.status === '已核准'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : u.status === '已停用'
                            ? 'bg-rose-50 border-rose-300 text-rose-800'
                            : 'bg-amber-50 border-amber-300 text-amber-800 animate-pulse'
                        }`}
                      >
                        <option value="已核准">已核准</option>
                        <option value="待審核">待審核</option>
                        <option value="已停用">已停用</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
                <div className="font-black text-slate-900 flex items-center justify-between">
                  <span>當前後端連線狀態：</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    安全隔離中
                  </span>
                </div>
                <div className="text-slate-600 font-medium truncate">
                  📊 Google 試算表：<strong className="font-mono text-slate-900">{apiService.getApiUrl() ? '已配置' : '未設定'}</strong>
                </div>
              </div>

              <input
                type="file"
                ref={configFileRef}
                accept=".json"
                onChange={handleImportConfigFile}
                className="hidden"
              />

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => configFileRef.current?.click()}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>📁 選擇 / 匯入設定檔 (stall-config.json)</span>
                </button>

                <button
                  onClick={handleDownloadConfigBackup}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-800 font-black rounded-2xl text-xs transition flex items-center justify-center gap-2"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>📥 下載目前設定檔備份 (stall-config.json)</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                💡 介面上不手動輸入任何金鑰，透過上傳設定檔或外置 config.js 自動無聲對接。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
