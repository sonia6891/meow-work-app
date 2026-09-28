# 《喵的，又要上班了》完整壓力測試

- Commit: fa8666557545d3913d41f509e94257983c4e35ec
- Runner: Linux
- Node: v22.23.2
- UTC: 2026-09-28T18:54:42Z

## A. 全部 Node / CJS 回歸
- ✅ CJS tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ CJS tests/app-store-notifications-v2-gate-v135.test.cjs — 0s
- ✅ CJS tests/app-store-sandbox-preflight-v131.test.cjs — 0s
- ✅ CJS tests/browser-account-v117.cjs — 19s
- ✅ CJS tests/cloud-sync-v156.test.cjs — 0s
- ✅ CJS tests/meow-assistant-100.test.cjs — 0s
- ✅ CJS tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ CJS tests/meow-assistant-ai-nlu.test.cjs — 0s
- ✅ CJS tests/meow-assistant-auto-discovery.test.cjs — 0s
- ✅ CJS tests/meow-assistant-contextual-operations.test.cjs — 1s
- ✅ CJS tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ CJS tests/meow-assistant-labor-kb.test.cjs — 0s
- ✅ CJS tests/meow-assistant-layer4-grounding.test.cjs — 0s
- ✅ CJS tests/meow-assistant-leave-law.test.cjs — 0s
- ✅ CJS tests/meow-assistant-live-failure-classification.test.cjs — 0s
- ✅ CJS tests/meow-assistant-live-quality-harness.test.cjs — 0s
- ✅ CJS tests/meow-assistant-live-repair-hints.test.cjs — 0s
- ✅ CJS tests/meow-assistant-multi-intent-response.test.cjs — 0s
- ✅ CJS tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ CJS tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ CJS tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ CJS tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ CJS tests/meow-assistant-round2-100.test.cjs — 0s
- ✅ CJS tests/pro-ai-v125.cjs — 0s
- ✅ CJS tests/storekit-verification-gate-v130.test.cjs — 0s
- ✅ CJS tests/theme-persistence.test.cjs — 0s
- ✅ CJS tests/ui-v129.test.cjs — 0s

## B. 舊版 Python Playwright 回歸
- ❌ PY tests/browser-v112.py — exit 1, 32s

