const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');

assert(
  html.includes("['active','trialing','grace_period'].includes(row.status)"),
  'Grace-period subscriptions must retain Pro access until pro_until.'
);
assert(
  html.includes("client.rpc('meow_save_snapshot',{p_payload:payload,p_expected_updated_at:cloudRevision})"),
  'Cloud writes must go through the optimistic-concurrency RPC.'
);
assert(
  html.includes("if(pendingCloud&&!resolveConflict){setCloudStatus('有版本衝突・請先選擇');return false}"),
  'Cloud writes must stop on unresolved conflicts.'
);
assert(
  html.includes("s.scheduleOverrides=x.scheduleOverrides||{}"),
  'Schedule overrides must survive load/normalize/cloud restore.'
);
assert.equal(
  (html.match(/function normalizeState\(v\)\{/g)||[]).length,
  1,
  'normalizeState must have one authoritative definition; a stale duplicate can silently drop fields.'
);
assert(
  html.includes("s.personalEvents=x.personalEvents||{}"),
  'Events and todos must survive load/normalize/cloud restore.'
);
assert(
  html.includes("delete snapshot.theme"),
  'Theme must remain device-local and stay out of cloud snapshots.'
);
assert(
  html.includes("history:history.slice(0,5)"),
  'Cloud payload must retain bounded recovery history.'
);
assert(
  html.includes("if(!preserveBeforeReplace())"),
  'Remote restore must preserve a local safety copy before replacement.'
);
assert(
  !html.includes("create-ecpay-checkout") &&
  !html.includes("create-ecpay-stage-checkout") &&
  !html.includes("ecpay-billing-webhook"),
  'Production client must not reference retired ECPay billing routes.'
);
assert(
  !/service[_-]?role/i.test(html) && !/sb_secret_/i.test(html),
  'Public client must not contain server-only Supabase credentials.'
);


assert(
  html.includes("const restored={savedAt:lastSavedAt,state,owner:localOwner}") &&
  html.includes("localStorage.setItem(workspaceKey(localOwner),JSON.stringify(restored))"),
  'IndexedDB recovery must preserve workspace ownership and its per-account mirror.'
);
assert(
  html.includes("if(file.size>8*1024*1024)throw new Error('backup_too_large')") &&
  html.includes("data.app&&data.app!=='喵的，又要上班了'"),
  'Backup import must reject oversized files and backups for another app.'
);
const swReloadVersion=(html.match(/meow-sw-reloaded-v(\d+)/)||[])[1];
const swRegisterVersion=(html.match(/register\('\.\/sw\.js\?v=(\d+)'/)||[])[1];
assert(
  Number(swReloadVersion)>=156 &&
  Number(swRegisterVersion)>=156 &&
  swReloadVersion===swRegisterVersion,
  'Service worker registration must stay cache-busted and keep matching versions after recovery changes.'
);


assert(
  html.includes("async function restoreFromCloud(showAlert=true)") &&
  html.includes("正在讀取雲端備份…") &&
  html.includes("目前這台裝置已經和雲端備份完全相同") &&
  html.includes("已從雲端還原。"),
  'Manual cloud restore must always give visible feedback and restore directly.'
);
assert(
  html.includes("async function restoreLegacyCloud()") &&
  html.includes("直接還原舊版備份") &&
  html.includes("不需要另外開啟 JSON 檔") &&
  !html.includes("$('legacyCloudExport').onclick=exportLegacyCloud"),
  'Legacy backup action must restore in-app instead of forcing a JSON download/import detour.'
);
assert(
  html.includes("所以目前資料沒有被替換"),
  'Restore persistence failures must leave the previous in-memory data intact.'
);



assert(
  html.includes("function canCloudSync(){return !!(hasCloudEntitlement()&&authUser&&localOwner===authUser.id)}"),
  'Pro/developer cloud sync must be automatic and must not depend on device-local consent.'
);
assert(
  html.includes("cloudOwnerId=String(data&&data.cloud_owner_user_id||uid)") &&
  html.includes(".eq('user_id',cloudOwnerId||uid)") &&
  html.includes("filter:'user_id=eq.'+owner"),
  'Cloud reads and realtime subscriptions must use the canonical cloud workspace owner.'
);
assert(
  html.includes("switchWorkspace(uid,true)") &&
  html.includes("document.documentElement.classList.remove('auth-needs-login')") &&
  html.includes("void (async()=>") &&
  html.includes("if(canCloudSync()&&!cloudReady)await loadAccountState()"),
  'Login must reveal the local workspace immediately while cloud hydration continues safely in the background.'
);
assert(
  html.includes("syncReason:'auto'") &&
  html.includes("syncReason:'manual_backup'"),
  'Automatic sync and manual backup writes must be distinguishable for versioned backup retention.'
);
assert(
  html.includes("async function refreshCloudBackupStatus()") &&
  html.includes("meow_cloud_backup_status") &&
  html.includes("自動備份："),
  'The app must surface automatic backup status and last successful cloud state.'
);
assert(
  html.includes("async function restorePreviousCloudBackup(showAlert=true)") &&
  html.includes("meow_restore_latest_backup") &&
  html.includes("還原上一個自動備份"),
  'Pro users must be able to restore a previous automatic cloud backup from the app.'
);

assert(
  html.includes("['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)") &&
  html.includes("status==='SUBSCRIBED'") &&
  html.includes("已重新連線・正在確認雲端版本…"),
  'Realtime must surface error, timeout and closed states and re-check cloud state after reconnect.'
);
assert(
  !html.includes('登入本身不會開啟同步') &&
  !html.includes('Pro 可用・請先啟用雲端同步') &&
  html.includes('Free 版本只保存在本機。'),
  'Cloud messaging must match automatic Pro sync and local-only Free behavior.'
);

console.log('Cloud sync v190 regression checks passed.');
