/**
 * 攤位即時資料庫與雙模運作服務 (Realtime Firebase & Local Dual Mode)
 */

export const STORAGE_KEYS = {
  FIREBASE_CONFIG: 'stall_firebase_config',
  GAS_URL: 'stall_gas_url',
  CURRENT_USER: 'stall_current_user',
  LOCAL_PRODUCTS: 'stall_local_products',
  LOCAL_INVENTORY: 'stall_local_inventory',
  LOCAL_SALES: 'stall_local_sales',
  LOCAL_USERS: 'stall_local_users'
};

class RealtimeService {
  constructor() {
    this.db = null;
    this.auth = null;
    this.isFirebaseReady = false;
    this.init();
  }

  init() {
    let conf = null;
    if (window.STALL_CONFIG && window.STALL_CONFIG.FIREBASE_CONFIG && window.STALL_CONFIG.FIREBASE_CONFIG.projectId) {
      conf = window.STALL_CONFIG.FIREBASE_CONFIG;
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
        if (stored) conf = JSON.parse(stored);
      } catch(e) {}
    }

    if (conf && conf.projectId && conf.apiKey && window.firebase) {
      try {
        if (!window.firebase.apps.length) {
          window.firebase.initializeApp(conf);
        }
        this.db = window.firebase.firestore();
        this.auth = window.firebase.auth();
        this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        this.isFirebaseReady = true;
      } catch(e) {
        console.error("Firebase init error:", e);
      }
    }
  }

  importConfigFile(configJsonObj) {
    if (configJsonObj.FIREBASE_CONFIG) {
      localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(configJsonObj.FIREBASE_CONFIG));
    }
    if (configJsonObj.GAS_API_URL) {
      localStorage.setItem(STORAGE_KEYS.GAS_URL, configJsonObj.GAS_API_URL);
    }
    this.init();
  }

  getConnectedProjectName() {
    if (window.STALL_CONFIG && window.STALL_CONFIG.FIREBASE_CONFIG?.projectId) {
      return window.STALL_CONFIG.FIREBASE_CONFIG.projectId + " (config.js)";
    }
    try {
      const s = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
      if (s) return JSON.parse(s).projectId || '未設定';
    } catch {}
    return '未設定';
  }

  getFirebaseConfig() {
    if (window.STALL_CONFIG && window.STALL_CONFIG.FIREBASE_CONFIG) {
      return window.STALL_CONFIG.FIREBASE_CONFIG;
    }
    try {
      const s = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
      if (s) return JSON.parse(s);
    } catch {}
    return null;
  }

  getGasUrl() {
    return window.STALL_CONFIG?.GAS_API_URL || localStorage.getItem(STORAGE_KEYS.GAS_URL) || '';
  }

  setGasUrl(url) {
    url ? localStorage.setItem(STORAGE_KEYS.GAS_URL, url.trim()) : localStorage.removeItem(STORAGE_KEYS.GAS_URL);
  }

  getCurrentUser() {
    try {
      const d = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return d ? JSON.parse(d) : null;
    } catch { return null; }
  }

  setCurrentUser(user) {
    user ? localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user)) : localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  async deleteInventoryItem(skuId) {
    if (this.isFirebaseReady && this.db) {
      const invRef = this.db.collection('inventory_master').doc(skuId);
      const doc = await invRef.get();
      let productId = null;
      if (doc.exists) {
        productId = doc.data().product_id;
      }
      await invRef.delete();

      if (productId) {
        const remSnap = await this.db.collection('inventory_master').where('product_id', '==', productId).get();
        if (remSnap.empty) {
          await this.db.collection('products').doc(productId).delete().catch(() => {});
        }
      }
      return { success: true };
    } else {
      let inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_INVENTORY) || '[]');
      let products = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PRODUCTS) || '[]');
      const target = inventory.find(i => i.sku_id === skuId);
      const productId = target ? target.product_id : null;

      inventory = inventory.filter(i => i.sku_id !== skuId);
      if (productId && !inventory.some(i => i.product_id === productId)) {
        products = products.filter(p => p.product_id !== productId);
        localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUCTS, JSON.stringify(products));
      }
      localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
      return { success: true };
    }
  }

  async deleteProduct(productId) {
    if (this.isFirebaseReady && this.db) {
      const batch = this.db.batch();
      batch.delete(this.db.collection('products').doc(productId));
      const invSnap = await this.db.collection('inventory_master').where('product_id', '==', productId).get();
      invSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      return { success: true };
    } else {
      let products = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PRODUCTS) || '[]');
      let inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_INVENTORY) || '[]');
      products = products.filter(p => p.product_id !== productId);
      inventory = inventory.filter(i => i.product_id !== productId);
      localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
      return { success: true };
    }
  }

  async clearAllTestData(options = { clearProducts: true, clearInventory: true, clearSales: true }) {
    if (options.clearProducts) localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUCTS, '[]');
    if (options.clearInventory) localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, '[]');
    if (options.clearSales) localStorage.setItem(STORAGE_KEYS.LOCAL_SALES, '[]');

    if (this.isFirebaseReady && this.db) {
      const batch = this.db.batch();
      if (options.clearProducts) {
        const pSnap = await this.db.collection('products').get();
        pSnap.forEach(d => batch.delete(d.ref));
      }
      if (options.clearInventory) {
        const iSnap = await this.db.collection('inventory_master').get();
        iSnap.forEach(d => batch.delete(d.ref));
      }
      if (options.clearSales) {
        const sSnap = await this.db.collection('sales_orders').get();
        sSnap.forEach(d => batch.delete(d.ref));
      }
      await batch.commit();
    }
    return { success: true };
  }

  async loginWithGooglePopup() {
    if (!this.isFirebaseReady || !this.auth) {
      const demoUser = {
        email: "stall_owner@stall.com",
        name: "本機主理人",
        role: "系統管理者",
        status: "已核准"
      };
      this.setCurrentUser(demoUser);
      return { success: true, user: demoUser, status: '已核准' };
    }

    try {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await this.auth.signInWithPopup(provider);
      const user = result.user;
      const cleanEmail = user.email.toLowerCase();

      return await this.verifyUser(cleanEmail, user.displayName, user.photoURL);
    } catch(err) {
      const currentHost = window.location.hostname || '目前網域';
      if (err.code === 'auth/unauthorized-domain') {
        throw new Error(`目前網域「${currentHost}」尚未加入 Firebase 授權網域！\n\n【30秒解決方式】：\n1. 前往 Firebase 控制台 -> Authentication\n2. 點選「設定 (Settings)」分頁 ->「授權網域 (Authorized domains)」\n3. 點「新增網域」並輸入「${currentHost}」即可！\n\n或是您也可以直接使用下方的「信箱表單」登入！`);
      } else if (err.code === 'auth/configuration-not-found') {
        throw new Error("您的 Firebase 尚未啟用 Google 登入。\n請至 Firebase 控制台 -> Authentication -> 登入方式 -> 啟用「Google」，或直接使用下方的「信箱快速驗證」即可！");
      } else if (err.code === 'auth/popup-closed-by-user') {
        throw new Error("登入視窗已關閉");
      } else {
        throw new Error(err.message || 'Google 登入發生錯誤');
      }
    }
  }

  async verifyUser(email, name = '', photo = '') {
    const cleanEmail = email.trim().toLowerCase();
    if (this.isFirebaseReady && this.db) {
      const userRef = this.db.collection('users').doc(cleanEmail);
      const doc = await userRef.get();
      
      if (doc.exists) {
        const data = doc.data();
        const userObj = {
          email: cleanEmail,
          name: data.name || name || cleanEmail.split('@')[0],
          picture: data.picture || photo,
          role: data.role || '一般使用者',
          status: data.status || '待審核'
        };
        return { success: true, user: userObj, status: userObj.status };
      } else {
        const allUsersSnap = await this.db.collection('users').get();
        const isFirstUser = allUsersSnap.empty;
        const newUserData = {
          email: cleanEmail,
          name: name || cleanEmail.split('@')[0],
          picture: photo || '',
          role: isFirstUser ? '系統管理者' : '一般使用者',
          status: isFirstUser ? '已核准' : '待審核',
          created_at: new Date().toISOString()
        };
        await userRef.set(newUserData);
        return { success: true, user: newUserData, status: newUserData.status, isNew: true };
      }
    } else {
      let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_USERS) || '[]');
      let found = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!found) {
        found = {
          email: cleanEmail,
          name: name || cleanEmail.split('@')[0],
          role: users.length === 0 ? '系統管理者' : '一般使用者',
          status: users.length === 0 ? '已核准' : '待審核'
        };
        users.push(found);
        localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));
      }
      return { success: true, user: found, status: found.status };
    }
  }

  listenUserStatus(email, onStatusChanged) {
    if (this.isFirebaseReady && this.db) {
      const cleanEmail = email.trim().toLowerCase();
      return this.db.collection('users').doc(cleanEmail).onSnapshot(doc => {
        if (doc.exists) onStatusChanged(doc.data());
      });
    }
    return () => {};
  }

  subscribeUsers(onUpdate) {
    if (this.isFirebaseReady && this.db) {
      return this.db.collection('users').onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        onUpdate(list);
      }, () => {
        onUpdate(JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_USERS) || '[]'));
      });
    } else {
      onUpdate(JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_USERS) || '[]'));
      return () => {};
    }
  }

  async updateUserRole(email, newRole, newStatus) {
    const cleanEmail = email.trim().toLowerCase();
    if (this.isFirebaseReady && this.db) {
      await this.db.collection('users').doc(cleanEmail).update({
        role: newRole,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      return { success: true };
    } else {
      let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_USERS) || '[]');
      const u = users.find(x => x.email.toLowerCase() === cleanEmail);
      if (u) {
        if (newRole) u.role = newRole;
        if (newStatus) u.status = newStatus;
        localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));
      }
      return { success: true };
    }
  }

  async preAddMember(email, name, role = '一般使用者', status = '已核准') {
    const cleanEmail = email.trim().toLowerCase();
    const userData = {
      email: cleanEmail,
      name: name.trim() || cleanEmail.split('@')[0],
      role: role,
      status: status,
      created_at: new Date().toISOString()
    };

    if (this.isFirebaseReady && this.db) {
      await this.db.collection('users').doc(cleanEmail).set(userData, { merge: true });
      return { success: true };
    } else {
      let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_USERS) || '[]');
      const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
      if (idx >= 0) users[idx] = userData;
      else users.push(userData);
      localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));
      return { success: true };
    }
  }

  async deleteMember(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (this.isFirebaseReady && this.db) {
      await this.db.collection('users').doc(cleanEmail).delete();
      return { success: true };
    } else {
      let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_USERS) || '[]');
      users = users.filter(u => u.email.toLowerCase() !== cleanEmail);
      localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));
      return { success: true };
    }
  }

  subscribeInventory(onUpdate) {
    if (this.isFirebaseReady && this.db) {
      return this.db.collection('inventory_master').onSnapshot(async (snapshot) => {
        const inventory = [];
        snapshot.forEach(doc => inventory.push(doc.data()));
        
        const prodSnap = await this.db.collection('products').get();
        const products = [];
        prodSnap.forEach(doc => products.push(doc.data()));

        onUpdate({ products, inventory, source: 'firebase' });
      }, () => {
        onUpdate(this.getLocalData());
      });
    } else {
      onUpdate(this.getLocalData());
      return () => {};
    }
  }

  getLocalData() {
    return {
      products: JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PRODUCTS) || '[]'),
      inventory: JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_INVENTORY) || '[]'),
      source: 'local'
    };
  }

  async addProductWithSkus(productData, skus) {
    if (this.isFirebaseReady && this.db) {
      const batch = this.db.batch();
      const prodRef = this.db.collection('products').doc(productData.product_id);
      batch.set(prodRef, productData, { merge: true });

      skus.forEach(sku => {
        const invRef = this.db.collection('inventory_master').doc(sku.sku_id);
        batch.set(invRef, sku, { merge: true });
      });

      await batch.commit();
      return { success: true };
    } else {
      let products = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PRODUCTS) || '[]');
      let inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_INVENTORY) || '[]');

      products = products.filter(p => p.product_id !== productData.product_id);
      products.push(productData);

      const newSkuIds = skus.map(s => s.sku_id);
      inventory = inventory.filter(i => !newSkuIds.includes(i.sku_id));
      inventory.push(...skus);

      localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
      return { success: true };
    }
  }

  async checkoutSale(orderData) {
    const { items, paymentMethod, discountAmount, originalTotal, finalTotal, operator, eventName } = orderData;
    const now = new Date();
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const saleRecord = {
      order_id: orderId,
      timestamp: now.toISOString(),
      date: now.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
      items,
      payment_method: paymentMethod,
      total_amount: originalTotal,
      discount_amount: discountAmount,
      final_amount: finalTotal,
      operator: operator || '現場收銀',
      eventName: eventName || '一般現場',
      status: '已完成'
    };

    if (this.isFirebaseReady && this.db) {
      const batch = this.db.batch();
      const saleRef = this.db.collection('sales_orders').doc(orderId);
      batch.set(saleRef, saleRecord);

      for (const item of items) {
        const invRef = this.db.collection('inventory_master').doc(item.skuId);
        batch.update(invRef, {
          stall_qty: window.firebase.firestore.FieldValue.increment(-item.qty),
          total_qty: window.firebase.firestore.FieldValue.increment(-item.qty),
          updated_at: new Date().toISOString()
        });
      }
      await batch.commit();
      return { success: true, orderId };
    } else {
      let sales = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_SALES) || '[]');
      sales.unshift(saleRecord);
      localStorage.setItem(STORAGE_KEYS.LOCAL_SALES, JSON.stringify(sales));

      let inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_INVENTORY) || '[]');
      items.forEach(sold => {
        const target = inventory.find(i => i.sku_id === sold.skuId);
        if (target) {
          target.stall_qty = Math.max(0, target.stall_qty - sold.qty);
          target.total_qty = (target.home_qty || 0) + target.stall_qty;
        }
      });
      localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
      return { success: true, orderId };
    }
  }

  async transferInventory(transfers, direction, operator) {
    if (this.isFirebaseReady && this.db) {
      const batch = this.db.batch();
      for (const t of transfers) {
        const invRef = this.db.collection('inventory_master').doc(t.skuId);
        const qty = Number(t.qty);
        if (direction === 'home_to_stall') {
          batch.update(invRef, {
            home_qty: window.firebase.firestore.FieldValue.increment(-qty),
            stall_qty: window.firebase.firestore.FieldValue.increment(qty),
            updated_at: new Date().toISOString()
          });
        } else {
          batch.update(invRef, {
            home_qty: window.firebase.firestore.FieldValue.increment(qty),
            stall_qty: window.firebase.firestore.FieldValue.increment(-qty),
            updated_at: new Date().toISOString()
          });
        }
      }
      await batch.commit();
      return { success: true };
    } else {
      let inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_INVENTORY) || '[]');
      transfers.forEach(t => {
        const target = inventory.find(i => i.sku_id === t.skuId);
        if (target) {
          const qty = Number(t.qty);
          if (direction === 'home_to_stall') {
            target.home_qty = Math.max(0, target.home_qty - qty);
            target.stall_qty += qty;
          } else {
            target.home_qty += qty;
            target.stall_qty = Math.max(0, target.stall_qty - qty);
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
      return { success: true };
    }
  }

  async getTodaySales() {
    const todayStr = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    let sales = [];
    if (this.isFirebaseReady && this.db) {
      const snap = await this.db.collection('sales_orders').where('date', '==', todayStr).get();
      snap.forEach(doc => sales.push(doc.data()));
    } else {
      const allSales = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_SALES) || '[]');
      sales = allSales.filter(s => s.date === todayStr);
    }
    return sales;
  }

  async getMonthSales(yearMonth) {
    let sales = [];
    if (this.isFirebaseReady && this.db) {
      const snap = await this.db.collection('sales_orders').get();
      snap.forEach(doc => {
        const d = doc.data();
        if (d.date && d.date.startsWith(yearMonth)) sales.push(d);
      });
    } else {
      const allSales = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_SALES) || '[]');
      sales = allSales.filter(s => s.date && s.date.startsWith(yearMonth));
    }
    return sales;
  }

  async getEventSales(eventName) {
    let sales = [];
    if (this.isFirebaseReady && this.db) {
      const snap = await this.db.collection('sales_orders').where('eventName', '==', eventName).get();
      snap.forEach(doc => sales.push(doc.data()));
    } else {
      const allSales = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_SALES) || '[]');
      sales = allSales.filter(s => s.eventName === eventName);
    }
    return sales;
  }

  async getAllEvents() {
    const events = new Set();
    if (this.isFirebaseReady && this.db) {
      const snap = await this.db.collection('sales_orders').get();
      snap.forEach(doc => {
        const ev = doc.data().eventName;
        if (ev) events.add(ev);
      });
    } else {
      const allSales = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_SALES) || '[]');
      allSales.forEach(s => {
        if (s.eventName) events.add(s.eventName);
      });
    }
    return Array.from(events);
  }

  async voidSale(orderId, operator = '管理者') {
    if (this.isFirebaseReady && this.db) {
      const orderRef = this.db.collection('sales_orders').doc(orderId);
      const doc = await orderRef.get();
      if (!doc.exists) throw new Error("找不到該訂單");
      const orderData = doc.data();
      if (orderData.status === '已作廢') throw new Error("該訂單已是作廢狀態");

      const batch = this.db.batch();
      batch.update(orderRef, {
        status: '已作廢',
        voided_at: new Date().toISOString(),
        voided_by: operator
      });

      for (const item of (orderData.items || [])) {
        const invRef = this.db.collection('inventory_master').doc(item.skuId);
        batch.update(invRef, {
          stall_qty: window.firebase.firestore.FieldValue.increment(item.qty),
          total_qty: window.firebase.firestore.FieldValue.increment(item.qty),
          updated_at: new Date().toISOString()
        });
      }
      await batch.commit();
      return { success: true };
    } else {
      let sales = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_SALES) || '[]');
      const target = sales.find(s => s.order_id === orderId);
      if (target) {
        target.status = '已作廢';
        target.voided_at = new Date().toISOString();
        target.voided_by = operator;
        localStorage.setItem(STORAGE_KEYS.LOCAL_SALES, JSON.stringify(sales));

        let inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_INVENTORY) || '[]');
        (target.items || []).forEach(item => {
          const invItem = inventory.find(i => i.sku_id === item.skuId);
          if (invItem) {
            invItem.stall_qty += item.qty;
            invItem.total_qty = (invItem.home_qty || 0) + invItem.stall_qty;
          }
        });
        localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
      }
      return { success: true };
    }
  }

  async syncToGoogleSheets(type = 'all') {
    const gasUrl = this.getGasUrl();
    if (!gasUrl) {
      return { success: false, error: "未設定 Google Apps Script URL，無法連線試算表" };
    }

    let products = [], inventory = [], sales = [], users = [];
    if (this.isFirebaseReady && this.db) {
      if (type === 'all' || type === 'products') {
        const pSnap = await this.db.collection('products').get();
        pSnap.forEach(d => products.push(d.data()));
      }
      if (type === 'all' || type === 'inventory') {
        const iSnap = await this.db.collection('inventory_master').get();
        iSnap.forEach(d => inventory.push(d.data()));
      }
      if (type === 'all' || type === 'sales') {
        const sSnap = await this.db.collection('sales_orders').get();
        sSnap.forEach(d => sales.push(d.data()));
      }
      if (type === 'all' || type === 'users') {
        const uSnap = await this.db.collection('users').get();
        uSnap.forEach(d => users.push(d.data()));
      }
    } else {
      products = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PRODUCTS) || '[]');
      inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_INVENTORY) || '[]');
      sales = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_SALES) || '[]');
      users = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_USERS) || '[]');
    }

    try {
      const payload = {
        action: 'fullSync',
        data: { products, inventory, sales, users, syncType: type, timestamp: new Date().toISOString() }
      };

      const resp = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const resJson = await resp.json();
      return resJson;
    } catch(err) {
      return { success: false, error: err.message };
    }
  }

  async saveDailyReport(reportData) {
    const gasUrl = this.getGasUrl();
    if (gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveDailyReport', data: reportData })
        });
      } catch(e) {}
    }
    return { success: true };
  }
}

export const realtime = new RealtimeService();
