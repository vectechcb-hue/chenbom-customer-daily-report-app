# 承邦客服工作日報 App

React Native / Expo mobile app for 承邦有限公司客服工作日報。

## 已完成
- iPhone / Android Expo App 架構
- 手機日報編輯介面
- 日期切換
- 上午 / 下午工作項目
- 工作細項自動產生
- 工廠聯繫進度
- 業務工廠回覆
- 本機自動儲存
- EAS build profiles
- GitHub Actions 建置檢查

## 下一階段
1. 接回 Firebase Authentication / Firestore 雲端同步
2. 加入手機語音輸入
3. 加入 Excel 日報與月報匯出
4. 建立 Android APK / AAB
5. 建立 iOS 測試版 / TestFlight

## 建置
```bash
npm install
npx expo start
```

EAS：
```bash
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
```
