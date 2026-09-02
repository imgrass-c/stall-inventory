import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';
import { realtime } from '../../services/realtime';

export default function AuthModal({ onLoginSuccess, onOpenSettings }) {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pendingUser && pendingUser.email) {
      const unsub = realtime.listenUserStatus(pendingUser.email, (userData) => {
        if (userData && userData.status === '已核准') {
          realtime.setCurrentUser(userData);
          onLoginSuccess(userData);
        }
      });
      return () => unsub();
    }
  }, [pendingUser]);

  const handleGooglePopupLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await realtime.loginWithGooglePopup();
      if (res && res.success) {
        if (res.status === '已核准') {
          realtime.setCurrentUser(res.user);
          onLoginSuccess(res.user);
        } else {
          setPendingUser(res.user);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Google 登入失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualEmailLogin = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await realtime.verifyUser(emailInput.trim(), nameInput.trim());
      if (res && res.success) {
        if (res.status === '已核准') {
          realtime.setCurrentUser(res.user);
          onLoginSuccess(res.user);
        } else if (res.status === '已停用') {
          setErrorMsg('此帳號已被管理員停用存取權限。');
        } else {
          setPendingUser(res.user);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || '驗證失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 max-w-md w-full shadow-2xl space-y-5 my-auto">
        
        <div className="text-center space-y-1">
          <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <Icons.Logo className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">感情失敗之友會</h2>
          <p className="text-xs text-slate-500 font-bold">營運後臺中樞 • 攤位成員登入</p>
        </div>

        {pendingUser ? (
          <div className="bg-amber-50/80 border-2 border-amber-300 rounded-3xl p-6 space-y-4 text-center animate-in fade-in">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Icons.Clock className="w-7 h-7 text-amber-600 animate-spin" />
            </div>
            
            <div>
              <span className="bg-amber-200/80 text-amber-900 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                <Icons.Lock className="w-3 h-3 text-amber-900" />
                <span>帳號待審核中</span>
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-2">已成功驗證 Google 帳號！</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                您好 <strong className="text-slate-900">{pendingUser.name || '小幫手'}</strong>，為確保攤位資料安全，新成員需由攤主開通權限後方可存取。
              </p>
            </div>

            <div className="bg-white rounded-2xl p-3.5 text-xs text-slate-700 text-left border border-amber-200/80 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-1.5 font-black text-slate-900">
                <Icons.Shield className="w-4 h-4 text-blue-600" />
                <span>攤主審核解鎖方式：</span>
              </div>
              <p className="text-[11px] text-slate-500">
                攤主登入後，點擊 <strong>「成員審核」</strong> 至 找到您的帳號 <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-bold">{pendingUser.email}</code> 至 點擊 <strong>「一鍵核准」</strong> 即可！
              </p>
              <div className="text-[11px] font-black text-emerald-700 pt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>此頁面即時連線中，攤主按下核准後將自動秒進系統！</span>
              </div>
            </div>

            <button
              onClick={() => setPendingUser(null)}
              className="text-xs text-slate-400 hover:text-slate-700 underline font-bold transition"
            >
              切換其他 Google 帳號
            </button>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs font-bold space-y-1">
                <div className="flex items-start gap-2">
                  <Icons.Alert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="whitespace-pre-line leading-relaxed">{errorMsg}</div>
                </div>
              </div>
            )}

            <button
              onClick={handleGooglePopupLogin}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-800 font-black rounded-2xl text-sm transition shadow-sm flex items-center justify-center gap-3 active:scale-98"
            >
              <Icons.GoogleG className="w-5 h-5" />
              <span>使用 Google 帳號一鍵登入</span>
            </button>

            <div className="flex items-center gap-3 text-xs text-slate-400 font-bold">
              <div className="flex-1 border-t border-slate-200"></div>
              <span>或輸入信箱驗證</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            <form onSubmit={handleManualEmailLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Google Email *</label>
                <input
                  type="email"
                  placeholder="helper@gmail.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  required
                  className="w-full bg-surface-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">小幫手暱稱 (選填)</label>
                <input
                  type="text"
                  placeholder="例如：小明"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full bg-surface-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2"
              >
                <Icons.UserCheck className="w-4 h-4 text-white" />
                <span>{isSubmitting ? '驗證中...' : '送出驗證'}</span>
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
