# 擺攤清點與庫存管理系統 - Google Sheets 後端設置指南

請依照以下 4 個步驟完成 Google 試算表資料庫與 Google Apps Script (GAS) 後端 API 的建立：

---

### 步驟 1：建立 Google 試算表
1. 打開 [Google 雲端硬碟](https://drive.google.com/)。
2. 點擊左上角「**＋新增**」➔「**Google 試算表**」。
3. 將試算表命名為：`【市集擺攤】庫存與銷售管理系統`（或您喜歡的名稱）。

---

### 步驟 2：初始化試算表結構 (自動建表)
1. 在試算表頂部選單，點擊 **「擴充功能」 ➔ 「Apps Script」**。
2. 將編輯器內原本的內容清空，並開啟專案內的 [`backend/initSheets.js`](./initSheets.js)。
3. 將 `initSheets.js` 的完整內容複製並貼上到 Apps Script 編輯器中。
4. 點擊上方的 **「儲存」圖示 (Ctrl+S / Cmd+S)**。
5. 在上方函式下拉選單中選擇 **`initDatabase`**，然後點擊 **「執行」**。
6. 首次執行時會彈出「需要授權」視窗：
   - 點擊「審查權限」 ➔ 選擇您的 Google 帳號。
   - 點擊「進階 (Advanced)」 ➔ 點擊「前往『未命名專案』(不安全)」。
   - 點擊「允許」。
7. 執行完成後，回到您的 Google 試算表，您會看到 **6 個彩色分頁**（`Users_Config`、`Products`、`Inventory_Master`、`Inventory_Logs`、`Sales_Orders`、`Preorders`）與範例資料已自動建立完畢！

---

### 步驟 3：部署後端 API (Code.js)
1. 回到剛才的 Apps Script 編輯器。
2. 開啟專案內的 [`backend/Code.js`](./Code.js)，將內容全選複製，覆蓋貼上到 Apps Script 編輯器中（或者在左側「檔案」點選 ＋ 新增指令碼檔案命名為 `Code.gs` 並貼上）。
3. 點擊 **「儲存」**。
4. 點擊右上角藍色的 **「部署」 ➔ 「新增部署作業」**。
5. 點擊齒輪圖示 ⚙️，選擇 **「網頁應用程式」 (Web App)**。
6. 設定如下（非常重要）：
   - **說明**：`Stall Inventory API v1`
   - **執行身分**：選擇 **「我」 (您的 Email)**
   - **誰可以存取**：選擇 **「所有人」 (Anyone)**（這樣前端才能呼叫 API 進行登入驗證與同步）
7. 點擊 **「部署」**。
8. 複製產生的 **「網頁應用程式網址 (Web App URL)」**（格式類似 `https://script.google.com/macros/s/AKfycb.../exec`）。

---

### 步驟 4：設定前端連線
將剛才複製的 **Web App URL** 填入前端系統的「系統設定」或 `.env` 檔案中，即可開始使用！

---

### 帳號審核與權限管理方式
- 當任何使用者（包含您自己或其他小幫手）首次在前端點擊 Google 登入時，系統會自動在 **`Users_Config`** 分頁新增一筆紀錄，狀態預設為 `待審核`。
- 身為攤主的您，只需打開 Google 試算表的 `Users_Config` 分頁：
  - 將 `status` 改為 **`已核准`**。
  - 將 `role` 改為 **`系統管理者`**、**`編輯者`** 或 **`一般使用者`**。
- 該使用者下次重新整理前端網頁即可正常進入並操作對應權限！
