# App Store Connect 狀態查詢自動化

Workflow: `.github/workflows/app-store-status.yml`。每 6 小時查詢一次，也可從 GitHub Actions 手動執行。結果會出現在 workflow summary，並以 JSON artifact 保留 30 天；workflow 不會修改 App Store Connect 資料。

## GitHub Actions secrets

建立一把只供查詢的 App Store Connect API 個人 key，限縮到此 App，並設定以下 repository secrets：

| Secret | 內容 |
|---|---|
| `ASC_KEY_ID` | API key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_PRIVATE_KEY` | `.p8` 檔完整 PEM 文字（作為 secret 貼入，不提交檔案） |

App ID `6817588985` 固定在 workflow，App bundle ID 為 `com.lumilab.meowwork`。只把 key secrets 暴露給這支讀取狀態的 workflow。現有簽署 workflow 保留既有 `APPLE_ASC_*` secret 名稱。

## Apple 權限

選擇 **Developer** 角色並只允許 `喵的，又要上班了`。Apple 文件列出 Developer 可檢視 build 與管理其 app 的開發／交付資訊；查詢只使用 GET，不需要 App Manager／Admin。若 Apple 對特定帳號的 review submission endpoint 回覆 403，先確認該 key 的 App 存取與 Developer 角色，不要直接擴大到 Admin。

## 查詢欄位

- App Store versions：版本號、平台、`appVersionState`（舊欄位 fallback `appStoreState`）、`releaseType`。
- 最近 builds：marketing version、build string、上傳時間、處理狀態、TestFlight internal/external availability、到期狀態。
- Review submissions：submission ID、state、送出／取消時間。

App Store Connect API 的 review submission 資源狀態與版本狀態為分開資源；輸出同時保留兩者，避免把 email 通知或單一狀態誤當完整審查結果。

## 驗證與安全

- JWT ES256 只在 runner 記憶體中簽發，有效 15 分鐘。
- `.p8` 只從 `ASC_PRIVATE_KEY` 環境變數取得，不落入 repo 或 workflow artifact。
- Workflow 權限固定為 `contents: read`；所有 App Store Connect 請求都是 GET。
- 如要更新 repo 內的 release 狀態文件，應在獨立、具明確授權的 workflow 另行設計；本 workflow 以 Actions summary 和 artifact 提供可查閱的最新輸出。

## 官方參考

- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi/)
- [API keys 與角色存取](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/)
- [角色權限](https://developer.apple.com/help/app-store-connect/reference/account-management/role-permissions/)
- [Builds API](https://developer.apple.com/documentation/appstoreconnectapi/builds)
