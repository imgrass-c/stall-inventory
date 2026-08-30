import React from 'react';
import { ShoppingBag, Boxes, ArrowLeftRight, BarChart3, Settings, LogOut, ShieldCheck, User } from 'lucide-react';

export default function Navbar({ currentTab, setCurrentTab, user, onOpenSettings, onLogout }) {
  const tabs = [
    { id: 'pos', label: '現場 POS', icon: ShoppingBag },
    { id: 'inventory', label: '即時庫存', icon: Boxes },
    { id: 'transfer', label: '庫存調撥', icon: ArrowLeftRight },
    { id: 'revenue', label: '今日營收', icon: BarChart3 },
    { id: 'products', label: '商品管理', icon: Settings, roles: ['系統管理者', '編輯者'] },
  ];

  const roleColors = {
    '系統管理者': 'bg-red-500/20 text-red-300 border-red-500/30',
    '編輯者': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    '一般使用者': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Title */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🎪</span>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                市集擺攤系統
              </h1>
              <span className="text-[10px] text-slate-400 -mt-1 hidden sm:block">即時清點與極速結帳</span>
            </div>
          </div>

          {/* Tab Navigation (Desktop / Tablet) */}
          <nav className="hidden md:flex items-center space-x-1">
            {tabs.map((tab) => {
              if (tab.roles && (!user || !tab.roles.includes(user.role))) {
                return null;
              }
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* User Info & Settings */}
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-5 h-5 rounded-full" />
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs font-medium text-slate-200 hidden sm:inline max-w-[100px] truncate">
                  {user.name}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleColors[user.role] || 'bg-slate-700 text-slate-300'}`}>
                  {user.role}
                </span>
                <button
                  onClick={onLogout}
                  title="登出"
                  className="text-slate-400 hover:text-red-400 p-0.5 ml-1 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}

            <button
              onClick={onOpenSettings}
              title="系統設定 (GAS API URL)"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur border-t border-slate-800 px-2 py-1.5 flex justify-around items-center">
        {tabs.map((tab) => {
          if (tab.roles && (!user || !tab.roles.includes(user.role))) {
            return null;
          }
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg text-[11px] font-medium transition ${
                isActive
                  ? 'text-sky-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
