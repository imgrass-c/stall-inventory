import React from 'react';
import { ShoppingBag, Boxes, ArrowLeftRight, BarChart3, Settings, LogOut, RefreshCw, Store } from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, user, onOpenSettings, onLogout, onReload, isLoading, isOnlineMode }) {
  const navItems = [
    { id: 'pos', label: '現場收銀 POS', icon: ShoppingBag, desc: '即時點單扣庫' },
    { id: 'inventory', label: '即時庫存清點', icon: Boxes, desc: '雙庫存總覽' },
    { id: 'transfer', label: '庫存調撥作業', icon: ArrowLeftRight, desc: '出攤 ⇄ 回庫' },
    { id: 'revenue', label: '今日營收統計', icon: BarChart3, desc: '戰報與對帳' },
    { id: 'products', label: '商品與規格管理', icon: Settings, desc: '新增與定價', roles: ['系統管理者', '編輯者'] },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between flex-shrink-0 hidden md:flex z-30">
      <div>
        {/* 品牌標題 */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-sm">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 leading-none">
              STALL POS
            </h1>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              市集營運中樞
            </span>
          </div>
        </div>

        {/* 連線狀態指示卡 */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isOnlineMode ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400 ring-4 ring-amber-100'}`}></span>
              <span className="text-xs font-medium text-slate-600">
                {isOnlineMode ? 'Google Sheet 已連線' : '本地快取模式'}
              </span>
            </div>
            <button
              onClick={onReload}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-700 text-xs transition"
              title="手動同步資料"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* 導航列表 */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            主要工作模組
          </div>
          {navItems.map((item) => {
            if (item.roles && (!user || !item.roles.includes(user.role))) {
              return null;
            }
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all text-left group ${
                  isActive
                    ? 'bg-rose-50 text-rose-600 font-semibold border-l-4 border-rose-500 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <div>
                    <div className={isActive ? 'text-rose-600 font-semibold' : 'text-slate-700 font-medium'}>
                      {item.label}
                    </div>
                  </div>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 底部使用者資訊與登出 */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full border border-slate-200" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                  {user.name ? user.name.slice(0, 1) : 'U'}
                </div>
              )}
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-800 truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{user.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-md hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition"
                title="系統設定"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                title="登出"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
