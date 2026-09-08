import React from 'react';
import { Icons } from '../common/Icons';

export default function BottomNav({
  currentTab,
  setCurrentTab,
  user,
  onOpenSettings,
  pendingCount
}) {
  const isAdmin = user?.role === '系統管理者';
  const isEditor = user?.role === '編輯者' || isAdmin;

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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom shadow-lg">
      <div className="flex items-center justify-between pt-2.5 pb-1 px-3 sm:px-4">
        {visibleTabs.map(t => {
          const Icon = t.icon;
          const active = currentTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setCurrentTab(t.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 relative touch-manipulation active:scale-95 transition-transform ${
                active ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'text-rose-600 stroke-[2.5]' : ''}`} />
                {t.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {t.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 whitespace-nowrap ${active ? 'font-black' : 'font-medium'}`}>
                {t.name}
              </span>
            </button>
          );
        })}

        {/* 只有系統管理者可見手機設定按鈕 */}
        {isAdmin && (
          <button
            onClick={onOpenSettings}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 touch-manipulation active:scale-95 transition-transform"
          >
            <Icons.CloudSync className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium whitespace-nowrap">設定</span>
          </button>
        )}
      </div>
    </div>
  );
}
