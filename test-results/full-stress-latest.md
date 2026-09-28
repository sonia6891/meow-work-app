# 《喵的，又要上班了》完整壓力測試

- Commit: a66883645789c60f911b96dcf39a8bd2a6a5e0c1
- Runner: Linux
- Node: v22.23.2
- UTC: 2026-09-28T19:06:20Z

## A. 全部 Node / CJS 回歸
- ✅ CJS tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ CJS tests/app-store-notifications-v2-gate-v135.test.cjs — 1s
- ✅ CJS tests/app-store-sandbox-preflight-v131.test.cjs — 0s
- ✅ CJS tests/browser-account-v117.cjs — 17s
- ✅ CJS tests/cloud-sync-v156.test.cjs — 0s
- ❌ CJS tests/full-data-pressure.test.cjs — exit 124, 420s

### Failure: CJS tests/full-data-pressure.test.cjs
~~~text
PASS 大量資料筆數完整注入 :: {"replaceMs":0,"renderMs":3348.9000000000087,"dayStatus":1866,"events":5000,"overrides":730,"months":120,"fingerprintBytes":917233}
PASS 大量資料完整 render 不崩潰 :: {"renderMs":3348.9000000000087}
PASS 大量狀態可建立穩定 fingerprint :: {"bytes":917233}
PASS 大量資料可完整本機儲存 :: {"ok":true,"elapsed":24.59999999999127,"bytes":917402,"dayStatus":1866,"events":5000}
PASS 大量本機儲存未超過合理 CI 時間 :: {"elapsed":24.59999999999127,"bytes":917402}
PASS 120 次連續資料變更後狀態正確 :: {"mutationMs":2918.899999999994,"tabMs":407949.70000000007,"base":50119,"net":80372.51805555556,"gross":85663.51805555556,"otPay":23844.518055555556}
FAIL 120 次快速頁籤切換未卡死 :: {"tabMs":407949.70000000007}
AssertionError [ERR_ASSERTION]: 120 次快速頁籤切換未卡死
    at check (/home/runner/work/meow-work-app/meow-work-app/tests/full-data-pressure.test.cjs:73:10)
    at /home/runner/work/meow-work-app/meow-work-app/tests/full-data-pressure.test.cjs:194:3 {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '==',
  diff: 'simple'
}
~~~
- ✅ CJS tests/meow-assistant-100.test.cjs — 0s
- ✅ CJS tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ CJS tests/meow-assistant-ai-nlu.test.cjs — 0s
- ✅ CJS tests/meow-assistant-auto-discovery.test.cjs — 0s
- ✅ CJS tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ CJS tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ CJS tests/meow-assistant-labor-kb.test.cjs — 0s
- ✅ CJS tests/meow-assistant-layer4-grounding.test.cjs — 0s
- ✅ CJS tests/meow-assistant-leave-law.test.cjs — 0s
- ✅ CJS tests/meow-assistant-live-failure-classification.test.cjs — 0s
- ✅ CJS tests/meow-assistant-live-quality-harness.test.cjs — 0s
- ✅ CJS tests/meow-assistant-live-repair-hints.test.cjs — 0s
- ✅ CJS tests/meow-assistant-multi-intent-response.test.cjs — 0s
- ✅ CJS tests/meow-assistant-multiturn-e2e.test.cjs — 1s
- ✅ CJS tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ CJS tests/meow-assistant-natural-actions-20000.test.cjs — 0s
- ✅ CJS tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ CJS tests/meow-assistant-round2-100.test.cjs — 0s
- ✅ CJS tests/pro-ai-v125.cjs — 0s
- ✅ CJS tests/storekit-verification-gate-v130.test.cjs — 0s
- ✅ CJS tests/theme-persistence.test.cjs — 0s
- ✅ CJS tests/ui-v129.test.cjs — 0s

## B. 現行登入／瀏覽器相容性

- ℹ️ browser-v112.py、browser-frame-v113.py、browser-logout-v114.py 為歷史測試，仍要求已移除的訪客／Email／OTP 舊流程，不再作為現行品質閘門。
- ℹ️ 現行登入規格由 browser-account-v117.cjs 與 browser-line-v116.py 驗證：Google＋LINE、無公開 Email／OTP、登出與帳號狀態。
- ✅ PY tests/browser-line-v116.py — 5s

## C. 關鍵流程重複壓測
- ✅ ROUND 1 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 1 tests/meow-assistant-natural-actions-20000.test.cjs — 0s
- ✅ ROUND 1 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 1 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 1 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 1 tests/meow-assistant-contextual-operations.test.cjs — 1s
- ✅ ROUND 1 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 1 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 1 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 1 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-negation-12690.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 2 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 2 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 2 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 2 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-negation-12690.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 3 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 3 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 3 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 3 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 4 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 4 tests/meow-assistant-natural-actions-20000.test.cjs — 0s
- ✅ ROUND 4 tests/meow-assistant-action-execution.test.cjs — 1s
- ✅ ROUND 4 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 4 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 4 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 4 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 4 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 4 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 4 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 5 tests/meow-assistant-negation-12690.test.cjs — 0s
- ✅ ROUND 5 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 5 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 5 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 5 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 5 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 5 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 5 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 5 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 5 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 6 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 6 tests/meow-assistant-natural-actions-20000.test.cjs — 0s
- ✅ ROUND 6 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 6 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 6 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 6 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 6 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 6 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 6 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 6 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 7 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 7 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 7 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 7 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 7 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 7 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 7 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 7 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 7 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 7 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 8 tests/meow-assistant-negation-12690.test.cjs — 0s
- ✅ ROUND 8 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 8 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 8 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 8 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 8 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 8 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 8 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 8 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 8 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 9 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 9 tests/meow-assistant-natural-actions-20000.test.cjs — 0s
- ✅ ROUND 9 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 9 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 9 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 9 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 9 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 9 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 9 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 9 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 10 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 10 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 10 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 10 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 10 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 10 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 10 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 10 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 10 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 10 tests/theme-persistence.test.cjs — 0s

## 結果

**FAIL：共有 1 個測試項目失敗。**
