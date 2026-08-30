import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PosView from './components/PosView';
import InventoryView from './components/InventoryView';
import TransferView from './components/TransferView';
import RevenueView from './components/RevenueView';
import ProductManageView from './components/ProductManageView';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import { apiService } from './services/api';
import { AlertCircle, ShoppingBag, Boxes, ArrowLeftRight, BarChart3, Settings, Store } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('pos');
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(false);

  useEffect(() => {
    const user = apiService.getCurrentUser();
    if (user && user.status === '已核准') {
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
    }
  }, []);

  const loadInventoryData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiService.callApi('getInventory');
      if (res && res.success) {
        setProducts(res.products || []);
        setInventory(res.inventory || []);
        setIsOnlineMode(Boolean(apiService.getApiUrl()));
      } else {
        setError(res.error || '無法取得庫存資料');
      }
    } catch (err) {
      setError(err.message || '連線發生錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadInventoryData();
    }
  }, [currentUser]);

  // 1. 現場結帳扣庫
  const handleCheckout = async (orderPayload) => {
    setInventory(prevInv => {
      return prevInv.map(item => {
        const cartMatch = orderPayload.items.find(ci => ci.skuId === item.sku_id);
        if (cartMatch) {
          const newStall = item.stall_qty - cartMatch.qty;
          return {
            ...item,
            stall_qty: newStall,
            total_qty: (Number(item.home_qty) || 0) + newStall
          };
        }
        return item;
      });
    });

    const res = await apiService.callApi('checkoutSale', orderPayload);
    if (!res || !res.success) {
      console.error("同步至後端失敗:", res?.error);
      await loadInventoryData();
    }
    return res;
  };

  // 2. 雙向庫存調撥
  const handleTransfer = async (transferPayload) => {
    setInventory(prevInv => {
      return prevInv.map(item => {
        const trMatch = transferPayload.transfers.find(t => t.skuId === item.sku_id);
        if (trMatch) {
          const qty = Number(trMatch.qty) || 0;
          let newHome = item.home_qty;
          let newStall = item.stall_qty;
          if (trMatch.direction === 'home_to_stall') {
            newHome = Math.max(0, newHome - qty);
            newStall += qty;
          } else {
            newHome += qty;
            newStall = Math.max(0, newStall - qty);
          }
          return {
            ...item,
            home_qty: newHome,
            stall_qty: newStall,
            total_qty: newHome + newStall
          };
        }
        return item;
      });
    });

    const res = await apiService.callApi('transferStock', transferPayload);
    return res;
  };

  // 3. 新增商品與規格
  const handleAddProduct = async (productPayload) => {
    const res = await apiService.callApi('addProductWithVariants', productPayload);
    if (res && res.success) {
      await loadInventoryData();
    }
    return res;
  };

  // 4. 作廢銷售單回補
  const handleVoidSale = async (orderId, operator) => {
    const res = await apiService.callApi('voidSale', { orderId, operator });
    if (res && res.success) {
      await loadInventoryData();
    }
    return res;
  };

  // 5. 今日營收與多重視角分析
  const handleFetchTodaySales = async () => {
    return await apiService.callApi('getTodaySales');
  };

  const handleFetchMonthSales = async (targetMonth) => {
    return await apiService.callApi('getMonthSales', { month: targetMonth });
  };

  const handleFetchEventSales = async (targetEvent) => {
    return await apiService.callApi('getEventSales', { eventName: targetEvent });
  };

  const handleFetchAllEvents = async () => {
    return await apiService.callApi('getAllEvents');
  };

  const handleSaveDailyReport = async (reportData) => {
    return await apiService.callApi('saveDailyReport', reportData);
  };

  const handleSyncSheets = async () => {
    return await apiService.callApi('fullSyncBackup');
  };

  const handleLogout = () => {
    apiService.setCurrentUser(null);
    setCurrentUser(null);
  };

  const navItems = [
    { id: 'pos', label: '現場收銀 POS', icon: ShoppingBag },
    { id: 'inventory', label: '即時庫存清點', icon: Boxes },
    { id: 'transfer', label: '庫存調撥作業', icon: ArrowLeftRight },
    { id: 'revenue', label: '今日營收統計', icon: BarChart3 },
    ...(currentUser && ['系統管理者', '編輯者'].includes(currentUser.role) ? [
      { id: 'products', label: '商品與規格管理', icon: Settings }
    ] : [])
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
      
      {/* 左側固定導航欄 (Fixed Left Sidebar - SaaS Style) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={currentUser}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        onReload={loadInventoryData}
        isLoading={isLoading}
        isOnlineMode={isOnlineMode}
      />

      {/* 右側動態內容區域 */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 頂部 Header */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-rose-500 text-white flex items-center justify-center">
                <Store className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-sm">STALL POS</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
              <span>系統儀表板</span>
              <span>/</span>
              <span className="font-semibold text-slate-700">
                {navItems.find(n => n.id === currentTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
              isOnlineMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnlineMode ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {isOnlineMode ? '雲端即時同步中' : '本地離線運作'}
            </span>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>對接設定</span>
            </button>
          </div>
        </header>

        {/* 錯誤提示 */}
        {error && (
          <div className="mx-4 sm:mx-8 mt-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-xs text-rose-700 underline font-bold"
            >
              檢查設定
            </button>
          </div>
        )}

        {/* 主工作視圖 */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto pb-24 md:pb-8">
          {currentTab === 'pos' && (
            <PosView
              products={products}
              inventory={inventory}
              onCheckout={handleCheckout}
              user={currentUser}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              inventory={inventory}
              onRefresh={loadInventoryData}
              isLoading={isLoading}
            />
          )}

          {currentTab === 'transfer' && (
            <TransferView
              inventory={inventory}
              onTransfer={handleTransfer}
              user={currentUser}
            />
          )}

          {currentTab === 'revenue' && (
            <RevenueView
              onFetchTodaySales={handleFetchTodaySales}
              onFetchMonthSales={handleFetchMonthSales}
              onFetchEventSales={handleFetchEventSales}
              onFetchAllEvents={handleFetchAllEvents}
              onSaveDailyReport={handleSaveDailyReport}
              onVoidSale={handleVoidSale}
              onSyncSheets={handleSyncSheets}
              user={currentUser}
            />
          )}

          {currentTab === 'products' && (
            <ProductManageView
              onAddProduct={handleAddProduct}
              inventory={inventory}
              user={currentUser}
            />
          )}
        </main>

        {/* 行動端底部導覽列 */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center shadow-lg">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex flex-col items-center flex-1 py-1 text-[10px] font-medium transition ${
                  isActive ? 'text-rose-600 font-bold' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* 登入彈窗 (若未登入) */}
      {!currentUser && (
        <AuthModal
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            loadInventoryData();
          }}
          onClose={() => {}}
        />
      )}

      {/* 系統設定彈窗 */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          user={currentUser}
          onReload={loadInventoryData}
        />
      )}
    </div>
  );
}
