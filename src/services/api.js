/**
 * ====================================================================
 * API 通訊服務與離線/本機快取層
 * ====================================================================
 */

const STORAGE_KEYS = {
  API_URL: 'stall_inventory_api_url',
  GOOGLE_CLIENT_ID: 'stall_google_client_id',
  CURRENT_USER: 'stall_current_user',
  LOCAL_PRODUCTS: 'stall_local_products',
  LOCAL_INVENTORY: 'stall_local_inventory',
  LOCAL_SALES: 'stall_local_sales',
  LOCAL_LOGS: 'stall_local_logs',
  LOCAL_USERS: 'stall_local_users'
};

// 預設資料集（已清空為 100% 乾淨空白初始狀態）
const DEFAULT_PRODUCTS = [];
const DEFAULT_INVENTORY = [];

function calculateSalesStatsHelper(salesList = []) {
  const valid = salesList.filter(s => s.status !== '已作廢');
  let rev = 0, totalCost = 0, itemsCount = 0;
  let pmObj = { "現金": 0, "LinePay": 0, "街口": 0, "轉帳": 0, "公關贈送": 0 };
  let ranks = {};
  let ownerBreakdown = {};
  let dailyMap = {};
  let eventMap = {};

  valid.forEach(s => {
    const pm = s.payment_method || s.paymentMethod || '現金';
    const isPRGift = (pm === '公關贈送');
    const orderTotalAmount = Number(s.total_amount || s.totalAmount || 0);
    const orderFinalAmount = isPRGift ? 0 : Number(s.final_amount !== undefined ? s.final_amount : (s.finalAmount !== undefined ? s.finalAmount : (orderTotalAmount - Number(s.discount_amount || s.discountAmount || 0))));
    
    rev += orderFinalAmount;
    pmObj[pm] = (pmObj[pm] || 0) + orderFinalAmount;

    const discountRatio = (orderTotalAmount > 0) ? (orderFinalAmount / orderTotalAmount) : (isPRGift ? 0 : 1);
    const sDate = s.timestamp ? new Date(s.timestamp).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : (s.date || '未知日期');
    const sEvent = s.eventName || s.event_name || '一般現場';

    // 每日匯總
    if (!dailyMap[sDate]) {
      dailyMap[sDate] = {
        date: sDate,
        eventName: sEvent,
        totalOrders: 0,
        totalItems: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        cashRevenue: 0,
        digitalRevenue: 0
      };
    }
    dailyMap[sDate].totalOrders += 1;
    dailyMap[sDate].revenue += orderFinalAmount;
    if (pm === '現金') {
      dailyMap[sDate].cashRevenue += orderFinalAmount;
    } else if (!isPRGift) {
      dailyMap[sDate].digitalRevenue += orderFinalAmount;
    }

    // 活動場次匯總
    if (!eventMap[sEvent]) {
      eventMap[sEvent] = {
        eventName: sEvent,
        totalOrders: 0,
        totalItems: 0,
        revenue: 0,
        cost: 0,
        profit: 0
      };
    }
    eventMap[sEvent].totalOrders += 1;
    eventMap[sEvent].revenue += orderFinalAmount;

    const its = s.items || (s.items_json ? JSON.parse(s.items_json) : []);
    its.forEach(it => {
      const q = Number(it.qty) || 1;
      const originalPrice = Number(it.price) || 0;
      const itemCost = Number(it.cost) || 0;
      const itemRealSubtotal = isPRGift ? 0 : Math.round(originalPrice * q * discountRatio);
      const itemTotalCost = itemCost * q;
      const itemProfit = itemRealSubtotal - itemTotalCost;

      totalCost += itemTotalCost;
      itemsCount += q;
      dailyMap[sDate].totalItems += q;
      dailyMap[sDate].cost += itemTotalCost;
      dailyMap[sDate].profit += itemProfit;

      eventMap[sEvent].totalItems += q;
      eventMap[sEvent].cost += itemTotalCost;
      eventMap[sEvent].profit += itemProfit;

      const k = `${it.productName || '商品'} (${it.variantName || '一般'})`;
      ranks[k] = (ranks[k] || 0) + q;

      // 雙主理人分帳統計
      const owner = (it.owner_name || '共同/未指定').trim();
      if (!ownerBreakdown[owner]) {
        ownerBreakdown[owner] = { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalQty: 0, items: {}, salesRecords: [] };
      }
      ownerBreakdown[owner].totalRevenue += itemRealSubtotal;
      ownerBreakdown[owner].totalCost += itemTotalCost;
      ownerBreakdown[owner].totalProfit += itemProfit;
      ownerBreakdown[owner].totalQty += q;
      ownerBreakdown[owner].items[k] = (ownerBreakdown[owner].items[k] || 0) + q;

      ownerBreakdown[owner].salesRecords.push({
        orderId: s.order_id,
        timestamp: s.timestamp,
        date: sDate,
        eventName: sEvent,
        productName: it.productName || '商品',
        variantName: it.variantName || '一般',
        qty: q,
        originalPrice: originalPrice,
        realSubtotal: itemRealSubtotal,
        discount: Math.round((originalPrice * q) - itemRealSubtotal),
        cost: itemCost,
        paymentMethod: pm,
        operator: s.operator || '小幫手'
      });
    });
  });

  const rankingList = Object.keys(ranks).map(k => ({ name: k, qty: ranks[k] })).sort((a,b) => b.qty - a.qty);
  const dailyList = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
  const eventList = Object.values(eventMap).sort((a, b) => b.revenue - a.revenue);
  const totalProfit = rev - totalCost;
  const profitMargin = rev > 0 ? ((totalProfit / rev) * 100).toFixed(1) : 0;

  return {
    success: true,
    totalRevenue: rev,
    totalCost: totalCost,
    totalProfit: totalProfit,
    profitMargin: profitMargin,
    totalOrders: valid.length,
    totalItemsSold: itemsCount,
    paymentBreakdown: pmObj,
    ownerBreakdown: ownerBreakdown,
    itemRanking: rankingList,
    dailyBreakdown: dailyList,
    eventBreakdown: eventList,
    recentSales: [...salesList].reverse()
  };
}

