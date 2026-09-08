import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import AuthModal from './components/auth/AuthModal';
import PosView from './components/pos/PosView';
import InventoryView from './components/inventory/InventoryView';
import TransferView from './components/transfer/TransferView';
import RevenueView from './components/revenue/RevenueView';
import ProductManageView from './components/products/ProductManageView';
import UserManageView from './components/users/UserManageView';
import SettingsModal from './components/settings/SettingsModal';
import { realtime } from './services/realtime';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('pos');
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [events, setEvents] = useState([]);
  const [isFirebaseLive, setIsFirebaseLive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const u = realtime.getCurrentUser();
    if (u && u.status === '已核准') {
      setCurrentUser(u);
    } else {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = realtime.subscribeInventory(({ products, inventory, source }) => {
      setProducts(products || []);
      setInventory(inventory || []);
      setIsFirebaseLive(source === 'firebase');
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const unsubUsers = realtime.subscribeUsers((usersList) => {
      const pending = (usersList || []).filter(u => u.status === '待審核');
      setPendingCount(pending.length);
    });
    return () => unsubUsers();
  }, [currentUser]);

  useEffect(() => {
    const unsubEvents = realtime.subscribeEvents((eventsList) => {
      setEvents(eventsList || []);
    });
    return () => unsubEvents();
  }, [currentUser]);

  const handleLogout = () => {
    realtime.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleClearAllData = async () => {
    await realtime.clearAllTestData();
    setProducts([]);
    setInventory([]);
  };

  const isAdmin = currentUser?.role === '系統管理者';
  const isEditor = currentUser?.role === '編輯者' || isAdmin;

  // 權限重導保護：若當前分頁超出該成員權限範圍，自動回退到現場收銀
  useEffect(() => {
    if (currentUser) {
      if (currentTab === 'members' && !isAdmin) {
        setCurrentTab('pos');
      } else if (['transfer', 'revenue', 'products'].includes(currentTab) && !isEditor) {
        setCurrentTab('pos');
      }
    }
  }, [currentTab, currentUser, isAdmin, isEditor]);

  return (
    <div className="min-h-screen flex bg-surface-50 text-slate-900 font-sans select-none pb-28 md:pb-0">
      
      {/* 登入彈窗 */}
      {!currentUser && (
        <AuthModal
          onLoginSuccess={(user) => setCurrentUser(user)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* 桌面側邊欄 */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isFirebaseLive={isFirebaseLive}
        pendingCount={pendingCount}
      />

      {/* 主要工作區 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        {currentTab === 'pos' && (
          <PosView
            products={products}
            inventory={inventory}
            onCheckout={(order) => realtime.checkoutSale(order)}
            onCheckoutSale={(order) => realtime.checkoutSale(order)}
            allEvents={events}
            user={currentUser}
            onNavigateToProducts={() => setCurrentTab('products')}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryView
            inventory={inventory}
            onSyncSheets={() => realtime.syncToGoogleSheets('inventory')}
            isAdmin={isAdmin}
            isEditor={isEditor}
            onClearData={handleClearAllData}
            onDeleteItem={(skuId) => realtime.deleteInventoryItem(skuId)}
            onNavigateToProducts={() => setCurrentTab('products')}
            user={currentUser}
          />
        )}

        {currentTab === 'transfer' && isEditor && (
          <TransferView
            inventory={inventory}
            onTransfer={(t, dir, op) => realtime.transferInventory(t, dir, op)}
            user={currentUser}
          />
        )}

        {currentTab === 'revenue' && isEditor && (
          <RevenueView
            onFetchTodaySales={() => realtime.getTodaySales()}
            onFetchMonthSales={(m) => realtime.getMonthSales(m)}
            onFetchEventSales={(ev) => realtime.getEventSales(ev)}
            onFetchAllEvents={() => realtime.getAllEvents()}
            onSaveDailyReport={(data) => realtime.saveDailyReport(data)}
            onVoidSale={(oid, op) => realtime.voidSale(oid, op)}
            onSyncSheets={() => realtime.syncToGoogleSheets('sales')}
            isAdmin={isAdmin}
            isEditor={isEditor}
            user={currentUser}
          />
        )}

        {currentTab === 'products' && isEditor && (
          <ProductManageView
            onAddProduct={(p, s) => realtime.addProductWithSkus(p, s)}
            onUpdateProduct={(p, s, d) => realtime.updateProductWithSkus(p, s, d)}
            inventory={inventory}
            products={products}
            onSyncSheets={() => realtime.syncToGoogleSheets('products')}
            onClearData={handleClearAllData}
            onDeleteProduct={(pid) => realtime.deleteProduct(pid)}
            onDeleteSku={(skuId) => realtime.deleteInventoryItem(skuId)}
            user={currentUser}
          />
        )}

        {currentTab === 'members' && isAdmin && (
          <UserManageView
            user={currentUser}
            onSyncSheets={() => realtime.syncToGoogleSheets('users')}
          />
        )}
      </main>

      {/* 手機底部導航列 */}
      <BottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={currentUser}
        onOpenSettings={() => setIsSettingsOpen(true)}
        pendingCount={pendingCount}
      />

      {/* 系統設定 Modal (只有系統管理者可見) */}
      {isSettingsOpen && isAdmin && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          user={currentUser}
          onReload={() => window.location.reload()}
          onFullSyncSheets={() => realtime.syncToGoogleSheets('all')}
          onClearAllData={handleClearAllData}
          inventory={inventory}
          products={products}
        />
      )}
    </div>
  );
}
