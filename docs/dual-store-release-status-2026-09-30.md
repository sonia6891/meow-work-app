# 雙平台上架狀態｜喵的，又要上班了

## 2026-09-30 最新 iOS 簽署與上傳進度

- 使用者確認貓咪圖像由其委託生成，並明確確認 Apple「具有第三方內容必要權利」選項；App Store Connect「內容版權」已選「是」並顯示儲存成功。iOS App 1.0（建置 1001）已加入「提交項目草稿」，版本狀態變成「準備審查」，尚未按最終「提交以供審查」。月繳、年繳訂閱尚未加入草稿：Apple 對月繳明確回報「你必須為審查資訊新增截圖」。兩項訂閱的審查備註已儲存；[原生訂閱畫面擷取流程 #1](https://github.com/sonia6891/meow-work-app/actions/runs/36675316162)已啟動，待檢視產出的真實模擬器畫面後上傳。
- 針對 Apple 審查帳密欄位，版本 `1001` 加回原有本機「先使用，不登入」入口；該入口只使用裝置本機 Free 資料，不提供未授權雲端功能。提交 `ffb2f8c` 的[簽署上傳流程 #10](https://github.com/sonia6891/meow-work-app/actions/runs/36673708623)成功，App Store Connect 已處理建置 `1001`，版本 1.0 已改選 `1001`；TestFlight 內部群組已加入 `1001`，並儲存新版測試內容。審查備註已明確說明本機入口及 Apple 登入流程，「需要登入」已改為否並重新載入核對。再次按「新增以供審查」後，Apple 僅列出尚未完成的內容版權聲明；仍未建立送審項目。
- [原生截圖流程 #3](https://github.com/sonia6891/meow-work-app/actions/runs/36673741105)成功；新登入圖 1242×2688 已由使用者提供，透過 App Store Connect API 上傳並讀回 `COMPLETE`。舊登入圖已從商店截圖組移除，API 讀回只剩新圖一張。這仍只有登入畫面；功能頁與訂閱審查圖待補。
- App Store Connect 版本 1.0 的版權已填 `2026 王姵璇`；免費定價及首發台灣供應地區已儲存，Mac 與 Vision Pro 供應選項已關閉。初次送審檢查曾列出內容權利、定價及審查帳密四項缺漏；更新建置與本機訪客入口後，再次檢查只剩內容權利聲明。
- App Store Connect「App 資訊」已完成年齡分級問卷，依現有功能選擇無社群傳訊、廣告及成人／暴力／賭博內容，後台計算並儲存 4+。App Store Server Notifications V2 的正式與沙箱 URL 均已設定為專案 `app-store-notifications-v2` Edge Function，兩欄在後台讀回一致；該接收端的 GET 回應 HTTP 200。版本 1.0 改為審查通過後手動發佈，以便審核通過後再決定上線時點。
- Google Play Console 再次核對仍顯示「Google 正在驗證您的身分」，建立第一個 App 的控制項停用；Android 商品建立與 AAB 上傳仍待 Google 放行。
- 原生 iOS 登入圖目前使用建置 1001 的 1242 × 2688 圖片；舊圖已移除，功能頁與訂閱審查截圖仍待補齊。
- [GitHub Actions 簽署版 901](https://github.com/sonia6891/meow-work-app/actions/runs/36671527755) 曾成功封存、匯出及上傳，現已由建置 1001 取代。TestFlight 內部群組目前 0 位測試人員，因此尚無安裝邀請。
- App 隱私權 9 種資料類型已發佈，審查聯絡資料及版權權利人已儲存。功能與訂閱審查畫面仍待補齊；Google Play 開發者身分驗證仍阻擋建立 Android 商品。
- Apple Distribution 憑證、主 App 與 Widget 的 App Store 描述檔已建立；兩個 App ID 均已綁定 `group.com.lumilab.meowwork.shared`，並重建含此授權的 v2 描述檔。簽署資料已放入 GitHub Actions secrets，未提交至 Git。
- `build-ios-release.yml` 改用 `macos-26`／Xcode 26.6。簽署封存、IPA 匯出與 App Store Connect 上傳均成功；[GitHub Actions #6](https://github.com/sonia6891/meow-work-app/actions/runs/36668130275) 結果為 success。
- 已補上語音資料的 iOS Privacy Manifest 與公開隱私權政策揭露。更新後的 [GitHub Actions #7](https://github.com/sonia6891/meow-work-app/actions/runs/36669367714) 已成功簽署、匯出及上傳 IPA；App Store Connect 已處理建置 701，build API 狀態為 `VALID`，並已選入 App Store 1.0 版本頁儲存。TestFlight 已建立「iOS 1.0 內部測試」群組並加入建置 701，但尚未邀請測試人員，因此沒有可供安裝的邀請連結。
- App Store Connect 的審查聯絡資料已儲存；9 種資料類型的 App 隱私權聲明已於使用者明確確認後發佈。正式送審仍待原生 App 截圖、審查登入方式、版權欄位及其餘版本檢查。尚未提交審查或宣稱通過。下方較早的盤點段落保留為歷程，當中的「尚未簽署／上傳」已由本節更新。

## 商店後台即時核對（2026-09-30）

- Google Play Console「Sonia.W」開發者首頁顯示：Google 正在驗證已上傳的身分文件；聯絡電話驗證須待文件核准；「建立應用程式」為停用狀態，且帳戶尚無 App。這是目前無法建立 Play 商品與上傳內測版的直接阻擋。
- 使用者已登入 Apple Developer 並登記 App ID `com.lumilab.meowwork`（Meow Work iOS App，團隊 `UA6S3LJ86P`）。App Store Connect 已建立 iOS App「喵的，又要上班了」，Apple ID `6817588985`，SKU `MEOWWORK-IOS-001`，版本 1.0 狀態為「準備提交」。繁體中文產品文案、關鍵字、副標題、分類及隱私權政策網址已儲存。App 仍未送審。
- 已建立訂閱群組 `Meow Work Pro`（群組 ID `22426667`，顯示名稱「Pro 方案」）。月繳 `meowwork.pro.monthly`（Apple ID `6817590548`）台灣價格 NT$99；年繳 `meowwork.pro.yearly`（Apple ID `6817593714`）台灣預付價格 NT$790。兩者均只在台灣供應，限 App Store 單一名額購買，家人共享未啟用；台灣新訂閱者的前 3 天免費試用已建立，2026-10-01 生效且無結束日期。上述資料均在 App Store Connect 儲存後讀回，商品仍為「準備提交」。
- Apple 訂閱審查截圖、版本 iPhone 截圖、App 隱私問卷、年齡分級、審查聯絡資訊、簽署建置與 TestFlight 實機測試仍未完成。版本頁當前顯示的 6.5 吋 iPhone 截圖規格為 1242×2688 或 1284×2778；現有 1320×2868 草稿尺寸不符，也不是簽署原生版的實機畫面，不能直接上傳。
- 公開 `support.html` 目前提供 GitHub Issues 支援表單，尚未提供已核實的客服電子郵件。正式商店聯絡資料需由帳號持有人提供，不能代填。

## 最新進度（2026-09-30，提交 `14303e2`）

- 原生 Android 啟動圖示與 splash 已改用專案追蹤的正式品牌圖；iOS bootstrap 和 Android debug build 在提交 `7f5f634` 後成功（iOS run `36657368394`、Android run `36657368385`）。iOS 生成專案更新提交為 `2ff5b61`。這些是未簽署的建置，無法證明實機購買或商店審核結果。
- 訂閱 Free 畫面在原生平台只顯示對應的 App Store 或 Google Play 名稱，另產出 Apple 訂閱審查截圖草稿。草稿使用模擬 iOS 商店橋接及設定價格；正式審查圖仍須待 App Store Connect 商品與簽署版就緒後實機重拍。
- Android bootstrap 已加入 unsigned `bundleRelease` 步驟；Android run `36657906032` 的 debug APK 與 unsigned release AAB 編譯成功。iOS run `36657905942` 的 Simulator Debug 與 unsigned iPhoneOS Release 編譯成功，生成專案更新為 `91bd50a`。Pages run `36657906009`、StoreKit 模擬購買 run `36657906040`、薪資預檢、助理自測及 LINE/UI 預檢均成功。這些結果尚不等於簽署封存、商店上傳或真機付款驗證。
- 已製作新的素材包：Apple 公開候選圖 8 張、Apple 訂閱審查草稿 1 張、Google Play 手機候選圖 8 張、Google 宣傳圖 1 張，共 18 張 PNG。此包供審閱，不是最終可提交素材。
- GitHub Actions secrets 清單於本次再次唯讀核對，仍只有 `SUPABASE_ACCESS_TOKEN`。簽署與商店上傳所需的 Apple／Google secrets 尚未設定，因此 TestFlight 與 Google Play 內測上傳仍無法執行。

盤點日期：2026-09-30
程式基準：App／原生專案參考 `26df781`、Android 生成專案 `8462837`、iOS 生成專案 `a51264c`（由 CI 更新 Xcode 專案檔）、提醒修補 `1561879`；商店素材草稿收錄於 `21bb172`、`9caa2eb` 與 `34cd406`。
本文件描述程式、GitHub CI 和部署狀態；不代表已建立完整商店商品、上傳簽署二進位檔或送審。

## iOS App Store

**程式能力：已完成主要原生付款路徑。可進入正式帳號、簽署與商店設定階段；本環境尚未形成可上傳的簽署 archive。**

- Capacitor iOS、Bundle ID `com.lumilab.meowwork`、StoreKit 2 bridge 已存在。
- 商品 ID 為 `meowwork.pro.monthly` / `meowwork.pro.yearly`；月繳 NT$99、年繳 NT$790、符合資格者 3 天試用。
- 已有交易伺服器驗證、未完成交易重試、Restore、管理訂閱及 App Store Server Notifications V2 程式路徑。
- Apple Developer 團隊、App ID、App Store Connect 記錄及兩個訂閱商品已建立並讀回；仍須完成簽署、Server Notifications 設定、TestFlight 沙盒實機流程、隱私揭露、正式截圖及審查聯絡人。真實聯絡資料不可由程式推定。
- Apple 截圖草稿 8 張已放在 `store-assets/drafts/`；它們由桌面 Chromium 手機尺寸視窗產生，須待簽署 build 在 iPhone 實機重新拍攝後，才可作為正式商品頁素材。Pro 逐項對帳圖使用直接注入的虛構辨識結果，並非真實 OCR 流程證據。
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
- Google Play 截圖草稿 8 張與 1024 × 500 宣傳圖已放在 `store-assets/drafts/`；手機截圖須在簽署 Android build 真機重拍並確認後才能上傳。Pro 逐項對帳圖使用直接注入的虛構辨識結果，並非真實 OCR 流程證據。
- 2026-08-31 起 Google Play 新 App 與更新須 target Android 16 / API 36 以上；正式產生 Android 專案時必須固定符合此提交門檻。[官方規定](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- 上架前需 Play Console 內部／封閉測試軌、App signing、Data safety、帳號刪除入口、政策頁、支援聯絡資料、內容分級、商店素材與 Play Billing 沙盒測試。

## 本次程式修補

- 增加 Capacitor Android 8.5.2 平台依賴及 `cap:add:android` / `cap:open:android` 指令。
- 增加 Android 生成、target API 36、Play Billing 9.1.0、安全金鑰及人工設定說明與 CI bootstrap。
- 前端交易分流使用 iOS signed transaction 與 Android purchase token 各自的後端 verifier；Restore 與購買狀態同步都會依平台送驗。
- `billing-config` 回報 Android package name、service account／RTDN 設定狀態，預設為未就緒；不暴露憑證內容。
- Pro 薪資逐項對帳面板展開且位於薪資頁時，暫時隱藏右下角喵助理浮動按鈕，避免遮住差異列與修正操作；收起面板後會恢復。Apple／Google 尺寸瀏覽器截圖均已確認此開關行為。

## 目前需要的帳號端設定

1. Apple Developer/App Store Connect：團隊、正式 App 記錄、訂閱群組／商品／試用、簽署、測試者及真實支援與審查聯絡資料。
2. Google Play Console/Cloud：先等開發者身分文件審核通過，再完成電話驗證；目前「建立 App」停用。通過後建立 App 記錄、第一次 AAB 手動上傳（若 Play API 尚未啟用該套件）、訂閱/base plan/offer、Play App Signing、Google Play Developer API service account、Pub/Sub topic 與 RTDN。
3. `SUPABASE_ACCESS_TOKEN` GitHub secret 已由使用者設定；Supabase 部署 workflow #10、#12 成功，已部署薪資單驗證、計費設定、App Store 驗證／通知與 Google Play 驗證／RTDN functions。固定 Play package name 已由程式預設並在線上 `billing-config` 讀回確認。Play Console 建立後仍需在 Supabase secrets 設定 `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`（具 Android Publisher 權限的服務帳號 JSON）、`GOOGLE_PLAY_RTDN_AUDIENCE`（Pub/Sub push audience）與 `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL`（Pub/Sub OIDC 身分）。金鑰不能寫入 Git。
4. Google Play 驗證與 RTDN functions 已部署；線上查詢目前為 `package_name=com.lumilab.meowwork`、`credentials_configured=false`、`notifications_configured=false`，故 `production_server_verification_ready=false`，安全維持未就緒。RTDN function 必須停用 Supabase gateway JWT 驗證，因 endpoint 會自行驗 Google OIDC token；正式連接 Play Console 後，Pub/Sub 需設定相同 audience 及服務帳號。
5. Android bootstrap CI #4（`36650751340`）已成功；安裝 Play 內測版後，在實機逐項驗證新購、試用、待處理付款、續訂、退款、取消、到期、恢復、帳號刪除。
6. 2026-09-30 以 GitHub Actions secrets 清單做唯讀名稱核對：目前只有 `SUPABASE_ACCESS_TOKEN`；下列 Android／iOS 簽署與上傳 secrets 均不存在。Android workflow 需要 `PLAY_UPLOAD_KEYSTORE_BASE64`、`PLAY_UPLOAD_KEY_ALIAS`、`PLAY_UPLOAD_STORE_PASSWORD`、`PLAY_UPLOAD_KEY_PASSWORD`、`PLAY_SERVICE_ACCOUNT_JSON`；iOS workflow 需要 `APPLE_ASC_KEY_P8`、`APPLE_ASC_KEY_ID`、`APPLE_ASC_ISSUER_ID`、`APPLE_TEAM_ID`。未讀取或輸出任何 secret 值。商店帳號、App 記錄、商品和憑證就緒後，手動執行各自的 `Build signed ... release` workflow 會產生簽署包；Android workflow 接著會上傳至 Google Play internal testing，iOS workflow 會上傳至 App Store Connect／TestFlight。Production release 仍待商店帳號設定、憑證、實機測試與正式素材完成。

## 本次驗證限制

- 已推送 `379cbb7`（雙平台原生／付款準備）、`b594426`（修正 Android Billing 編譯）、`dac58b1`（OAuth 僅用 PKCE code exchange）、`893c337`（修正 iOS CI literal bracket check）、`21bb172`／`9caa2eb`（Apple／Google 商店素材草稿）、`0fe7e9a`（狀態文件基準修訂）及 `34cd406`（Pro 對帳浮動助理避讓、商店草稿與狀態更新）。iOS 原生 bootstrap 後續由 CI 提交 `a51264c`。舊本機鏡像未修改。
- Node runtime 可用；已透過隨附 pnpm 啟用 Windows 系統憑證呼叫 npm CLI。更新 `package-lock.json` 並成功完成 `npm ci --ignore-scripts`、Capacitor web bundle 同步、Android/iOS plugin sync、原生 patch 腳本重複執行，以及 iOS URL scheme plist 解析檢查。
- 本機 45 個 Node regression tests、5 個 Google Play entitlement tests、Deno Edge Function type checks 全通過；Pages run `36645468517`、LINE/OAuth CI `36645468540`、Android debug build `36645468550`、assistant self-test `36645468446`、payroll preflight `36645468468` 均成功。線上 Pages 回應 HTTP 200，部署內容已核對。
- Supabase deploy run `36645095707` 曾因 `SUPABASE_ACCESS_TOKEN` 缺少而停止；使用者補上 GitHub secret 後，run `36648640983` 成功。run `36649858592` 的最後 secrets 寫入步驟因 scoped PAT 缺少 `edge_functions_secrets_write` 權限而失敗；已移除該步驟，改由固定程式預設值，run `36650024839` 全步驟成功，且線上 `billing-config` 讀回預期值。iOS 舊 run `36645468479` 的 literal grep 檢查失敗，#557 因較高優先序的新請求取消；切換 Intel runner 後，iOS bootstrap #561（`36652795916`）成功並提交生成專案 `d01ed84`。Android bootstrap #6（`36652795834`）成功並提交生成專案 `8462837`。尚未完成簽署 archive、TestFlight 上傳、Play signed AAB 上傳或商店送審。
- 無 Xcode／Android SDK，故未執行本機 iOS／Android 原生建置；Android 二進位由 GitHub runner 建置成功。尚無 iPhone／Android 真機與 StoreKit／Play 沙盒實測。
- 本次 `1561879` 後 GitHub Actions StoreKit local purchase smoke #339（`36652307371`）、Android bootstrap #6（`36652795834`）、iOS bootstrap #561（`36652795916`）、Pages #1434（`36652795999`）及 LINE/OAuth、薪資預檢、助理自測均成功。最新素材文件推送的 Pages #1439（`36655045257`）於 2026-09-30 成功，公開首頁回應 HTTP 200。Pages 隱私、支援、條款網址亦已回應 HTTP 200，支援頁線上內容已包含 Android 省電延遲提醒。StoreKit smoke 為模擬測試，不等同真機 TestFlight 購買。
- 針對提交 `34cd406` 的 GitHub Actions：Android bootstrap `36656268365`、iOS bootstrap `36656268372`、Pages deploy `36656268391`、StoreKit local purchase smoke `36656268443`、助理自測 `36656268386`、Pro 薪資預檢 `36656268377` 及 LINE/UI 預檢 `36656268333` 均成功。Pages 公開首頁 HTTP 200，線上 HTML 已核對包含 Pro 對帳助理避讓修補。此 StoreKit 流程是模擬購買驗證，不等同真機 TestFlight 購買。
- Google 官方 Play Billing 9.1.0 文件要求 secure backend 向 `subscriptionsv2.get` 驗證，並透過 purchase acknowledgement 與 RTDN 維持訂閱狀態；本次後端依此落實。[Billing integration](https://developer.android.com/google/play/billing/integrate)／[backend](https://developer.android.com/google/play/billing/backend)／[subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
