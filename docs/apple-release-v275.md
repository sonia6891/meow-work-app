# Apple 上架準備 v275

基準：目前已核准的 v274 視覺與功能；v275 同步設定版本、PWA 入口與快取，納入五張獨立行銷圖片。保留工作卡與功能架構，未合併 main。

## 圖片

`store-assets/apple-v275/` 五張各自獨立 PNG，1260 × 2736、RGB、無透明通道。排序：總覽、排班、喵助理、薪資、Pro。手機內容由 v274 真實網頁介面擷取，使用獨立示範資料；不含使用者帳號、手機儲存內容或薪資數字。外框和場景採使用者提供的參考素材。未從 iOS 真機擷取，送審前需核對與實際 iOS 版本一致。

## 打包

Web UI 版本 v275；App Store 行銷版本維持 1.0，避免誤建新版本；CI 已用工作流編號生成遞增 build number。執行 native web sync，再由 `Build signed iOS App Store artifact` 建置簽署 IPA／上傳 TestFlight。Windows 本機無 Xcode，不能聲稱完成 iOS archive。

## 提交前驗證

- iPhone TestFlight 上檢查登入、訪客、登出、刪除帳號、五個分頁、深淺色圖片及圓角。
- 沙盒月繳／年繳購買、恢復購買、訂閱失效、權益驗證。
- 月 NT$99、年 NT$790 為目前 App 參考價格；實際顯示依 StoreKit 在地商品價格。首次符合資格 3 天試用。
- 提供可完整審查 Pro 的帳號或官方允許的完整 demo；不能把 Free 訪客當成 Pro 審查入口。
- 如既有 Apple 2.1 資訊要求仍有效，補齊實機操作影片、登入／刪除帳號、付款價格／條款／隱私畫面、第三方服務說明。需要從 App Store Connect 讀取當前狀態，不能以舊文件判定已通過。
- 確認商店描述、資料隱私與目前 AI／雲端行為一致；補齊實際測試結果後再提交。

Apple 官方：
https://developer.apple.com/app-store/review/guidelines/
https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/

## 本次檢查結果

- native/scripts/sync-web.mjs 成功，v275 資源已同步至 native/www。
- 45 項本機 Node 測試通過；修正三個測試讀取 CRLF 的相容性。
- full-data-pressure 瀏覽器壓力測試尚未執行，不列入通過數。
- 五張素材已檢查為 RGB PNG，1260 × 2736。
- GitHub CLI 此環境未登入；App Store Connect 即時狀態與 iOS 簽署建置尚未驗證。
