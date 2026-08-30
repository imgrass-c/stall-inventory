# 🔥 Firebase 3 分鐘超快速建立與 Netlify 部署指南

只需 3 分鐘完成 Firebase 免費設定，即可享有 **< 100ms 瞬間同步**、**多台手機同時秒扣庫存** 與 **離線防斷網**！

---

## 🚀 步驟一：建立 Firebase 免費專案

1. 開啟 [Firebase 控制台 (console.firebase.google.com)](https://console.firebase.google.com/) 並登入您的 Google 帳號。
2. 點擊 **「建立專案 (Add project)」**。
3. 輸入專案名稱（例如：`stall-inventory`）➔ 點「繼續」➔ 點「建立專案」。

---

## 🗄️ 步驟二：啟用 Cloud Firestore 資料庫

1. 在 Firebase 控制台左側選單中，點擊 **「建構 (Build)」➔「Firestore Database」**。
2. 點擊 **「建立資料庫 (Create database)」**。
3. 地區選擇 **`asia-east1 (台灣)`** 或 `asia-northeast1 (東京)`（連線最快）。
4. 安全性規則選擇 **「以測試模式啟動 (Start in test mode)」** ➔ 點擊「啟用」。

---

## 🔐 步驟三：啟用 Google 登入功能

1. 在 Firebase 左側選單點擊 **「建構 (Build)」➔「Authentication」** ➔ 點「開始使用」。
2. 選擇 **「登入方式 (Sign-in method)」** 分頁 ➔ 點擊 **「Google」**。
3. 將開關切換為 **「啟用 (Enable)」**，專案支援電子郵件選擇您的 Gmail ➔ 點擊 **「儲存 (Save)」**。

---

## 🌐 步驟四：授權 Netlify 網域 (解決 auth/unauthorized-domain)

> [!IMPORTANT]
> 若將網頁部署到 Netlify 後，點擊 Google 登入出現 `auth/unauthorized-domain`：
> 1. 在 Firebase 左側選單進入 **「Authentication」** ➔ 點選 **「設定 (Settings)」** 分頁。
> 2. 點選 **「授權網域 (Authorized domains)」** 區塊。
> 3. 點擊 **「新增網域 (Add domain)」** ➔ 輸入您的 Netlify 網域名稱（例如：`your-app-name.netlify.app`）➔ 點擊 **「儲存」**。

---

## 🔑 步驟五：填入獨立 `config.js`（網頁 0 金鑰暴露）

在專案目錄下的 `standalone/config.js` 填入您的 Firebase 設定：

```javascript
window.STALL_CONFIG = {
  FIREBASE_CONFIG: {
    apiKey: "AIzaSy...",
    authDomain: "stall-inventory.firebaseapp.com",
    projectId: "stall-inventory",
    storageBucket: "stall-inventory.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef..."
  },
  GAS_API_URL: "https://script.google.com/macros/s/.../exec"
};
```

將 `config.js` 與 `index.html` 一同丟給 Netlify 即可無聲自動對接，網頁前端完全不暴露任何金鑰！