### Failure: PY tests/browser-v112.py
~~~text
PASS 首次開啟顯示歡迎頁
PASS 厭世貓品牌圖片已載入
PASS Apple 未設定時不顯示假登入按鈕
PASS 歡迎頁沒有水平溢出
Traceback (most recent call last):
  File "/home/runner/work/meow-work-app/meow-work-app/tests/browser-v112.py", line 55, in <module>
    page.locator('#welcomeEmail').click();check('Email 表單可展開',lambda:assertion(page.locator('#welcomeEmailInput').is_visible()))
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/sync_api/_generated.py", line 15637, in click
    self._sync(
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/_impl/_sync_base.py", line 115, in _sync
    return task.result()
           ^^^^^^^^^^^^^
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/_impl/_locator.py", line 162, in click
    return await self._frame._click(self._selector, strict=True, **params)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/_impl/_frame.py", line 566, in _click
    await self._channel.send("click", self._timeout, locals_to_params(locals()))
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/_impl/_connection.py", line 69, in send
    return await self._connection.wrap_api_call(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/_impl/_connection.py", line 559, in wrap_api_call
    raise rewrite_error(error, f"{parsed_st['apiName']}: {error}") from None
playwright._impl._errors.TimeoutError: Locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator("#welcomeEmail")

~~~
- ❌ PY tests/browser-frame-v113.py — exit 1, 1s

### Failure: PY tests/browser-frame-v113.py
~~~text
PASS 首次安裝顯示框架頁
PASS 框架四邊皆有留白，非滿版
FAIL 圓角為 28px
Traceback (most recent call last):
  File "/home/runner/work/meow-work-app/meow-work-app/tests/browser-frame-v113.py", line 57, in <module>
    check('圓角為 28px',r['radius']=='28px')
  File "/home/runner/work/meow-work-app/meow-work-app/tests/browser-frame-v113.py", line 28, in check
    assert passed,name
           ^^^^^^
AssertionError: 圓角為 28px
~~~
- ✅ PY tests/browser-line-v116.py — 6s
- ❌ PY tests/browser-logout-v114.py — exit 1, 2s

### Failure: PY tests/browser-logout-v114.py
~~~text
PASS 已登入且看過歡迎頁，不在重開時重複顯示
PASS 完整關閉頁面再開，保留登入及本機資料
PASS 更新登入憑證不重複跳出
Traceback (most recent call last):
  File "/home/runner/work/meow-work-app/meow-work-app/tests/browser-logout-v114.py", line 85, in <module>
    page.evaluate("document.getElementById('welcomeOtpInput').value='999999';document.getElementById('welcomeEmailInput').value='old@example.test'")
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/sync_api/_generated.py", line 8562, in evaluate
    self._sync(
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/_impl/_sync_base.py", line 115, in _sync
    return task.result()
           ^^^^^^^^^^^^^
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/_impl/_page.py", line 464, in evaluate
    return await self._main_frame.evaluate(expression, arg)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/_impl/_frame.py", line 320, in evaluate
    await self._channel.send(
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/_impl/_connection.py", line 69, in send
    return await self._connection.wrap_api_call(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/meow-work-app/meow-work-app/.stress-venv/lib/python3.12/site-packages/playwright/_impl/_connection.py", line 559, in wrap_api_call
    raise rewrite_error(error, f"{parsed_st['apiName']}: {error}") from None
playwright._impl._errors.Error: Page.evaluate: TypeError: Cannot set properties of null (setting 'value')
    at eval (eval at evaluate (:290:30), <anonymous>:1:49)
    at eval (<anonymous>)
    at UtilityScript.evaluate (<anonymous>:290:30)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
~~~

## C. 關鍵流程重複壓測
- ✅ ROUND 1 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 1 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 1 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 1 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 1 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 1 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 1 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 1 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 1 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 1 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 2 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 2 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 2 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 2 tests/annual-leave-10h-regression.test.cjs — 1s
- ✅ ROUND 2 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 2 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-negation-12690.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-natural-actions-20000.test.cjs — 2s
- ✅ ROUND 3 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 3 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 3 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 3 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 3 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 4 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 4 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 4 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 4 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 4 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 4 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 4 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 4 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 4 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 4 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 5 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 5 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 5 tests/meow-assistant-action-execution.test.cjs — 0s
- ✅ ROUND 5 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 5 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 5 tests/meow-assistant-contextual-operations.test.cjs — 1s
- ✅ ROUND 5 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 5 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 5 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 5 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 6 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 6 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
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
- ✅ ROUND 8 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 8 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
- ✅ ROUND 8 tests/meow-assistant-action-execution.test.cjs — 1s
- ✅ ROUND 8 tests/meow-assistant-multiturn-e2e.test.cjs — 0s
- ✅ ROUND 8 tests/meow-assistant-multiturn-fuzz-1000.test.cjs — 0s
- ✅ ROUND 8 tests/meow-assistant-contextual-operations.test.cjs — 0s
- ✅ ROUND 8 tests/meow-assistant-conversation-memory.test.cjs — 0s
- ✅ ROUND 8 tests/annual-leave-10h-regression.test.cjs — 0s
- ✅ ROUND 8 tests/cloud-sync-v156.test.cjs — 0s
- ✅ ROUND 8 tests/theme-persistence.test.cjs — 0s
- ✅ ROUND 9 tests/meow-assistant-negation-12690.test.cjs — 1s
- ✅ ROUND 9 tests/meow-assistant-natural-actions-20000.test.cjs — 1s
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
- ✅ ROUND 10 tests/cloud-sync-v156.test.cjs — 1s
- ✅ ROUND 10 tests/theme-persistence.test.cjs — 0s

## 結果

**FAIL：共有 3 個測試項目失敗。**
