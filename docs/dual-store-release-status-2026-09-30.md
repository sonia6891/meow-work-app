# 雙平台上架狀態｜喵的，又要上班了

盤點日期：2026-09-30
程式基準：`sonia6891/meow-work-app` 最新主線 `21bb172`（雙平台商店素材草稿）；Android 原生生成專案 `8462837`；iOS 原生生成專案 `d01ed84`；提醒修補 `1561879`
本文件描述程式、GitHub CI 和部署狀態；不代表已建立完整商店商品、上傳簽署二進位檔或送審。

## iOS App Store

**程式能力：已完成主要原生付款路徑。可進入正式帳號、簽署與商店設定階段；本環境尚未形成可上傳的簽署 archive。**

- Capacitor iOS、Bundle ID `com.lumilab.meowwork`、StoreKit 2 bridge 已存在。
- 商品 ID 為 `meowwork.pro.monthly` / `meowwork.pro.yearly`；月繳 NT$99、年繳 NT$790、符合資格者 3 天試用。
- 已有交易伺服器驗證、未完成交易重試、Restore、管理訂閱及 App Store Server Notifications V2 程式路徑。
- 仍須確認 Apple Developer 團隊及簽署、正式 App Store Connect 記錄與訂閱商品、正式 App ID／Server Notifications、TestFlight 沙盒實機流程、隱私揭露、商店文案／截圖／聯絡人。這些帳號與真實聯絡資料不可由程式推定。
- Apple 截圖草稿 7 張已放在 `store-assets/drafts/`；它們由桌面 Chromium 手機尺寸視窗產生，須待簽署 build 在 iPhone 實機重新拍攝後，才可作為正式商品頁素材。Pro 薪資單辨識／逐項對帳截圖尚未完成。
- Windows 工作環境無 Xcode。先前 GitHub macOS bootstrap workflow #556 在源碼檢查階段因 grep 方括號語法失敗；已修正為固定文字檢查。已將 bootstrap 與 signed release workflow 改用 GitHub 標準 `macos-15-intel` runner。GitHub Actions iOS bootstrap #561（`36652795916`）於 2026-09-30 成功：iOS Simulator Debug 與 unsigned iPhoneOS Release 均編譯完成，App Store 法務頁、出口合規旗標、App 隱私 manifest 與 SDK 隱私 manifests 檢查通過；生成原生專案已提交為 `d01ed84`。此結果不是簽署 archive，也未上傳 TestFlight。

## Android Google Play

**程式端主要購買與驗證路徑已完成；需先連接真實 Play Console 商品、Google Cloud／Supabase 憑證並跑內測實機流程，才能判定送審。GitHub Android `assembleDebug` workflow 已成功；簽署 AAB 仍需商店上傳簽章與 Play service account secrets。**

