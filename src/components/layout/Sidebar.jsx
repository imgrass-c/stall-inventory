import React from 'react';
import { Icons } from '../common/Icons';

export default function Sidebar({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  onOpenSettings,
  isFirebaseLive,
  pendingCount
}) {
  const isAdmin = user?.role === '系統管理者';
  const isEditor = user?.role === '編輯者' || isAdmin;

  // 依據角色動態過濾側邊欄可見分頁
  const allTabs = [
    { id: 'pos', name: '現場收銀', icon: Icons.Pos, allowed: true },
    { id: 'inventory', name: '即時庫存', icon: Icons.Inventory, allowed: true },
    { id: 'transfer', name: '市集控管', icon: Icons.Transfer, allowed: isEditor },
    { id: 'revenue', name: '營收分帳', icon: Icons.Revenue, allowed: isEditor },
    { id: 'products', name: '商品建檔', icon: Icons.Products, allowed: isEditor },
    { id: 'members', name: '成員審核', icon: Icons.Users, badge: pendingCount, allowed: isAdmin }
  ];

  const visibleTabs = allTabs.filter(t => t.allowed);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-5 select-none shadow-sm flex-shrink-0">
      {/* 品牌 Logo */}
      <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md">
          <Icons.Logo className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-slate-900 text-base leading-tight tracking-tight">感情失敗之友會</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${isFirebaseLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {isFirebaseLive ? '連線中' : '離線模式'}
            </span>
          </div>
        </div>
      </div>

      {/* 導航分頁清單 */}
      <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto">
        {visibleTabs.map(t => {
          const Icon = t.icon;
          const active = currentTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setCurrentTab(t.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black transition ${
                active
                  ? 'bg-rose-50 text-rose-600 shadow-sm border border-rose-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${active ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>{t.name}</span>
              </div>
              {t.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 底部使用者資訊與設定 */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        {user && (
          <div className="flex items-center justify-between bg-surface-50 p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                {user.name ? user.name[0] : '友'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-black text-slate-900 truncate">{user.name || '夥伴'}</div>
                <div className="text-[10px] text-slate-400 font-bold truncate">{user.role || '一般使用者'}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="登出帳號"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
            >
              <Icons.LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 只有系統管理者可見後台連線設定按鈕 */}
        {isAdmin && (
          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2"
          >
            <Icons.CloudSync className="w-4 h-4 text-slate-500" />
            <span>後臺與連線設定</span>
          </button>
        )}
      </div>
    </aside>
  );
}
