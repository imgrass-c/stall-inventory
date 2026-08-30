import React from 'react';
import { Icons } from '../common/Icons';

export default function BottomNav({
  currentTab,
  setCurrentTab,
  onOpenSettings,
  pendingCount
}) {
  const tabs = [
    { id: 'pos', name: '現場收銀', icon: Icons.Pos },
    { id: 'inventory', name: '即時庫存', icon: Icons.Inventory },
    { id: 'transfer', name: '市集控管', icon: Icons.Transfer },
    { id: 'revenue', name: '營收分帳', icon: Icons.Revenue },
    { id: 'products', name: '商品名冊', icon: Icons.Products },
    { id: 'members', name: '成員審核', icon: Icons.Users, badge: pendingCount }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom">
      <div className="flex items-center justify-around py-2 px-1">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = currentTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setCurrentTab(t.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 relative ${
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
              <span className={`text-[10px] mt-0.5 ${active ? 'font-black' : 'font-medium'}`}>
                {t.name}
              </span>
            </button>
          );
        })}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600"
        >
          <Icons.CloudSync className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">設定</span>
        </button>
      </div>
    </div>
  );
}
