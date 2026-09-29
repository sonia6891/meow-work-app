# 雙平台上架狀態｜喵的，又要上班了

盤點日期：2026-09-30
程式基準：`sonia6891/meow-work-app` 最新主線 `0c3b40d`
本文件描述此工作副本已核實的狀態；不代表已建立商店商品、上傳二進位檔或送審。

## iOS App Store

**程式能力：已完成主要原生付款路徑。可進入正式帳號、簽署與商店設定階段；本環境尚未形成可上傳的簽署 archive。**

- Capacitor iOS、Bundle ID `com.lumilab.meowwork`、StoreKit 2 bridge 已存在。
- 商品 ID 為 `meowwork.pro.monthly` / `meowwork.pro.yearly`；月繳 NT$99、年繳 NT$790、符合資格者 3 天試用。
- 已有交易伺服器驗證、未完成交易重試、Restore、管理訂閱及 App Store Server Notifications V2 程式路徑。
- 仍須確認 Apple Developer 團隊及簽署、正式 App Store Connect 記錄與訂閱商品、正式 App ID／Server Notifications、TestFlight 沙盒實機流程、隱私揭露、商店文案／截圖／聯絡人。這些帳號與真實聯絡資料不可由程式推定。
- 本次 Windows 工作環境無 Xcode，不能產出或驗證正式 iOS archive。

## Android Google Play

**程式端主要購買與驗證路徑已完成；需先連接真實 Play Console 商品、Google Cloud／Supabase 憑證並跑內測實機流程，才能判定送審。Android 原生專案已在此副本生成並同步；本機未能安裝 Gradle／Android SDK，因此尚未建出 AAB。**

- 已加入 Capacitor Android Java Billing bridge source、生成／patch 指令與 CI 工作流程。它支援商品查詢、試用 offer 選擇、購買／待付款、前景重查、恢復購買與訂閱管理。
- 新增 Supabase purchase-token 驗證：以 service account 呼叫 Google Play Developer API `subscriptionsv2.get`，核對包名、商品、訂閱狀態、到期日與 App user 綁定，只在成功後更新 entitlement 並由伺服器 acknowledge。
- 新增 Google Pub/Sub RTDN handler，透過 Google OIDC tokeninfo 驗證 push 身分，再以 Developer API 的最新訂閱狀態冪等更新 entitlement。
- Capacitor Android 專案已生成在 `native/android/`；本機 `cap add android`、插件同步、Billing 及 API 36 patch 均成功。Android SDK／Gradle 不在此機，因此無本機 APK／AAB；推送後的 Android CI build 尚待執行。
- Google／LINE OAuth 已加入 Capacitor 系統瀏覽器＋原生 callback scheme，並配置 Android intent filter；須在 Supabase Auth redirect allowlist 加入 `com.lumilab.meowwork://auth/callback`，且在 iOS／Android 實機分別驗證 Google、LINE 登入回呼後，才能解除此項送審阻擋。
- 預期沿用包名 `com.lumilab.meowwork` 及兩個相同商品 ID；建立 Play Console App 後需確認包名可用並建立 base plan 與三天 trial offer。
- 2026-08-31 起 Google Play 新 App 與更新須 target Android 16 / API 36 以上；正式產生 Android 專案時必須固定符合此提交門檻。[官方規定](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- 上架前需 Play Console 內部／封閉測試軌、App signing、Data safety、帳號刪除入口、政策頁、支援聯絡資料、內容分級、商店素材與 Play Billing 沙盒測試。

## 本次程式修補

- 增加 Capacitor Android 8.5.2 平台依賴及 `cap:add:android` / `cap:open:android` 指令。
- 增加 Android 生成、target API 36、Play Billing 9.1.0、安全金鑰及人工設定說明與 CI bootstrap。
- 前端交易分流使用 iOS signed transaction 與 Android purchase token 各自的後端 verifier；Restore 與購買狀態同步都會依平台送驗。
- `billing-config` 回報 Android package name、service account／RTDN 設定狀態，預設為未就緒；不暴露憑證內容。

## 目前需要的帳號端設定

1. Apple Developer/App Store Connect：團隊、正式 App 記錄、訂閱群組／商品／試用、簽署、測試者及真實支援與審查聯絡資料。
2. Google Play Console/Cloud：開發者與 App 記錄、第一次 AAB 手動上傳（若 Play API 尚未啟用該套件）、訂閱/base plan/offer、Play App Signing、Google Play Developer API service account、Pub/Sub topic 與 RTDN。
3. 在 Supabase secrets 設定 `GOOGLE_PLAY_PACKAGE_NAME=com.lumilab.meowwork`、`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`（具 Android Publisher 權限的服務帳號 JSON）、`GOOGLE_PLAY_RTDN_AUDIENCE`（Pub/Sub push audience）與 `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL`（Pub/Sub OIDC 身分）。金鑰不能寫入 Git。
4. 部署 `verify-google-play-purchase` 與 `google-play-rtdn`。RTDN function 必須停用 Supabase gateway JWT 驗證，因 endpoint 會自行驗 Google OIDC token；Pub/Sub 需設定同一 audience 及服務帳號。
5. 觸發 Android bootstrap CI、確認 Gradle assembleDebug 成功並保存生成的原生專案；安裝 Play 內測版，在實機逐項驗證新購、試用、待處理付款、續訂、退款、取消、到期、恢復、帳號刪除。
6. 建立 GitHub Actions secrets：Android 使用 `PLAY_UPLOAD_KEYSTORE_BASE64`、`PLAY_UPLOAD_KEY_ALIAS`、`PLAY_UPLOAD_STORE_PASSWORD`、`PLAY_UPLOAD_KEY_PASSWORD`、`PLAY_SERVICE_ACCOUNT_JSON`；iOS 使用 `APPLE_ASC_KEY_P8`、`APPLE_ASC_KEY_ID`、`APPLE_ASC_ISSUER_ID`、`APPLE_TEAM_ID`。手動執行各自的 `Build signed ... release` workflow 會產生簽署包，Android 上傳至 Google Play internal testing，iOS 上傳至 App Store Connect／TestFlight，之後等你安裝實機測試；Production release 仍待實機測試、商店素材及送審資料完成。

## 本次驗證限制

- 最新遠端 commit 為 `0c3b40d`；未直接修改有未提交變更的舊本機工作副本。
- Node runtime 可用；已透過隨附 pnpm 啟用 Windows 系統憑證呼叫 npm CLI。更新 `package-lock.json` 並成功完成 `npm ci --ignore-scripts`、Capacitor web bundle 同步、Android/iOS plugin sync、原生 patch 腳本重複執行，以及 iOS URL scheme plist 解析檢查。
- 部署工作流中的 29 個網頁回歸測試已全數通過，包括大量資料壓力測試和 320/390/430px 瀏覽器帳號流程 227 項檢查；本機仍無 Xcode／Android SDK／Gradle，無法完成原生二進位建置與商店付款沙盒實測。
- 無 Xcode／Android SDK，故未執行本機 iOS／Android 原生建置。此變更尚未 push、部署或送商店。
- Google 官方 Play Billing 9.1.0 文件要求 secure backend 向 `subscriptionsv2.get` 驗證，並透過 purchase acknowledgement 與 RTDN 維持訂閱狀態；本次後端依此落實。[Billing integration](https://developer.android.com/google/play/billing/integrate)／[backend](https://developer.android.com/google/play/billing/backend)／[subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
