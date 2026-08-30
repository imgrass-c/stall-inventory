import React, { useState, useEffect } from 'react';
import { Store, Clock, Shield, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';

export default function AuthModal({ onLoginSuccess }) {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualEmailLogin = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await apiService.callApi('verifyUser', {
        email: emailInput.trim(),
        name: nameInput.trim()
      });
      if (res && res.success) {
        if (res.status === '已核准') {
          apiService.setCurrentUser(res.user);
          onLoginSuccess(res.user);
        } else if (res.status === '已停用') {
          setErrorMsg('此帳號已被管理員停用存取權限。');
        } else {
          setPendingUser(res.user);
        }
      } else {
        setErrorMsg(res?.error || '驗證失敗，請確認後端連線。');
      }
    } catch (err) {
      setErrorMsg(err.message || '連線錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = (role) => {
    const demo = {
      email: role === '系統管理者' ? 'owner@stall.com' : role === '編輯者' ? 'editor@stall.com' : 'helper@stall.com',
      name: role === '系統管理者' ? '攤主 (系統管理者)' : role === '編輯者' ? '夥伴 (編輯者)' : '市集小幫手',
      role: role,
      status: '已核准'
    };
    apiService.setCurrentUser(demo);
    onLoginSuccess(demo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 max-w-md w-full shadow-2xl space-y-6 my-auto">
        
        {/* 品牌 Logo 與標題 */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">市集擺攤營運系統</h2>
          <p className="text-xs text-slate-500 font-medium">請完成 Google 信箱驗證以確認攤位權限</p>
        </div>

        {/* 🟡 狀態 A：等待攤主審核畫面 */}
        {pendingUser ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4 text-center animate-in fade-in">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-amber-700 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-900">帳號申請審核中</h3>
              <p className="text-xs text-slate-600 mt-1">
                帳號 <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 text-slate-900">{pendingUser.email}</strong> 已送出申請。
              </p>
            </div>

            <div className="bg-white rounded-xl p-3 text-xs text-slate-600 text-left border border-amber-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>攤主審核方式：</span>
              </div>
              <div>1. 攤主登入管理員帳號後，開啟「對接與成員管理」。</div>
              <div>2. 將此信箱狀態改為 <span className="text-emerald-600 font-black">「已核准」</span>。</div>
            </div>

            <button
              onClick={() => setPendingUser(null)}
              className="text-xs text-slate-400 hover:text-slate-700 underline font-bold"
            >
              切換其他帳號登入
            </button>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 信箱表單登入 */}
            <form onSubmit={handleManualEmailLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Google Email *</label>
                <input
                  type="email"
                  placeholder="helper@gmail.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">小幫手暱稱 (選填)</label>
                <input
                  type="text"
                  placeholder="例如：小明"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>送出登入驗證</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* 現場快速測試/切換身分 */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-[11px] text-slate-400 font-bold">現場備用快速登入 (Demo 模式)：</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => handleQuickDemo('系統管理者')} className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-black">攤主 (管理)</button>
                <button onClick={() => handleQuickDemo('編輯者')} className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-black">編輯者</button>
                <button onClick={() => handleQuickDemo('一般使用者')} className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-black">小幫手</button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
