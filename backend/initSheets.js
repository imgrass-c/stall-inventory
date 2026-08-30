/**
 * ====================================================================
 * 攤位清點與庫存管理系統 - Google Sheets 自動建表與初始化腳本
 * ====================================================================
 * 
 * 使用方式：
 * 1. 在 Google 雲端硬碟建立一個新的「Google 試算表」。
 * 2. 點擊頂部選單「擴充功能」 -> 「Apps Script」。
 *    (若您是在 script.google.com 獨立建立，請在下方 SPREADSHEET_ID 填入試算表 ID)
 * 3. 將本腳本內容貼上到 Apps Script 編輯器中。
 * 4. 在上方下拉選單選擇 `initDatabase` 函式，並點擊「執行」。
 * 5. 授權執行後，試算表即會自動建立好所有分頁、欄位標題、格式與範例資料！
 */

// 若從 Google 試算表「擴充功能 ➔ Apps Script」開啟，此處可保持留空。
// 若為獨立 Apps Script 專案，請填入試算表網址中 /d/ 與 /edit 之間的 ID：
const SPREADSHEET_ID = ""; // 例如: "1AbCdEfGhIjKlMnOpQrStUvWxYz..."

function getSpreadsheetInstance() {
  let ss = null;
  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID.trim() !== '') {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (e) {
      throw new Error("無法透過 SPREADSHEET_ID 開啟試算表，請確認 ID 是否正確且具有存取權限。");
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    throw new Error(
      "找不到綁定的 Google 試算表！\n" +
      "原因：您的 Apps Script 可能是獨立專案。\n" +
      "解決方法：\n" +
      "1. 請在 initSheets.js 最上方的 SPREADSHEET_ID 填入您的 Google 試算表 ID；\n" +
      "2. 或請打開 Google 試算表，從頂部選單「擴充功能 ➔ Apps Script」貼上程式碼進行執行。"
    );
  }
  return ss;
}

function initDatabase() {
  const ss = getSpreadsheetInstance();
  
  // 定義 6 個核心分頁結構
  const schemas = [
    {
      name: "Users_Config",
      color: "#4285F4", // 藍色
      headers: [
        "email",
        "name",
        "picture",
        "role",
        "status",
        "applied_at",
        "approved_at",
        "note"
      ],
      sampleRows: [
        [
          Session.getActiveUser().getEmail() || "owner@example.com",
          "系統管理者 (攤主)",
          "",
          "系統管理者",
          "已核准",
          new Date(),
          new Date(),
          "系統初始管理員"
        ]
      ]
    },
    {
      name: "Products",
      color: "#34A853", // 綠色
      headers: [
        "product_id",
        "category",
        "name",
        "base_price",
        "cost",
        "color_tag",
        "status",
        "created_at"
      ],
      sampleRows: [
        ["PROD-001", "衣服", "品牌經典 LOGO 短T", 590, 220, "#3B82F6", "active", new Date()],
        ["PROD-002", "吊飾", "壓克力動物雙面吊飾", 150, 45, "#F59E0B", "active", new Date()],
        ["PROD-003", "貼紙", "雷射防水造型貼紙包", 100, 30, "#EC4899", "active", new Date()]
      ]
    },
    {
      name: "Inventory_Master",
      color: "#FBBC05", // 黃色
      headers: [
        "sku_id",
        "product_id",
        "product_name",
        "category",
        "variant_name",
        "price",
        "home_qty",
        "stall_qty",
        "total_qty",
        "safety_stock",
        "updated_at"
      ],
      sampleRows: [
        // 衣服尺寸範例
        ["PROD-001-S", "PROD-001", "品牌經典 LOGO 短T", "衣服", "S", 590, 15, 5, 20, 2, new Date()],
        ["PROD-001-M", "PROD-001", "品牌經典 LOGO 短T", "衣服", "M", 590, 25, 8, 33, 3, new Date()],
        ["PROD-001-L", "PROD-001", "品牌經典 LOGO 短T", "衣服", "L", 590, 20, 6, 26, 3, new Date()],
        ["PROD-001-XL", "PROD-001", "品牌經典 LOGO 短T", "衣服", "XL", 590, 10, 4, 14, 2, new Date()],
        ["PROD-001-2XL", "PROD-001", "品牌經典 LOGO 短T", "衣服", "2XL", 620, 8, 3, 11, 2, new Date()],
        // 吊飾款式範例
        ["PROD-002-SHIBA", "PROD-002", "壓克力動物雙面吊飾", "吊飾", "柴犬款", 150, 30, 12, 42, 5, new Date()],
        ["PROD-002-CAT", "PROD-002", "壓克力動物雙面吊飾", "吊飾", "橘貓款", 150, 30, 10, 40, 5, new Date()],
        ["PROD-002-BUNNY", "PROD-002", "壓克力動物雙面吊飾", "吊飾", "兔子款", 150, 20, 8, 28, 4, new Date()],
        // 貼紙範例
        ["PROD-003-ALL", "PROD-003", "雷射防水造型貼紙包", "貼紙", "全套 5 入", 100, 50, 20, 70, 10, new Date()]
      ]
    },
    {
      name: "Inventory_Logs",
      color: "#EA4335", // 紅色
      headers: [
        "log_id",
        "sku_id",
        "action_type",
        "qty_change",
        "from_location",
        "to_location",
        "operator",
        "event_name",
        "timestamp",
        "note"
      ],
      sampleRows: [
        [
          "LOG-" + Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd-HHmmss"),
          "PROD-001-M",
          "調撥出攤",
          8,
          "家內庫存",
          "現場庫存",
          Session.getActiveUser().getEmail() || "admin",
          "台北市集",
          new Date(),
          "出攤初始調撥"
        ]
      ]
    },
    {
      name: "Sales_Orders",
      color: "#8B5CF6", // 紫色
      headers: [
        "order_id",
        "order_type",
        "items_summary",
        "items_json",
        "total_amount",
        "discount_amount",
        "final_amount",
        "payment_method",
        "operator",
        "status",
        "timestamp"
      ],
      sampleRows: []
    },
    {
      name: "Preorders",
      color: "#6B7280", // 灰色
      headers: [
        "order_id",
        "customer_name",
        "contact_info",
        "pickup_method",
        "pickup_event",
        "items_json",
        "total_amount",
        "payment_status",
        "order_status",
        "created_at",
        "note"
      ],
      sampleRows: []
    }
  ];

  schemas.forEach(schema => {
    let sheet = ss.getSheetByName(schema.name);
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
    }
    
    // 設定工作表頁籤顏色
    sheet.setTabColor(schema.color);
    
    // 清除舊內容
    sheet.clear();
    
    // 寫入表頭
    const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
    headerRange.setValues([schema.headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#F3F4F6");
    headerRange.setFontColor("#1F2937");
    headerRange.setHorizontalAlignment("center");
    
    // 凍結首列
    sheet.setFrozenRows(1);
    
    // 寫入範例資料（若有）
    if (schema.sampleRows && schema.sampleRows.length > 0) {
      const dataRange = sheet.getRange(2, 1, schema.sampleRows.length, schema.headers.length);
      dataRange.setValues(schema.sampleRows);
    }
    
    // 自動調整欄寬
    for (let col = 1; col <= schema.headers.length; col++) {
      sheet.autoResizeColumn(col);
    }
  });

  // 移除預設的「工作表1」 (Sheet1) 若存在且非空
  const defaultSheet = ss.getSheetByName("工作表1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch(e) {}
  }

  Logger.log("✅ 攤位清點資料庫分頁初始化完成！");
}
