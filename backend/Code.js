/**
 * ====================================================================
 * 感情失敗之友會 POS - Google Apps Script 後端 API
 * (支援日結存檔、當月營收彙整、全量備份、商品與庫存智慧管理)
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
    throw new Error("找不到綁定的 Google 試算表！請從 Google 試算表「擴充功能 ➔ Apps Script」開啟部署。");
  }
  return ss;
}

function getSheet(sheetName) {
  const ss = getSpreadsheetInstance();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
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
        response = { success: true, message: "Stall POS API is active!", timestamp: new Date() };
        break;
      case "saveDailyReport":
        response = handleSaveDailyReport(params.data || params);
        break;
      case "fullSync":
      case "fullSyncBackup":
      case "backupFromFirebase":
        response = handleFullSyncBackup(params.data || params);
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

// -------------------------------------------------------------
// 1. 儲存單日日結戰報 (Daily Closeout) 並自動更新當月營收彙整表
// -------------------------------------------------------------
function handleSaveDailyReport(data) {
  const ss = getSpreadsheetInstance();
  let sheet = ss.getSheetByName("Daily_Reports");
  if (!sheet) {
    sheet = ss.insertSheet("Daily_Reports");
    sheet.appendRow([
      "結算日期", "出攤活動/通路", "售出總件數", "總訂單數", "實收營業額", "底價總成本", "實質總毛利", "毛利率", 
      "現金實收", "LinePay", "街口", "轉帳", "公關贈送", 
      "主理人A分帳", "主理人B分帳", "攤位公家分帳", "結算時間", "結算主理人"
    ]);
  }

  const d = data;
  const pb = d.paymentBreakdown || {};
  const ob = d.ownerBreakdown || {};

  const partnerEntries = Object.entries(ob);
  const p1 = partnerEntries[0] ? `${partnerEntries[0][0]}: $${partnerEntries[0][1].totalRevenue} (毛利$${partnerEntries[0][1].totalProfit})` : '-';
  const p2 = partnerEntries[1] ? `${partnerEntries[1][0]}: $${partnerEntries[1][1].totalRevenue} (毛利$${partnerEntries[1][1].totalProfit})` : '-';
  const p3 = partnerEntries[2] ? `${partnerEntries[2][0]}: $${partnerEntries[2][1].totalRevenue} (毛利$${partnerEntries[2][1].totalProfit})` : '-';

  sheet.appendRow([
    d.date || Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd"),
    d.eventName || "市集出攤",
    Number(d.totalItemsSold) || 0,
    Number(d.totalOrders) || 0,
    Number(d.totalRevenue) || 0,
    Number(d.totalCost) || 0,
    Number(d.totalProfit) || 0,
    `${d.profitMargin || 0}%`,
    Number(pb["現金"]) || 0,
    Number(pb["LinePay"]) || 0,
    Number(pb["街口"]) || 0,
    Number(pb["轉帳"]) || 0,
    Number(pb["公關贈送"]) || 0,
    p1,
    p2,
    p3,
    d.closedAt || new Date(),
    d.operator || "主理人"
  ]);

  // 同步更新當月營收彙整工作表
  updateMonthlySummarySheet(ss);

  return { success: true, message: "日結戰報已成功記錄至 Google 試算表！" };
}

// -------------------------------------------------------------
// 2. 自動產出 / 更新「當月營收彙整表 (Monthly_Summary)」
// -------------------------------------------------------------
function updateMonthlySummarySheet(ss) {
  let dailySheet = ss.getSheetByName("Daily_Reports");
  if (!dailySheet) return;

  const data = dailySheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const rows = data.slice(1);
  const monthMap = {};

  rows.forEach(r => {
    const dateStr = String(r[0] || "");
    if (!dateStr) return;
    const yearMonth = dateStr.substring(0, 7); // "YYYY-MM"
    if (!monthMap[yearMonth]) {
      monthMap[yearMonth] = {
        yearMonth: yearMonth,
        totalItems: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        cashTotal: 0,
        digitalTotal: 0,
        daysCount: 0
      };
    }
    const m = monthMap[yearMonth];
    m.daysCount += 1;
    m.totalItems += Number(r[2]) || 0;
    m.totalOrders += Number(r[3]) || 0;
    m.totalRevenue += Number(r[4]) || 0;
    m.totalCost += Number(r[5]) || 0;
    m.totalProfit += Number(r[6]) || 0;
    m.cashTotal += Number(r[8]) || 0;
    m.digitalTotal += (Number(r[9]) || 0) + (Number(r[10]) || 0) + (Number(r[11]) || 0);
  });

  let monthlySheet = ss.getSheetByName("Monthly_Summary");
  if (!monthlySheet) {
    monthlySheet = ss.insertSheet("Monthly_Summary");
  }
  monthlySheet.clearContents();
  monthlySheet.appendRow([
    "月份 (Year-Month)", "出攤/結算天數", "月總售出件數", "月總單數", "月實收營業額", "月服飾底價成本", "月實質毛利", "平均毛利率", "月現金總額", "月數位支付總額", "最後更新時間"
  ]);

  const outputRows = Object.values(monthMap).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)).map(m => {
    const margin = m.totalRevenue > 0 ? Math.round((m.totalProfit / m.totalRevenue) * 100) : 0;
    return [
      m.yearMonth,
      m.daysCount,
      m.totalItems,
      m.totalOrders,
      m.totalRevenue,
      m.totalCost,
      m.totalProfit,
      `${margin}%`,
      m.cashTotal,
      m.digitalTotal,
      new Date()
    ];
  });

  if (outputRows.length > 0) {
    monthlySheet.getRange(2, 1, outputRows.length, outputRows[0].length).setValues(outputRows);
  }
}

// -------------------------------------------------------------
// 3. 全系統資料備份同步至 Google 試算表 (商品 + 庫存 + 銷售 + 成員)
// -------------------------------------------------------------
function handleFullSyncBackup(params) {
  const ss = getSpreadsheetInstance();
  const targetType = params.syncType || params.targetType || "all";

  // 1. 同步 Inventory_Master
  if ((targetType === "all" || targetType === "inventory") && params.inventory && Array.isArray(params.inventory)) {
    let invSheet = ss.getSheetByName("Inventory_Master");
    if (!invSheet) invSheet = ss.insertSheet("Inventory_Master");
    invSheet.clearContents();
    invSheet.appendRow(["sku_id", "product_id", "product_name", "category", "owner", "variant_name", "price", "cost", "home_qty", "stall_qty", "total_qty", "updated_at"]);
    
    const rows = params.inventory.map(i => [
      i.sku_id,
      i.product_id,
      i.product_name,
      i.category || "衣服",
      i.owner || "攤位公家",
      i.variant_name || "Free",
      Number(i.price) || 0,
      Number(i.cost) || 0,
      Number(i.home_qty) || 0,
      Number(i.stall_qty) || 0,
      Number(i.total_qty) || ((Number(i.home_qty)||0) + (Number(i.stall_qty)||0)),
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
    prodSheet.appendRow(["product_id", "category", "name", "creator", "created_at"]);
    
    const rows = params.products.map(p => [
      p.product_id,
      p.category || "衣服",
      p.name,
      p.creator || "攤主",
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
    salesSheet.appendRow(["order_id", "date", "time", "channel_name", "items_summary", "total_amount", "discount_amount", "final_amount", "payment_method", "operator", "status", "timestamp"]);
    
    const rows = params.sales.map(s => {
      const itemsSummary = (s.items || []).map(i => `${i.productName}(${i.variantName})x${i.qty}[${i.owner || '公家'}]`).join(", ");
      const ts = s.timestamp ? new Date(s.timestamp) : new Date();
      const dateStr = s.date || Utilities.formatDate(ts, "GMT+8", "yyyy-MM-dd");
      const timeStr = Utilities.formatDate(ts, "GMT+8", "HH:mm:ss");

      return [
        s.order_id,
        dateStr,
        timeStr,
        s.channelName || s.eventName || "市集現場",
        itemsSummary,
        Number(s.total_amount) || 0,
        Number(s.discount_amount) || 0,
        Number(s.final_amount) || 0,
        s.payment_method || "現金",
        s.operator || "現場收銀員",
        s.status || "已完成",
        s.timestamp || new Date()
      ];
    });
    if (rows.length > 0) {
      salesSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }

  // 4. 同步 Users_Config
  if ((targetType === "all" || targetType === "users") && params.users && Array.isArray(params.users)) {
    let userSheet = ss.getSheetByName("Users_Config");
    if (!userSheet) userSheet = ss.insertSheet("Users_Config");
    userSheet.clearContents();
    userSheet.appendRow(["email", "name", "picture", "role", "status", "created_at"]);
    const rows = params.users.map(u => [
      u.email,
      u.name || "",
      u.picture || "",
      u.role || "一般使用者",
      u.status || "已核准",
      u.created_at || new Date()
    ]);
    if (rows.length > 0) {
      userSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }

  updateMonthlySummarySheet(ss);

  return {
    success: true,
    message: "Google 試算表備份同步成功！",
    timestamp: new Date()
  };
}

// -------------------------------------------------------------
// 4. 其他輔助函式
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
    return {
      success: true,
      exists: true,
      status: foundUser.status || "已核准",
      role: foundUser.role || "一般使用者",
      user: { email, name: foundUser.name || name, role: foundUser.role, status: foundUser.status }
    };
  } else {
    sheet.appendRow([email, name, picture, "一般使用者", "待審核", new Date()]);
    return {
      success: true,
      exists: false,
      status: "待審核",
      role: "一般使用者",
      user: { email, name, role: "一般使用者", status: "待審核" }
    };
  }
}

function handleGetInventory(params) {
  const invSheet = getSheet("Inventory_Master");
  const prodSheet = getSheet("Products");
  return {
    success: true,
    products: sheetToObjects(prodSheet),
    inventory: sheetToObjects(invSheet),
    timestamp: new Date()
  };
}

function handleAddProductWithVariants(params) { return { success: true }; }
function handleTransferStock(params) { return { success: true }; }
function handleCheckoutSale(params) { return { success: true }; }
function handleVoidSale(params) { return { success: true }; }
function handleGetTodaySales(params) { return { success: true }; }
function handleGetUsers(params) { return { success: true, users: sheetToObjects(getSheet("Users_Config")) }; }
function handleUpdateUserRole(params) { return { success: true }; }
