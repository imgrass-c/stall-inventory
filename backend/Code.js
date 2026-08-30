/**
 * ====================================================================
 * 攤位清點與庫存管理系統 - Google Apps Script 後端 API (智慧防呆版)
 * ====================================================================
 */

const SPREADSHEET_ID = ""; // 若從試算表內擴充功能開啟可留空，若獨立專案請填入試算表ID

function getSpreadsheetInstance() {
  let ss = null;
  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (e) {
      throw new Error("無法透過 SPREADSHEET_ID 開啟試算表，請確認 ID 是否正確。");
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    throw new Error("找不到綁定的 Google 試算表！請從 Google 試算表「擴充功能 ➔ Apps Script」開啟部署，或在最上方填入 SPREADSHEET_ID。");
  }
  return ss;
}

function getSheet(sheetName) {
  const ss = getSpreadsheetInstance();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("找不到工作表: " + sheetName + "，請先執行 initDatabase。");
  }
  return sheet;
}

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  let params = {};
  if (method === "POST") {
    try {
      if (e.postData && e.postData.contents) {
        params = JSON.parse(e.postData.contents);
      }
    } catch (err) {
      params = e.parameter || {};
    }
  } else {
    params = e.parameter || {};
  }

  const action = params.action || "ping";
  let response = { success: false, action: action };

  try {
    switch (action) {
      case "ping":
        response = { success: true, message: "Stall Inventory API is active!", timestamp: new Date() };
        break;
      case "verifyUser":
        response = handleVerifyUser(params);
        break;
      case "getInventory":
        response = handleGetInventory(params);
        break;
      case "addProductWithVariants":
        response = handleAddProductWithVariants(params);
        break;
      case "transferStock":
        response = handleTransferStock(params);
        break;
      case "checkoutSale":
        response = handleCheckoutSale(params);
        break;
      case "voidSale":
        response = handleVoidSale(params);
        break;
      case "getTodaySales":
        response = handleGetTodaySales(params);
        break;
      case "getUsers":
        response = handleGetUsers(params);
        break;
      case "updateUserRole":
        response = handleUpdateUserRole(params);
        break;
      case "fullSyncBackup":
      case "backupFromFirebase":
        response = handleFullSyncBackup(params);
        break;
      default:
        response = { success: false, error: "未知的 Action: " + action };
    }
  } catch (error) {
    Logger.log("API Error: " + error.toString());
    response = { success: false, error: error.message || error.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map((row, idx) => {
    let obj = { _rowIndex: idx + 2 };
    headers.forEach((header, hIdx) => {
      obj[header] = row[hIdx];
    });
    return obj;
  });
}

function formatDayString(date) {
  return Utilities.formatDate(new Date(date), "GMT+8", "yyyy-MM-dd");
}

// -------------------------------------------------------------
// 1. 驗證與審核使用者
// -------------------------------------------------------------
function handleVerifyUser(params) {
  const email = (params.email || "").trim().toLowerCase();
  const name = params.name || "";
  const picture = params.picture || "";

  if (!email) return { success: false, error: "缺少 Email 參數" };

  const sheet = getSheet("Users_Config");
  const users = sheetToObjects(sheet);
  const foundUser = users.find(u => (u.email || "").trim().toLowerCase() === email);

  if (foundUser) {
    const status = foundUser.status || "待審核";
    const role = foundUser.role || "未設定";

    if (name || picture) {
      const row = foundUser._rowIndex;
      if (name) sheet.getRange(row, 2).setValue(name);
      if (picture) sheet.getRange(row, 3).setValue(picture);
    }

    return {
      success: true,
      exists: true,
      status: status,
      role: role,
      user: {
        email: email,
        name: foundUser.name || name,
        picture: foundUser.picture || picture,
        role: role,
        status: status
      }
    };
  } else {
    const now = new Date();
    sheet.appendRow([email, name, picture, "未設定", "待審核", now, "", "新註冊申請"]);
    return {
      success: true,
      exists: false,
      status: "待審核",
      role: "未設定",
      message: "您的帳號已送出申請，請通知攤主在 Google 試算表中審核！",
      user: { email, name, picture, role: "未設定", status: "待審核" }
    };
  }
}

// -------------------------------------------------------------
// 2. 取得商品與庫存 (支援 ID 自動補齊防呆)
// -------------------------------------------------------------
function handleGetInventory(params) {
  const prodSheet = getSheet("Products");
  const invSheet = getSheet("Inventory_Master");

  let products = sheetToObjects(prodSheet).filter(p => p.status !== "archived" && (p.name || "").trim() !== "");
  let inventory = sheetToObjects(invSheet).filter(i => (i.product_name || "").trim() !== "");

  // 智慧防呆：如果使用者在 Sheet 手動填寫時漏填了 product_id 或 sku_id，自動依名稱補齊
  products = products.map((p, idx) => {
    const pId = p.product_id ? String(p.product_id).trim() : ("PROD-" + (idx + 1));
    return {
      ...p,
      product_id: pId
    };
  });

  inventory = inventory.map((inv, idx) => {
    const pName = String(inv.product_name || "").trim();
    const vName = String(inv.variant_name || "標準").trim();
    
    // 若沒填 product_id，從 products 表尋找名稱對應，或直接以商品名稱為 ID
    let matchedProd = products.find(p => String(p.name).trim() === pName);
    const pId = inv.product_id ? String(inv.product_id).trim() : (matchedProd ? matchedProd.product_id : ("PROD-" + pName));

    // 若沒填 sku_id，自動組合成 商品ID-規格名
    const skuId = inv.sku_id ? String(inv.sku_id).trim() : (pId + "-" + vName);

    return {
      ...inv,
      sku_id: skuId,
      product_id: pId,
      product_name: pName,
      variant_name: vName,
      home_qty: Number(inv.home_qty) || 0,
      stall_qty: Number(inv.stall_qty) || 0,
      total_qty: (Number(inv.home_qty) || 0) + (Number(inv.stall_qty) || 0),
      price: Number(inv.price) || 0
    };
  });

  // 如果 Inventory_Master 裡有商品但在 Products 表中沒建立，自動為其補充虛擬商品卡片
  inventory.forEach(inv => {
    if (!products.some(p => p.product_id === inv.product_id)) {
      products.push({
        product_id: inv.product_id,
        category: inv.category || "其他",
        name: inv.product_name,
        base_price: inv.price,
        status: "active"
      });
    }
  });

  return {
    success: true,
    products: products,
    inventory: inventory,
    timestamp: new Date()
  };
}

// -------------------------------------------------------------
// 3. 網頁端新增商品與規格 (全自動生成 ID)
// -------------------------------------------------------------
function handleAddProductWithVariants(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, error: "系統忙碌中，請稍後再試" };
  }

  try {
    const prodSheet = getSheet("Products");
    const invSheet = getSheet("Inventory_Master");
    const logSheet = getSheet("Inventory_Logs");

    const category = params.category || "其他";
    const name = (params.name || "").trim();
    const basePrice = Number(params.basePrice) || 0;
    const cost = Number(params.cost) || 0;
    const colorTag = params.colorTag || "#3B82F6";
    const variants = params.variants || [];
    const operator = params.operator || "admin";

    if (!name) return { success: false, error: "商品名稱不得為空" };

    const productId = "PROD-" + Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd-HHmmss");
    const now = new Date();

    prodSheet.appendRow([productId, category, name, basePrice, cost, colorTag, "active", now]);

    variants.forEach((v, index) => {
      const vName = (v.variantName || "").trim() || ("規格 " + (index + 1));
      const skuId = productId + "-" + encodeURIComponent(vName).replace(/%/g, "");
      const vPrice = Number(v.price) > 0 ? Number(v.price) : basePrice;
      const homeQty = Number(v.homeQty) || 0;
      const stallQty = Number(v.stallQty) || 0;
      const totalQty = homeQty + stallQty;
      const safetyStock = Number(v.safetyStock) || 2;

      invSheet.appendRow([
        skuId,
        productId,
        name,
        category,
        vName,
        vPrice,
        homeQty,
        stallQty,
        totalQty,
        safetyStock,
        now
      ]);

      if (homeQty > 0 || stallQty > 0) {
        logSheet.appendRow([
          "LOG-" + Utilities.formatDate(now, "GMT+8", "yyyyMMddHHmmss") + "-" + index,
          skuId,
          "進貨入庫",
          totalQty,
          "建立商品",
          "家內:" + homeQty + "/現場:" + stallQty,
          operator,
          "商品初始化",
          now,
          "初始建立規格庫存"
        ]);
      }
    });

    return { success: true, productId: productId, message: "商品與規格建立成功！" };
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// 4. 庫存調撥
// -------------------------------------------------------------
function handleTransferStock(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, error: "系統忙碌中，請稍後再試" };
  }

  try {
    const invSheet = getSheet("Inventory_Master");
    const logSheet = getSheet("Inventory_Logs");
    const transfers = params.transfers || [];
    const operator = params.operator || "user";
    const eventName = params.eventName || "市集調撥";
    const now = new Date();

    const invData = invSheet.getDataRange().getValues();
    if (invData.length <= 1) return { success: false, error: "無庫存資料" };

    const headers = invData[0];
    const skuCol = headers.indexOf("sku_id");
    const nameCol = headers.indexOf("product_name");
    const variantCol = headers.indexOf("variant_name");
    const homeCol = headers.indexOf("home_qty");
    const stallCol = headers.indexOf("stall_qty");
    const totalCol = headers.indexOf("total_qty");
    const updatedCol = headers.indexOf("updated_at");

    let updatedCount = 0;

    transfers.forEach(item => {
      const targetSku = item.skuId;
      const qty = Number(item.qty) || 0;
      const direction = item.direction;

      if (qty <= 0) return;

      for (let r = 1; r < invData.length; r++) {
        const rowSku = invData[r][skuCol] || (invData[r][nameCol] + "-" + invData[r][variantCol]);
        if (rowSku === targetSku) {
          let currentHome = Number(invData[r][homeCol]) || 0;
          let currentStall = Number(invData[r][stallCol]) || 0;

          if (direction === "home_to_stall") {
            currentHome -= qty;
            currentStall += qty;
          } else {
            currentHome += qty;
            currentStall -= qty;
          }

          const newTotal = currentHome + currentStall;

          invSheet.getRange(r + 1, homeCol + 1).setValue(currentHome);
          invSheet.getRange(r + 1, stallCol + 1).setValue(currentStall);
          if (totalCol !== -1) invSheet.getRange(r + 1, totalCol + 1).setValue(newTotal);
          if (updatedCol !== -1) invSheet.getRange(r + 1, updatedCol + 1).setValue(now);

          logSheet.appendRow([
            "LOG-" + Utilities.formatDate(now, "GMT+8", "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random()*1000),
            targetSku,
            direction === "home_to_stall" ? "調撥出攤" : "擺攤回庫",
            qty,
            direction === "home_to_stall" ? "家內庫存" : "現場庫存",
            direction === "home_to_stall" ? "現場庫存" : "家內庫存",
            operator,
            eventName,
            now,
            item.note || ""
          ]);

          updatedCount++;
          break;
        }
      }
    });

    return { success: true, updatedCount: updatedCount, message: "庫存調撥成功！" };
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// 5. 現場結帳扣庫
// -------------------------------------------------------------
function handleCheckoutSale(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, error: "交易結帳逾時，請再試一次" };
  }

  try {
    const invSheet = getSheet("Inventory_Master");
    const salesSheet = getSheet("Sales_Orders");
    const logSheet = getSheet("Inventory_Logs");

    const items = params.items || [];
    const totalAmount = Number(params.totalAmount) || 0;
    const discountAmount = Number(params.discountAmount) || 0;
    const finalAmount = Number(params.finalAmount) || (totalAmount - discountAmount);
    const paymentMethod = params.paymentMethod || "現金";
    const operator = params.operator || "現場工作人員";
    const now = new Date();

    if (items.length === 0) return { success: false, error: "購物車為空" };

    const orderId = "SALE-" + Utilities.formatDate(now, "GMT+8", "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 100);

    const invData = invSheet.getDataRange().getValues();
    const headers = invData[0];
    const skuCol = headers.indexOf("sku_id");
    const nameCol = headers.indexOf("product_name");
    const variantCol = headers.indexOf("variant_name");
    const stallCol = headers.indexOf("stall_qty");
    const homeCol = headers.indexOf("home_qty");
    const totalCol = headers.indexOf("total_qty");
    const updatedCol = headers.indexOf("updated_at");

    let summaryArray = [];

    items.forEach(cartItem => {
      const sku = cartItem.skuId;
      const qty = Number(cartItem.qty) || 1;
      summaryArray.push(cartItem.productName + "(" + (cartItem.variantName || "標準") + ") x" + qty);

      for (let r = 1; r < invData.length; r++) {
        const rowSku = invData[r][skuCol] || (invData[r][nameCol] + "-" + invData[r][variantCol]);
        if (rowSku === sku) {
          let currentStall = Number(invData[r][stallCol]) || 0;
          let currentHome = Number(invData[r][homeCol]) || 0;
          let newStall = currentStall - qty;
          let newTotal = currentHome + newStall;

          invSheet.getRange(r + 1, stallCol + 1).setValue(newStall);
          if (totalCol !== -1) invSheet.getRange(r + 1, totalCol + 1).setValue(newTotal);
          if (updatedCol !== -1) invSheet.getRange(r + 1, updatedCol + 1).setValue(now);

          logSheet.appendRow([
            "LOG-" + Utilities.formatDate(now, "GMT+8", "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random()*1000),
            sku,
            "現場銷售",
            -qty,
            "現場庫存",
            "顧客",
            operator,
            orderId,
            now,
            "POS 結帳扣庫"
          ]);
          break;
        }
      }
    });

    const itemsSummary = summaryArray.join(", ");
    salesSheet.appendRow([
      orderId,
      "現場即時銷售",
      itemsSummary,
      JSON.stringify(items),
      totalAmount,
      discountAmount,
      finalAmount,
      paymentMethod,
      operator,
      "有效",
      now
    ]);

    return {
      success: true,
      orderId: orderId,
      finalAmount: finalAmount,
      itemsSummary: itemsSummary,
      message: "結帳完成，現場庫存已即時扣除！"
    };
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// 6. 作廢銷售單
// -------------------------------------------------------------
function handleVoidSale(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, error: "系統忙碌中" };
  }

  try {
    const salesSheet = getSheet("Sales_Orders");
    const invSheet = getSheet("Inventory_Master");
    const logSheet = getSheet("Inventory_Logs");
    const orderId = params.orderId;
    const operator = params.operator || "admin";
    const now = new Date();

    if (!orderId) return { success: false, error: "缺少訂單編號" };

    const salesData = salesSheet.getDataRange().getValues();
    const headers = salesData[0];
    const idCol = headers.indexOf("order_id");
    const statusCol = headers.indexOf("status");
    const itemsJsonCol = headers.indexOf("items_json");

    let targetRow = -1;
    let itemsJsonStr = "";

    for (let r = 1; r < salesData.length; r++) {
      if (salesData[r][idCol] === orderId) {
        if (salesData[r][statusCol] === "已作廢") return { success: false, error: "此訂單已作廢" };
        targetRow = r + 1;
        itemsJsonStr = salesData[r][itemsJsonCol];
        break;
      }
    }

    if (targetRow === -1) return { success: false, error: "找不到訂單: " + orderId };

    salesSheet.getRange(targetRow, statusCol + 1).setValue("已作廢");

    let items = [];
    try { items = JSON.parse(itemsJsonStr); } catch(e) {}

    const invData = invSheet.getDataRange().getValues();
    const invHeaders = invData[0];
    const skuCol = invHeaders.indexOf("sku_id");
    const nameCol = invHeaders.indexOf("product_name");
    const variantCol = invHeaders.indexOf("variant_name");
    const stallCol = invHeaders.indexOf("stall_qty");
    const homeCol = invHeaders.indexOf("home_qty");
    const totalCol = invHeaders.indexOf("total_qty");

    items.forEach(cartItem => {
      const sku = cartItem.skuId;
      const qty = Number(cartItem.qty) || 1;

      for (let r = 1; r < invData.length; r++) {
        const rowSku = invData[r][skuCol] || (invData[r][nameCol] + "-" + invData[r][variantCol]);
        if (rowSku === sku) {
          let currentStall = Number(invData[r][stallCol]) || 0;
          let currentHome = Number(invData[r][homeCol]) || 0;
          let newStall = currentStall + qty;
          let newTotal = currentHome + newStall;

          invSheet.getRange(r + 1, stallCol + 1).setValue(newStall);
          if (totalCol !== -1) invSheet.getRange(r + 1, totalCol + 1).setValue(newTotal);

          logSheet.appendRow([
            "LOG-" + Utilities.formatDate(now, "GMT+8", "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random()*1000),
            sku,
            "訂單作廢回補",
            qty,
            "顧客",
            "現場庫存",
            operator,
            orderId,
            now,
            "作廢銷售單回補庫存"
          ]);
          break;
        }
      }
    });

    return { success: true, message: "訂單 " + orderId + " 已作廢，現場庫存已全數自動回補！" };
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// 7. 今日營收
// -------------------------------------------------------------
function handleGetTodaySales(params) {
  const salesSheet = getSheet("Sales_Orders");
  const sales = sheetToObjects(salesSheet);
  const todayStr = formatDayString(new Date());

  const todaySales = sales.filter(s => s.timestamp && formatDayString(new Date(s.timestamp)) === todayStr);
  const validSales = todaySales.filter(s => s.status !== "已作廢");

  let totalRevenue = 0;
  let totalItemsSold = 0;
  let paymentBreakdown = { "現金": 0, "LinePay": 0, "街口": 0, "轉帳": 0, "公關贈送": 0 };
  let itemRanking = {};

  validSales.forEach(s => {
    const finalAmount = Number(s.final_amount) || Number(s.total_amount) || 0;
    totalRevenue += finalAmount;
    const pm = s.payment_method || "其他";
    paymentBreakdown[pm] = (paymentBreakdown[pm] || 0) + finalAmount;

    try {
      const items = JSON.parse(s.items_json || "[]");
      items.forEach(it => {
        const qty = Number(it.qty) || 1;
        totalItemsSold += qty;
        const key = it.productName + " (" + (it.variantName || "標準") + ")";
        itemRanking[key] = (itemRanking[key] || 0) + qty;
      });
    } catch(e) {}
  });

  const rankingList = Object.keys(itemRanking).map(key => ({
    name: key,
    qty: itemRanking[key]
  })).sort((a, b) => b.qty - a.qty);

  return {
    success: true,
    date: todayStr,
    totalRevenue: totalRevenue,
    totalOrders: validSales.length,
    totalItemsSold: totalItemsSold,
    paymentBreakdown: paymentBreakdown,
    itemRanking: rankingList,
    recentSales: todaySales.reverse()
  };
}

// -------------------------------------------------------------
// 8. 使用者管理
// -------------------------------------------------------------
function handleGetUsers(params) {
  const sheet = getSheet("Users_Config");
  return { success: true, users: sheetToObjects(sheet) };
}

function handleUpdateUserRole(params) {
  const sheet = getSheet("Users_Config");
  const email = (params.email || "").trim().toLowerCase();
  const role = params.role;
  const status = params.status;

  if (!email) return { success: false, error: "缺少 Email" };
  const users = sheetToObjects(sheet);
  const found = users.find(u => (u.email || "").trim().toLowerCase() === email);
  if (!found) return { success: false, error: "找不到該使用者" };

  const row = found._rowIndex;
  if (role) sheet.getRange(row, 4).setValue(role);
  if (status) {
    sheet.getRange(row, 5).setValue(status);
    if (status === "已核准") sheet.getRange(row, 7).setValue(new Date());
  }

  return { success: true, message: "使用者權限更新成功！" };
}

// -------------------------------------------------------------
// 9. 全系統資料備份同步至 Google 試算表 (商品 + 庫存 + 銷售 + 成員)
// -------------------------------------------------------------
function handleFullSyncBackup(params) {
  const ss = getSpreadsheetInstance();
  const targetType = params.targetType || "all";
  
  // 1. 同步 Inventory_Master
  if ((targetType === "all" || targetType === "inventory") && params.inventory && Array.isArray(params.inventory)) {
    let invSheet = ss.getSheetByName("Inventory_Master");
    if (!invSheet) invSheet = ss.insertSheet("Inventory_Master");
    invSheet.clearContents();
    invSheet.appendRow(["sku_id", "product_id", "product_name", "category", "owner_name", "variant_name", "price", "home_qty", "stall_qty", "total_qty", "safety_stock", "updated_at"]);
    
    const rows = params.inventory.map(i => [
      i.sku_id,
      i.product_id,
      i.product_name,
      i.category || "",
      i.owner_name || "共同",
      i.variant_name || "",
      Number(i.price) || 0,
      Number(i.home_qty) || 0,
      Number(i.stall_qty) || 0,
      Number(i.total_qty) || ((Number(i.home_qty)||0) + (Number(i.stall_qty)||0)),
      Number(i.safety_stock) || 2,
      i.updated_at || new Date()
    ]);
    if (rows.length > 0) {
      invSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }

  // 2. 同步 Products
  if ((targetType === "all" || targetType === "products") && params.products && Array.isArray(params.products)) {
    let prodSheet = ss.getSheetByName("Products");
    if (!prodSheet) prodSheet = ss.insertSheet("Products");
    prodSheet.clearContents();
    prodSheet.appendRow(["product_id", "category", "name", "owner_name", "base_price", "cost", "color_tag", "status", "created_at"]);
    
    const rows = params.products.map(p => [
      p.product_id,
      p.category || "其他",
      p.name,
      p.owner_name || "共同",
      Number(p.base_price) || 0,
      Number(p.cost) || 0,
      p.color_tag || "#3B82F6",
      p.status || "active",
      p.created_at || new Date()
    ]);
    if (rows.length > 0) {
      prodSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }

  // 3. 同步 Sales_Orders
  if ((targetType === "all" || targetType === "sales") && params.sales && Array.isArray(params.sales)) {
    let salesSheet = ss.getSheetByName("Sales_Orders");
    if (!salesSheet) salesSheet = ss.insertSheet("Sales_Orders");
    salesSheet.clearContents();
    salesSheet.appendRow(["order_id", "event_name", "source", "items_summary", "items_json", "total_amount", "discount_amount", "final_amount", "payment_method", "operator", "status", "timestamp"]);
    
    const rows = params.sales.map(s => {
      const itemsSummary = (s.items || []).map(i => (i.productName || '商品') + "(" + (i.variantName || '一般') + ")x" + (i.qty || 1) + (i.owner_name ? `[${i.owner_name}]` : '')).join(", ");
      return [
        s.order_id,
        s.eventName || s.event_name || "一般現場",
        s.source || "現場即時銷售",
        itemsSummary,
        JSON.stringify(s.items || []),
        Number(s.totalAmount || s.total_amount) || 0,
        Number(s.discountAmount || s.discount_amount) || 0,
        Number(s.finalAmount || s.final_amount) || 0,
        s.paymentMethod || s.payment_method || "現金",
        s.operator || "",
        s.status || "有效",
        s.timestamp || new Date()
      ];
    });
    if (rows.length > 0) {
      salesSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }

  // 4. 同步 Daily_Report (收攤日結報表)
  if ((targetType === "all" || targetType === "reports") && params.dailyReports && Array.isArray(params.dailyReports)) {
    let reportSheet = ss.getSheetByName("Daily_Report");
    if (!reportSheet) reportSheet = ss.insertSheet("Daily_Report");
    reportSheet.clearContents();
    reportSheet.appendRow(["report_id", "date", "event_name", "total_items", "total_orders", "daily_revenue", "daily_cost", "daily_profit", "profit_margin", "cash_revenue", "digital_revenue", "closed_by", "closed_at"]);
    
    const rows = params.dailyReports.map(r => [
      r.report_id || `REPORT-${r.date}`,
      r.date || "",
      r.eventName || r.event_name || "現場出攤",
      Number(r.total_items || r.totalItemsSold) || 0,
      Number(r.total_orders || r.totalOrders) || 0,
      Number(r.daily_revenue || r.totalRevenue) || 0,
      Number(r.daily_cost || r.totalCost) || 0,
      Number(r.daily_profit || r.totalProfit) || 0,
      `${r.profit_margin || r.profitMargin || 0}%`,
      Number(r.cash_revenue || r.paymentBreakdown?.['現金']) || 0,
      Number(r.digital_revenue || 0),
      r.closed_by || r.operator || "攤主",
      r.closed_at || new Date()
    ]);
    if (rows.length > 0) {
      reportSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }

  // 5. 同步 Users_Config
  if ((targetType === "all" || targetType === "users") && params.users && Array.isArray(params.users)) {
    let userSheet = ss.getSheetByName("Users_Config");
    if (!userSheet) userSheet = ss.insertSheet("Users_Config");
    userSheet.clearContents();
    userSheet.appendRow(["email", "name", "picture", "role", "status", "created_at", "approved_at", "note"]);
    const rows = params.users.map(u => [
      u.email,
      u.name || "",
      u.picture || "",
      u.role || "一般使用者",
      u.status || "已核准",
      u.created_at || new Date(),
      u.status === "已核准" ? new Date() : "",
      "Firebase 同步備份"
    ]);
    if (rows.length > 0) {
      userSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }

  return {
    success: true,
    message: "Google 試算表備份同步成功！",
    timestamp: new Date()
  };
}

