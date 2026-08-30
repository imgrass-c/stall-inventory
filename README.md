# 🎪 市集擺攤庫存與 POS 系統 (Stall Inventory & POS)

專為市集、展覽實體擺攤打造的雙庫存（家內 ✕ 現場）清點與極速收銀系統。後端以 **Google Sheets** 為資料庫，結合 **Google Apps Script** 進行權限審核與資料存取。

---

## 🚀 快速啟動方式 (兩種方式任選)

### 方式一：【免安裝零依賴】直接點擊打開 (最推薦、最快！)
專案內已為您打包好一份獨立的單一 HTML 網頁：
1. 用 Finder 打開專案資料夾下的 [`standalone/index.html`](./standalone/index.html)。
2. 直接雙擊用 **Google Chrome / Safari** 開啟。
3. **無須跑任何 `npm install` 指令**，即可立刻體驗完整的 POS 點單、雙庫存清點、調撥與營收統計功能！

---

### 方式二：使用 Node.js / Vite 開發伺服器
若您習慣在本地終端機 (Terminal) 執行開發環境：

1. 打開 Mac 終端機 (Terminal) 並進入專案目錄：
   ```bash
   cd "/Users/igrass/Documents/工作專案/stall-inventory"
   ```
2. 執行安裝套件（請確認電腦連線網路正常）：
   ```bash
   npm install
   ```
3. 啟動本機開發伺服器：
   ```bash
   npm run dev
   ```
4. 於瀏覽器開啟 `http://localhost:3000`。

---

## ☁️ Google Sheets 資料庫與後端設置指南

完整圖文說明請參閱 [`backend/README.md`](./backend/README.md)，只需 3 分鐘即可完成：

1. **建立 Google 試算表**：在 Google Drive 新增試算表。
2. **自動建表**：點擊「擴充功能」➔「Apps Script」，貼上 [`backend/initSheets.js`](./backend/initSheets.js) 內容並執行 `initDatabase`，即刻自動建好 6 個彩色分頁與欄位。
3. **部署 API**：貼上 [`backend/Code.js`](./backend/Code.js)，點右上角「部署」➔「新增部署作業」➔ 類型選「網頁應用程式 (Web App)」，存取權限設為「所有人」。
4. **貼上連線網址**：複製產生的 Web App URL，回到前端網頁右上角點擊 ⚙️「系統設定」，貼上 URL 即可即時與 Google Sheet 雙向同步！

---

## 👥 權限角色與帳號審核機制
- **新成員登入**：小幫手透過 Google 信箱送出登入後，系統自動在 Google Sheet 的 `Users_Config` 建立一筆「待審核」紀錄。
- **管理者審核**：攤主打開 Google Sheet，將該帳號的 `status` 改為 **`已核准`**，並指派角色：
  - **`系統管理者`**：全權限（商品、庫存、調撥、POS、利潤成本與人員審核）。
  - **`編輯者`**：商品管理、自訂規格、定價、庫存調撥、POS。
  - **`一般使用者`**：現場 POS 快速結帳扣庫、即時查詢雙庫存。

---

## 📱 核心模組功能介紹
1. 🛒 **現場 POS 快速點單**：大尺寸規格按鈕（S/M/L/XL/2XL/自訂樣式）、即時標示 🟢 現場與 🏠 家內數量、折讓優惠、常用支付方式（現金/LinePay/街口/轉帳）、找零計算機、結帳秒速自動扣現場庫存。
2. 📦 **即時庫存清點**：全品項與各規格列表、搜尋篩選、安全警戒標示。
3. 🚚 **雙向庫存調撥**：出攤調撥（家內 ➔ 現場）與收攤回庫（現場 ➔ 家內），支援 `+1` `+5` `全部` 快速填入。
4. 📊 **今日營收戰報**：獨立看板即時呈現總營業額、售出總件數、收款管道拆解與今日交易列表（支援 1 鍵作廢誤按單筆並自動回補庫存）。
5. ⚙️ **商品與規格管理**：新增商品、快速產生衣服尺寸模版或款式模版、自訂雙庫存初始量。
