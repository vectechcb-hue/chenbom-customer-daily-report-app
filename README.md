# 承邦客服工作日報 App

個人手機使用版。GitHub 只作程式碼備份與自動部署，iPhone 直接透過 GitHub Pages 的 PWA 使用，不需要 Apple Developer 付費。

## 已完成
- 日期切換
- 上午／下午工作項目
- 工作細項自動產生
- 工廠聯繫進度
- 業務工廠回覆
- 本機自動儲存
- 📄 Word 匯出
- 📚 Word 匯出紀錄、搜尋、調出、重新匯出
- ☁️ Firebase 雲端記憶介面
- iPhone／Android 手機版架構
- GitHub Pages PWA 部署

## Word 匯出紀錄
每次匯出 Word 時，App 會建立一筆紀錄，包含：
- 日期
- 客服
- Word 檔名
- 匯出時間
- 匯出當下的日報內容快照

因此可以從「匯出紀錄」查詢並調出當次版本，再重新產生 Word。

## 雲端記憶
App 支援 Firebase Authentication 的匿名登入與 Cloud Firestore。
資料結構：
- `users/{uid}/daily_reports/{date}`
- `users/{uid}/export_history/{exportId}`

請先建立 Firebase Web App、啟用 Anonymous Authentication 與 Cloud Firestore，再把 Firebase Web App 的設定 JSON 貼到 App 的「雲端記憶」設定區。
Firestore 安全規則已附在 `firestore.rules。

Firebase 目前提供 Spark 免付費方案；Cloud Firestore 有每日免費配額，適合個人日報使用。

## iPhone 使用
開啟：
https://vectechcb-hue.github.io/chenbom-customer-daily-report-app/

在 iPhone Safari 選「分享」→「加入主畫面」，之後可像 App 一樣使用。

## 注意
GitHub Pages 只是 App 的前端入口；雲端資料需先在 Firebase 完成一次設定。沒有 Firebase 設定時，App 仍會使用手機本機記憶。
