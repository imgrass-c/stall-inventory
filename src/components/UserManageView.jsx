import React, { useState, useEffect } from 'react';
import { UserCheck, Users, AlertCircle, Check, X, Plus, Search, RefreshCw, Shield, Trash2 } from 'lucide-react';

export default function UserManageView({ usersList = [], onUpdateRole, onPreAddMember, onDeleteMember, currentUser }) {
  // 🔒 雙重權限防護：非系統管理者直接阻擋
  if (!currentUser || currentUser.role !== '系統管理者') {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-rose-600" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900">存取權限受限</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            「成員與會員審核」為攤位主理人（系統管理者）專屬功能。<br />
            一般使用者或編輯者無法查閱成員審核名冊。
          </p>
        </div>
      </div>
    );
  }

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('全部');
  const [filterRole, setFilterRole] = useState('全部');
  
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('一般使用者');
  const [msg, setMsg] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const pendingUsers = usersList.filter(u => u.status === '待審核');
  const approvedUsers = usersList.filter(u => u.status === '已核准');
  const disabledUsers = usersList.filter(u => u.status === '已停用');

  const handleApprove = async (email, role = '一般使用者') => {
    await onUpdateRole(email, role, '已核准');
    setMsg(`✅ 已核准開通 ${email}！對方手機將自動秒進系統。`);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleReject = async (email) => {
    await onUpdateRole(email, '一般使用者', '已停用');
    setMsg(`🚫 已停用 / 拒絕 ${email} 的存取權限。`);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleAddWhitelist = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsAdding(true);
    try {
      await onPreAddMember(newEmail, newName, newRole, '已核准');
      setMsg(`✅ 成功將「${newEmail}」預先加入白名單並直接核准！`);
      setNewEmail('');
      setNewName('');
      setTimeout(() => setMsg(''), 4000);
    } finally {
      setIsAdding(false);
    }
  };

  const filteredList = usersList.filter(u => {
    const matchSearch = (u.name||'').toLowerCase().includes(search.toLowerCase()) || (u.email||'').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === '全部' || u.status === filterStatus;
    const matchRole = filterRole === '全部' || u.role === filterRole;
    return matchSearch && matchStatus && matchRole;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      
      {/* 頂部四項指標 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-bold">攤位全體成員</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{usersList.length} <span className="text-xs text-slate-400 font-normal">位</span></div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm ${pendingUsers.length > 0 ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200 animate-pulse' : 'bg-white border-slate-200'}`}>
          <div className="text-xs text-rose-700 font-black flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>待審核申請</span>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{pendingUsers.length} <span className="text-xs font-normal">位等待開通</span></div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-emerald-700 font-bold">已核准使用中</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{approvedUsers.length} <span className="text-xs text-slate-400 font-normal">位</span></div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-bold">已停用名單</div>
          <div className="text-2xl font-black text-slate-400 mt-1">{disabledUsers.length} <span className="text-xs text-slate-400 font-normal">位</span></div>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* 🚨 待審核即時處理佇列 (Pending Queue) */}
      {pendingUsers.length > 0 && (
        <div className="bg-white border-2 border-rose-400 rounded-3xl p-5 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-rose-100">
            <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>🚨 發現 {pendingUsers.length} 位成員正在等待攤主核准開通權限：</span>
            </div>
            <span className="text-xs font-bold text-slate-400">核准後對方手機將自動秒進系統</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingUsers.map(u => (
              <div key={u.email} className="bg-rose-50/60 border border-rose-200 p-4 rounded-2xl flex flex-col justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-rose-200 text-rose-600 font-black text-base flex items-center justify-center shadow-sm">
                    {u.name ? u.name[0] : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 text-sm truncate">{u.name || '小幫手'}</div>
                    <div className="text-xs text-slate-500 font-mono font-bold truncate">{u.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-rose-100">
                  <button
                    onClick={() => handleApprove(u.email, '一般使用者')}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>核准為「小幫手」</span>
                  </button>

                  <button
                    onClick={() => handleApprove(u.email, '編輯者')}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span>核准為「店長」</span>
                  </button>

                  <button
                    onClick={() => handleReject(u.email)}
                    className="py-2.5 px-3 bg-white hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-black transition active:scale-95"
                  >
                    拒絕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ➕ 預先新增成員白名單 */}
      <form onSubmit={handleAddWhitelist} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div>
          <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-rose-500" />
            <span>預先新增成員白名單 (出攤前設定，登入直接開通)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">預先填寫小幫手的 Google 信箱，出攤時小幫手登入免等待審核即可直接開始收銀！</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
          <input
            type="email"
            placeholder="小幫手 Google Email *"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            required
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-rose-400"
          />
          <input
            type="text"
            placeholder="稱呼 / 暱稱 (例如: 阿豪)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-rose-400"
          />
          <select
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:outline-none"
          >
            <option value="一般使用者">一般使用者 (現場收銀)</option>
            <option value="編輯者">編輯者 (收銀 + 商品管理)</option>
            <option value="系統管理者">系統管理者 (最高權限)</option>
          </select>
          <button
            type="submit"
            disabled={isAdding}
            className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
          >
            {isAdding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>加入白名單 ➔</span>
          </button>
        </div>
      </form>

      {/* 👥 全體成員清單與管理 */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-4 p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm">攤位成員權限總覽 ({filteredList.length} 位)</h3>
            <p className="text-xs text-slate-400 mt-0.5">點擊下拉選單可即時調整身分與停用狀態</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 text-xs">
            <input
              type="text"
              placeholder="搜尋成員名稱或 Email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 text-xs w-44 focus:outline-none"
            />

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 text-xs"
            >
              <option value="全部">全部狀態</option>
              <option value="已核准">已核准</option>
              <option value="待審核">待審核</option>
              <option value="已停用">已停用</option>
            </select>

            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 text-xs"
            >
              <option value="全部">全部角色</option>
              <option value="系統管理者">系統管理者</option>
              <option value="編輯者">編輯者</option>
              <option value="一般使用者">一般使用者</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {filteredList.length > 0 ? (
            filteredList.map(u => (
              <div key={u.email} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50 px-2 rounded-2xl transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200">
                    {u.name ? u.name[0] : 'U'}
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                      <span>{u.name || u.email.split('@')[0]}</span>
                      {u.email === currentUser?.email && (
                        <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.2 rounded font-bold">您自己</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <select
                    value={u.role || '一般使用者'}
                    onChange={e => onUpdateRole(u.email, e.target.value, u.status)}
                    disabled={u.email === currentUser?.email}
                    className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 font-bold focus:outline-none disabled:opacity-50"
                  >
                    <option value="系統管理者">系統管理者 (全權限)</option>
                    <option value="編輯者">編輯者 (商品管理)</option>
                    <option value="一般使用者">一般使用者 (現場收銀)</option>
                  </select>

                  <select
                    value={u.status || '已核准'}
                    onChange={e => onUpdateRole(u.email, u.role, e.target.value)}
                    disabled={u.email === currentUser?.email}
                    className={`text-xs rounded-xl px-3 py-1.5 border font-black disabled:opacity-50 ${
                      u.status === '已核准' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : u.status === '已停用' ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-amber-50 border-amber-300 text-amber-800 animate-pulse'
                    }`}
                  >
                    <option value="已核准">已核准</option>
                    <option value="待審核">待審核</option>
                    <option value="已停用">已停用</option>
                  </select>

                  {u.email !== currentUser?.email && (
                    <button
                      onClick={() => onDeleteMember(u.email)}
                      className="p-2 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="刪除成員"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs font-bold">找不到符合條件的成員</div>
          )}
        </div>
      </div>

    </div>
  );
}