- 已加入 Capacitor Android Java Billing bridge source、生成／patch 指令與 CI 工作流程。它支援商品查詢、試用 offer 選擇、購買／待付款、前景重查、恢復購買與訂閱管理。
- 新增 Supabase purchase-token 驗證：以 service account 呼叫 Google Play Developer API `subscriptionsv2.get`，核對包名、商品、訂閱狀態、到期日與 App user 綁定，只在成功後更新 entitlement 並由伺服器 acknowledge。
- 新增 Google Pub/Sub RTDN handler，透過 Google OIDC tokeninfo 驗證 push 身分，再以 Developer API 的最新訂閱狀態冪等更新 entitlement。
- Android 行程／待辦提醒已接上固定版本 `@capacitor/local-notifications@8.3.1`，依系統請求通知權限並以非精確排程避免額外精確鬧鐘權限。通知 ID 轉為穩定的 32-bit 整數供 Android 使用；支援頁已提醒省電排程可能稍微延後。
- Capacitor Android 專案已生成在 `native/android/`；本機 Capacitor plugin sync 確認載入 local notifications、Billing 及 API 36 patch。GitHub Android bootstrap #6（`36652795834`，基準 `e492418`）的 `assembleDebug` 成功；生成專案已於前次 CI 更新為 `8462837`。
- Google／LINE OAuth 已加入 Capacitor 系統瀏覽器＋原生 callback scheme，並配置 Android intent filter；須在 Supabase Auth redirect allowlist 加入 `com.lumilab.meowwork://auth/callback`，且在 iOS／Android 實機分別驗證 Google、LINE 登入回呼後，才能解除此項送審阻擋。
- 預期沿用包名 `com.lumilab.meowwork` 及兩個相同商品 ID；建立 Play Console App 後需確認包名可用並建立 base plan 與三天 trial offer。
- Play Console 帳戶目前要求完成開發者帳戶設定；Google 正在審核已提交的身分文件，電話驗證需等文件核准後進行，建立 App 按鈕目前停用。Google 核准後才能建立正式 App／訂閱商品並啟用內測發佈。
- Google Play 截圖草稿 7 張與 1024 × 500 宣傳圖已放在 `store-assets/drafts/`；手機截圖須在簽署 Android build 真機重拍並確認後才能上傳。Pro 薪資單辨識／逐項對帳圖也尚未完成。
- 2026-08-31 起 Google Play 新 App 與更新須 target Android 16 / API 36 以上；正式產生 Android 專案時必須固定符合此提交門檻。[官方規定](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- 上架前需 Play Console 內部／封閉測試軌、App signing、Data safety、帳號刪除入口、政策頁、支援聯絡資料、內容分級、商店素材與 Play Billing 沙盒測試。

## 本次程式修補

- 增加 Capacitor Android 8.5.2 平台依賴及 `cap:add:android` / `cap:open:android` 指令。
- 增加 Android 生成、target API 36、Play Billing 9.1.0、安全金鑰及人工設定說明與 CI bootstrap。
- 前端交易分流使用 iOS signed transaction 與 Android purchase token 各自的後端 verifier；Restore 與購買狀態同步都會依平台送驗。
- `billing-config` 回報 Android package name、service account／RTDN 設定狀態，預設為未就緒；不暴露憑證內容。

## 目前需要的帳號端設定

1. Apple Developer/App Store Connect：團隊、正式 App 記錄、訂閱群組／商品／試用、簽署、測試者及真實支援與審查聯絡資料。
2. Google Play Console/Cloud：先等開發者身分文件審核通過，再完成電話驗證；目前「建立 App」停用。通過後建立 App 記錄、第一次 AAB 手動上傳（若 Play API 尚未啟用該套件）、訂閱/base plan/offer、Play App Signing、Google Play Developer API service account、Pub/Sub topic 與 RTDN。
3. `SUPABASE_ACCESS_TOKEN` GitHub secret 已由使用者設定；Supabase 部署 workflow #10、#12 成功，已部署薪資單驗證、計費設定、App Store 驗證／通知與 Google Play 驗證／RTDN functions。固定 Play package name 已由程式預設並在線上 `billing-config` 讀回確認。Play Console 建立後仍需在 Supabase secrets 設定 `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`（具 Android Publisher 權限的服務帳號 JSON）、`GOOGLE_PLAY_RTDN_AUDIENCE`（Pub/Sub push audience）與 `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL`（Pub/Sub OIDC 身分）。金鑰不能寫入 Git。
4. Google Play 驗證與 RTDN functions 已部署；線上查詢目前為 `package_name=com.lumilab.meowwork`、`credentials_configured=false`、`notifications_configured=false`，故 `production_server_verification_ready=false`，安全維持未就緒。RTDN function 必須停用 Supabase gateway JWT 驗證，因 endpoint 會自行驗 Google OIDC token；正式連接 Play Console 後，Pub/Sub 需設定相同 audience 及服務帳號。
5. Android bootstrap CI #4（`36650751340`）已成功；安裝 Play 內測版後，在實機逐項驗證新購、試用、待處理付款、續訂、退款、取消、到期、恢復、帳號刪除。
6. 尚需建立 GitHub Actions secrets：Android 使用 `PLAY_UPLOAD_KEYSTORE_BASE64`、`PLAY_UPLOAD_KEY_ALIAS`、`PLAY_UPLOAD_STORE_PASSWORD`、`PLAY_UPLOAD_KEY_PASSWORD`、`PLAY_SERVICE_ACCOUNT_JSON`；iOS 使用 `APPLE_ASC_KEY_P8`、`APPLE_ASC_KEY_ID`、`APPLE_ASC_ISSUER_ID`、`APPLE_TEAM_ID`。商店帳號、App 記錄、商品和憑證就緒後，手動執行各自的 `Build signed ... release` workflow 會產生簽署包；Android 上傳至 Google Play internal testing，iOS 上傳至 App Store Connect／TestFlight。Production release 仍待商店帳號設定、實機測試、商店素材及送審資料完成。

## 本次驗證限制

- 已推送 `379cbb7`（雙平台原生／付款準備）、`b594426`（修正 Android Billing 編譯）、`dac58b1`（OAuth 僅用 PKCE code exchange）、`893c337`（修正 iOS CI literal bracket check）及 `21bb172`（Apple／Google 商店素材草稿與拍攝說明）。舊本機鏡像未修改。
- Node runtime 可用；已透過隨附 pnpm 啟用 Windows 系統憑證呼叫 npm CLI。更新 `package-lock.json` 並成功完成 `npm ci --ignore-scripts`、Capacitor web bundle 同步、Android/iOS plugin sync、原生 patch 腳本重複執行，以及 iOS URL scheme plist 解析檢查。
- 本機 45 個 Node regression tests、5 個 Google Play entitlement tests、Deno Edge Function type checks 全通過；Pages run `36645468517`、LINE/OAuth CI `36645468540`、Android debug build `36645468550`、assistant self-test `36645468446`、payroll preflight `36645468468` 均成功。線上 Pages 回應 HTTP 200，部署內容已核對。
- Supabase deploy run `36645095707` 曾因 `SUPABASE_ACCESS_TOKEN` 缺少而停止；使用者補上 GitHub secret 後，run `36648640983` 成功。run `36649858592` 的最後 secrets 寫入步驟因 scoped PAT 缺少 `edge_functions_secrets_write` 權限而失敗；已移除該步驟，改由固定程式預設值，run `36650024839` 全步驟成功，且線上 `billing-config` 讀回預期值。iOS 舊 run `36645468479` 的 literal grep 檢查失敗，#557 因較高優先序的新請求取消；切換 Intel runner 後，iOS bootstrap #561（`36652795916`）成功並提交生成專案 `d01ed84`。Android bootstrap #6（`36652795834`）成功並提交生成專案 `8462837`。尚未完成簽署 archive、TestFlight 上傳、Play signed AAB 上傳或商店送審。
- 無 Xcode／Android SDK，故未執行本機 iOS／Android 原生建置；Android 二進位由 GitHub runner 建置成功。尚無 iPhone／Android 真機與 StoreKit／Play 沙盒實測。
- 本次 `1561879` 後 GitHub Actions StoreKit local purchase smoke #339（`36652307371`）、Android bootstrap #6（`36652795834`）、iOS bootstrap #561（`36652795916`）、Pages #1434（`36652795999`）及 LINE/OAuth、薪資預檢、助理自測均成功。Pages 隱私、支援、條款網址均回應 HTTP 200，支援頁線上內容已包含 Android 省電延遲提醒。StoreKit smoke 為模擬測試，不等同真機 TestFlight 購買。
- Google 官方 Play Billing 9.1.0 文件要求 secure backend 向 `subscriptionsv2.get` 驗證，並透過 purchase acknowledgement 與 RTDN 維持訂閱狀態；本次後端依此落實。[Billing integration](https://developer.android.com/google/play/billing/integrate)／[backend](https://developer.android.com/google/play/billing/backend)／[subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
