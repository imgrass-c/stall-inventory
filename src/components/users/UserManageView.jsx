import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '../common/Icons';
import { realtime } from '../../services/realtime';
import { exportToCsv } from '../../utils/formatters';

export default function UserManageView({ user, onSyncSheets }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreAddModal, setShowPreAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('一般使用者');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const unsub = realtime.subscribeUsers((list) => {
      setUsers(list || []);
    });
    return () => unsub();
  }, []);

  const pendingUsers = useMemo(() => users.filter(u => u.status === '待審核'), [users]);
  const activeUsers = useMemo(() => users.filter(u => u.status !== '待審核'), [users]);

  const handleApprove = async (email, role = '一般使用者') => {
    try {
      await realtime.updateUserRole(email, role, '已核准');
      setMsg(`已成功核准【${email}】存取權限！`);
      setTimeout(() => setMsg(''), 3000);
    } catch(err) {
      alert("核准失敗：" + err.message);
    }
  };

  const handleRoleChange = async (email, newR) => {
    try {
      await realtime.updateUserRole(email, newR, null);
    } catch(err) {
      alert("更新身分失敗：" + err.message);
    }
  };

  const handleStatusChange = async (email, newS) => {
    try {
      await realtime.updateUserRole(email, null, newS);
    } catch(err) {
      alert("更新狀態失敗：" + err.message);
    }
  };

  const handleDelete = async (email) => {
    if (!confirm(`確定要刪除成員【${email}】嗎？`)) return;
    try {
      await realtime.deleteMember(email);
    } catch(err) {
      alert("刪除失敗：" + err.message);
    }
  };

  const handlePreAddSubmit = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      await realtime.preAddMember(newEmail.trim(), newName.trim(), newRole, '已核准');
      setShowPreAddModal(false);
      setNewEmail('');
      setNewName('');
      setMsg(`已預先開通【${newEmail.trim()}】權限！`);
      setTimeout(() => setMsg(''), 3000);
    } catch(err) {
      alert("預先開通失敗：" + err.message);
    }
  };

  const handleExportCsv = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const headers = ['Email 帳號', '成員暱稱', '身分權限', '帳號狀態', '加入時間'];
    const rows = users.map(u => [
      u.email,
      u.name || '',
      u.role || '一般使用者',
      u.status || '已核准',
      u.created_at || ''
    ]);
    exportToCsv(`感情失敗之友會_成員名冊_${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="flex-1 bg-surface-50 p-4 sm:p-6 overflow-y-auto space-y-4 max-w-5xl mx-auto w-full">
      {/* 頂部控制列 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">攤位成員與審核中心</h2>
          <p className="text-xs text-slate-400 font-bold">管理夥伴與市集小幫手之權限、審核與名冊</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
          >
            <Icons.DownloadFile className="w-4 h-4 text-slate-500" />
            <span>匯出名冊</span>
          </button>

          <button
            onClick={() => setShowPreAddModal(true)}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
          >
            <Icons.Plus className="w-4 h-4 text-white" />
            <span>預先開通成員</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Icons.Check className="w-4 h-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      {/* 待審核名單 (高優先處理) */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-5 space-y-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
            <h3 className="text-sm font-black text-slate-900">新成員待審核名單 ({pendingUsers.length} 人)</h3>
          </div>
          <div className="divide-y divide-amber-200/60 bg-white rounded-2xl border border-amber-200 overflow-hidden">
            {pendingUsers.map(u => (
              <div key={u.email} className="p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                <div>
                  <div className="font-black text-slate-900 text-sm">{u.name || u.email.split('@')[0]}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(u.email, '一般使用者')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition shadow-sm"
                  >
                    一鍵核准 (小幫手)
                  </button>
                  <button
                    onClick={() => handleApprove(u.email, '編輯者')}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs transition shadow-sm"
                  >
                    核准為夥伴 (編輯)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 現有成員列表 */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="p-4 bg-surface-50 text-xs font-black text-slate-700 border-b border-slate-200 flex justify-between items-center">
          <span>現有成員名冊 ({activeUsers.length} 人)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-black text-slate-500 border-b border-slate-200">
                <th className="p-3.5">成員姓名 / Email</th>
                <th className="p-3.5">身分權限</th>
                <th className="p-3.5">帳號狀態</th>
                <th className="p-3.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {activeUsers.map(u => (
                <tr key={u.email} className="hover:bg-slate-50 transition">
                  <td className="p-3.5">
                    <div className="font-black text-slate-900">{u.name || u.email.split('@')[0]}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                  </td>
                  <td className="p-3.5">
                    <select
                      value={u.role || '一般使用者'}
                      onChange={e => handleRoleChange(u.email, e.target.value)}
                      className="bg-surface-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="系統管理者">系統管理者 (全部權限)</option>
                      <option value="編輯者">編輯者 (商品/庫存/收銀)</option>
                      <option value="一般使用者">一般使用者 (現場收銀)</option>
                    </select>
                  </td>
                  <td className="p-3.5">
                    <select
                      value={u.status || '已核准'}
                      onChange={e => handleStatusChange(u.email, e.target.value)}
                      className="bg-surface-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="已核准">已核准</option>
                      <option value="待審核">待審核</option>
                      <option value="已停用">已停用</option>
                    </select>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDelete(u.email)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                      title="刪除此成員"
                    >
                      <Icons.Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 預先開通 Modal */}
      {showPreAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">預先開通新成員權限</h3>
              <button onClick={() => setShowPreAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePreAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-black text-slate-700 mb-1">Google Email *</label>
                <input
                  type="email"
                  required
                  placeholder="helper@gmail.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1">成員姓名 / 暱稱</label>
                <input
                  type="text"
                  placeholder="例：小明"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1">身分權限</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full bg-surface-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
                >
                  <option value="一般使用者">一般使用者 (現場收銀)</option>
                  <option value="編輯者">編輯者 (商品/庫存/收銀)</option>
                  <option value="系統管理者">系統管理者 (全部權限)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPreAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <Icons.Check className="w-4 h-4 text-white" />
                  <span>確認開通</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
