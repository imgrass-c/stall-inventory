/**
 * =========================================================================
 * 系統設定檔 (STALL POS Config)
 * =========================================================================
 * 將此檔案與 index.html 放在同一個目錄上傳至 Netlify / 伺服器，
 * 系統將自動讀取後端設定，網頁介面上「完全不會出現或暴露任何 API Key」！
 */
window.STALL_CONFIG = {
  // Firebase 即時資料庫配置 (用於現場毫秒級 POS)
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyDGWrr9KUTNIhOc9_Afy04Fn03716XUlzA",
    authDomain: "market-stall-inventory.firebaseapp.com",
    projectId: "market-stall-inventory",
    storageBucket: "market-stall-inventory.firebasestorage.app",
    messagingSenderId: "14228005133",
    appId: "1:14228005133:web:74ccb923c127ffa15c5044",
    measurementId: "G-XJMR8VKQ04"
  },
  // Google Apps Script URL (用於日結報表備份)
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbwo5oT02hAuKme8e34F07MDktlxnJhAS8ZmKNL8nfljn6DEehlLh14lNQn9D8HzQJMZyw/execgit push"
};
