# 商店素材草稿｜2026-09-30

這是供審稿與之後真機重拍使用的草稿，不是送審包。畫面直接來自目前 App 的 `index.html`，沒有重新繪製 App 介面；拍攝環境是 Chromium 手機尺寸視窗，因此缺少 iOS／Android 狀態列、系統安全區及原生 WebView 對照。

## 檔案

- 本目錄根目錄：Apple iPhone 規格草稿，7 張，1320 × 2868 px，PNG，RGB，無透明通道。
- `google-play-1080x2400/`：Google Play 手機截圖草稿，7 張，1080 × 2400 px，PNG，RGB，無透明通道。
- `google-play-feature-graphic-draft.png`：Google Play 宣傳圖草稿，1024 × 500 px，PNG，RGB，無透明通道。沿用 App 既有 `assets/mobile-hero-clean-v75.png` 品牌圖，另加上功能文案；這是宣傳素材，不是 App 畫面。
- `../../work/capture-store-drafts.cjs`：可重跑的本機截圖腳本；所有使用者資料均由腳本注入為虛構展示資料，不會呼叫正式 Supabase。

## 展示資料

使用者「輪班喵」、薪資數字、班表、牙醫行程、待辦及 Google 登入狀態均為拍攝用假資料。薪資加班使用畫面所示的勞基法標準費率作示範，實際雇主費率可能不同。這不是帳號或付款狀態證明。

七張包含總覽、月曆、排班設定、薪資輸入、薪資試算結果、行程待辦、設定。原拍攝清單中的 Pro 薪資單辨識／逐項對帳截圖尚未完成；薪資試算結果不代表該付費功能，正式送審素材仍需補拍該功能的虛構範例。

## 正式上架前

1. 等待 iOS 與 Android 簽署版本可安裝後，在實機用最終 build 重新拍攝。
2. 核對實際狀態列、安全區、字級與頁面內容；不要直接上傳這批瀏覽器草稿。
3. 依實際功能重拍薪資／行程資料；只用明確標為測試的虛構資料。
4. App 版本與截圖內容核對一致後，才上傳 Apple App Store Connect／Google Play Console。

## 拍攝結果

2026-09-30：Apple 7 張、Google Play 7 張與 Google 宣傳圖已輸出。五個主要頁面完成頁面載入，沒有捕捉到 JavaScript page error；這只驗證截圖流程，不代表原生安裝、商店規範或整體功能已完成驗收。