export const apiService = {
  getApiUrl() {
    return localStorage.getItem(STORAGE_KEYS.API_URL) || '';
  },

  setApiUrl(url) {
    if (url) {
      localStorage.setItem(STORAGE_KEYS.API_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_URL);
    }
  },

  getGoogleClientId() {
    return localStorage.getItem(STORAGE_KEYS.GOOGLE_CLIENT_ID) || '';
  },

  setGoogleClientId(id) {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_CLIENT_ID, id.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.GOOGLE_CLIENT_ID);
    }
  },

  getCurrentUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  // 底層呼叫 GAS 或 本地 Mock
  async callApi(action, payload = {}) {
    const apiUrl = this.getApiUrl();

    // 如果沒有設定 apiUrl，進入純本地模式 (Demo / Local Storage Mode)
    if (!apiUrl) {
      return this.callLocalMock(action, payload);
    }

    try {
      const bodyData = {
        action: action,
        ...payload
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // GAS 建議格式以避開 preflight 限制
        },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();
      return data;
    } catch (err) {
      console.warn("GAS 連線失敗，切換至本地快取容錯機制:", err);
      // 網路不穩或斷線時，回退到本地快取操作
      return this.callLocalMock(action, payload);
    }
  },

  // -------------------------------------------------------------
  // 本地 Mock 與 快取機制 (離線亦可無縫操作)
  // -------------------------------------------------------------
  callLocalMock(action, payload) {
    // 初始化本地資料
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
      localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(DEFAULT_INVENTORY));
      localStorage.setItem(STORAGE_KEYS.LOCAL_SALES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LOCAL_LOGS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify([
        {
          email: "owner@gmail.com",
          name: "攤主 (系統管理者)",
          role: "系統管理者",
          status: "已核准"
        },
        {
          email: "editor@gmail.com",
          name: "夥伴 (編輯者)",
          role: "編輯者",
          status: "已核准"
        },
        {
          email: "helper@gmail.com",
          name: "小幫手 (一般使用者)",
          role: "一般使用者",
          status: "已核准"
        }
      ]));
    }

    let products = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_PRODUCTS) || '[]');
    let inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_INVENTORY) || '[]');
    let sales = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_SALES) || '[]');
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_USERS) || '[]');

    switch (action) {
      case 'verifyUser': {
        const email = (payload.email || "").trim().toLowerCase();
        const found = users.find(u => u.email.toLowerCase() === email);
        if (found) {
          return {
            success: true,
            status: found.status,
            role: found.role,
            user: found
          };
        } else {
          const newUser = {
            email: email,
            name: payload.name || email.split('@')[0],
            picture: payload.picture || "",
            role: "未設定",
            status: "待審核",
            applied_at: new Date().toISOString()
          };
          users.push(newUser);
          localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));
          return {
            success: true,
            status: "待審核",
            role: "未設定",
            user: newUser,
            message: "帳號已送出申請，請通知管理員在 Google 試算表審核開通！"
          };
        }
      }

      case 'getInventory': {
        return {
          success: true,
          products: products,
          inventory: inventory
        };
      }

      case 'addProductWithVariants': {
        const prodId = "PROD-" + Date.now().toString().slice(-6);
        const owner = (payload.owner_name || payload.operator || '共同').trim();
        const baseCost = Number(payload.cost || payload.baseCost) || 0;
        const newProd = {
          product_id: prodId,
          category: payload.category || "其他",
          name: payload.name,
          owner_name: owner,
          base_price: Number(payload.basePrice) || 0,
          cost: baseCost,
          color_tag: payload.colorTag || "#3B82F6",
          status: "active",
          created_at: new Date().toISOString()
        };
        products.push(newProd);

        const newVariants = (payload.variants || []).map((v, i) => {
          const vName = v.variantName || ("規格 " + (i + 1));
          const homeQty = Number(v.homeQty) || 0;
          const stallQty = Number(v.stallQty) || 0;
          const vCost = Number(v.cost) > 0 ? Number(v.cost) : baseCost;
          return {
            sku_id: `${prodId}-${encodeURIComponent(vName)}`,
            product_id: prodId,
            product_name: payload.name,
            category: payload.category || "其他",
            owner_name: owner,
            variant_name: vName,
            cost: vCost,
            price: Number(v.price) > 0 ? Number(v.price) : Number(payload.basePrice) || 0,
            home_qty: homeQty,
            stall_qty: stallQty,
            total_qty: homeQty + stallQty,
            safety_stock: Number(v.safetyStock) || 2
          };
        });

        inventory.push(...newVariants);

        localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUCTS, JSON.stringify(products));
        localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));

        return {
          success: true,
          productId: prodId,
          message: "商品與規格建立成功！"
        };
      }

      case 'transferStock': {
        const transfers = payload.transfers || [];
        transfers.forEach(tr => {
          const item = inventory.find(inv => inv.sku_id === tr.skuId);
          if (item) {
            const qty = Number(tr.qty) || 0;
            if (tr.direction === 'home_to_stall') {
              item.home_qty = Math.max(0, item.home_qty - qty);
              item.stall_qty += qty;
            } else {
              item.home_qty += qty;
              item.stall_qty = Math.max(0, item.stall_qty - qty);
            }
            item.total_qty = item.home_qty + item.stall_qty;
          }
        });
        localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
        return {
          success: true,
          message: "調撥成功！"
        };
      }

      case 'checkoutSale': {
        const items = payload.items || [];
        const orderId = "SALE-" + Date.now().toString().slice(-8);
        const isPRGift = payload.paymentMethod === '公關贈送';
        const finalAmount = isPRGift ? 0 : (Number(payload.finalAmount) !== undefined ? Number(payload.finalAmount) : (Number(payload.totalAmount) - Number(payload.discountAmount || 0)));

        let summary = [];
        items.forEach(cartItem => {
          summary.push(`${cartItem.productName}(${cartItem.variantName}) x${cartItem.qty}`);
          const invItem = inventory.find(inv => inv.sku_id === cartItem.skuId);
          if (invItem) {
            invItem.stall_qty = Math.max(0, invItem.stall_qty - cartItem.qty);
            invItem.total_qty = invItem.home_qty + invItem.stall_qty;
          }
        });

        const newSale = {
          order_id: orderId,
          order_type: "現場即時銷售",
          items_summary: summary.join(', '),
          items: items,
          items_json: JSON.stringify(items),
          total_amount: Number(payload.totalAmount),
          discount_amount: Number(payload.discountAmount || 0),
          final_amount: finalAmount,
          payment_method: payload.paymentMethod || "現金",
          operator: payload.operator || "工作人員",
          status: "有效",
          timestamp: new Date().toISOString()
        };

        sales.push(newSale);
        localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
        localStorage.setItem(STORAGE_KEYS.LOCAL_SALES, JSON.stringify(sales));

        return {
          success: true,
          orderId: orderId,
          finalAmount: finalAmount,
          itemsSummary: newSale.items_summary,
          message: "結帳完成，現場庫存已扣除！"
        };
      }

      case 'voidSale': {
        const orderId = payload.orderId;
        const target = sales.find(s => s.order_id === orderId);
        if (!target) return { success: false, error: "找不到訂單" };
        if (target.status === "已作廢") return { success: false, error: "訂單已作廢" };

        target.status = "已作廢";
        try {
          const items = target.items || JSON.parse(target.items_json || '[]');
          items.forEach(it => {
            const invItem = inventory.find(inv => inv.sku_id === it.skuId);
            if (invItem) {
              invItem.stall_qty += Number(it.qty) || 1;
              invItem.total_qty = invItem.home_qty + invItem.stall_qty;
            }
          });
        } catch(e) {}

        localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
        localStorage.setItem(STORAGE_KEYS.LOCAL_SALES, JSON.stringify(sales));

        return {
          success: true,
          message: `訂單 ${orderId} 已作廢，現場庫存已回補！`
        };
      }

      case 'getTodaySales': {
        const todayStr = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        const todaySales = sales.filter(s => {
          const sDate = s.timestamp ? new Date(s.timestamp).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : (s.date || '');
          return sDate === todayStr;
        });
        const res = calculateSalesStatsHelper(todaySales);
        res.date = todayStr;
        return res;
      }

      case 'getMonthSales': {
        const mStr = payload.month || new Date().toISOString().slice(0, 7);
        const monthSales = sales.filter(s => {
          const sDate = s.timestamp ? new Date(s.timestamp).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : (s.date || '');
          return sDate.startsWith(mStr);
        });
        const res = calculateSalesStatsHelper(monthSales);
        res.month = mStr;
        return res;
      }

      case 'getEventSales': {
        const evTarget = payload.eventName || 'ALL';
        const eventSales = (evTarget === 'ALL')
          ? sales
          : sales.filter(s => (s.eventName || s.event_name || '一般現場') === evTarget);
        const res = calculateSalesStatsHelper(eventSales);
        res.eventName = evTarget;
        return res;
      }

      case 'getAllEvents': {
        const evSet = new Set();
        sales.forEach(s => {
          const ev = s.eventName || s.event_name || '一般現場';
          if (ev) evSet.add(ev);
        });
        return { success: true, events: Array.from(evSet) };
      }

      case 'saveDailyReport': {
        const dateStr = payload.date || new Date().toISOString().slice(0, 10);
        const reportId = `REPORT-${dateStr}`;
        const record = {
          report_id: reportId,
          date: dateStr,
          eventName: payload.eventName || '一般現場',
          total_items: payload.totalItemsSold || 0,
          total_orders: payload.totalOrders || 0,
          daily_revenue: payload.totalRevenue || 0,
          daily_cost: payload.totalCost || 0,
          daily_profit: payload.totalProfit || 0,
          profit_margin: payload.profitMargin || 0,
          cash_revenue: payload.paymentBreakdown?.['現金'] || 0,
          digital_revenue: (payload.totalRevenue || 0) - (payload.paymentBreakdown?.['現金'] || 0),
          closed_by: payload.operator || '攤主',
          closed_at: new Date().toISOString()
        };
        let reports = JSON.parse(localStorage.getItem('stall_daily_reports') || '[]');
        reports = reports.filter(r => r.report_id !== reportId);
        reports.unshift(record);
        localStorage.setItem('stall_daily_reports', JSON.stringify(reports));
        return { success: true, report: record };
      }

      case 'deleteInventoryItem': {
        const skuId = payload.skuId;
        const target = inventory.find(i => i.sku_id === skuId);
        const productId = target ? target.product_id : null;
        inventory = inventory.filter(i => i.sku_id !== skuId);
        if (productId && !inventory.some(i => i.product_id === productId)) {
          products = products.filter(p => p.product_id !== productId);
          localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUCTS, JSON.stringify(products));
        }
        localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
        return { success: true, message: "品項已刪除" };
      }

      case 'deleteProduct': {
        const productId = payload.productId;
        products = products.filter(p => p.product_id !== productId);
        inventory = inventory.filter(i => i.product_id !== productId);
        localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUCTS, JSON.stringify(products));
        localStorage.setItem(STORAGE_KEYS.LOCAL_INVENTORY, JSON.stringify(inventory));
        return { success: true, message: "商品已刪除" };
      }

      case 'getUsers': {
        return {
          success: true,
          users: users
        };
      }

      case 'updateUserRole': {
        const user = users.find(u => u.email.toLowerCase() === (payload.email || "").toLowerCase());
        if (!user) return { success: false, error: "找不到該使用者" };
        if (payload.role) user.role = payload.role;
        if (payload.status) user.status = payload.status;
        localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));
        return { success: true, message: "權限已更新！" };
      }

      default:
        return { success: false, error: "未知的 Action: " + action };
    }
  }
};
