'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function section(start, end) { return html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start))); }
function setup({ signedIn = false, products = {}, loaded = false, failed = false, bridge = {} } = {}) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '', classList: { toggle() {} } });
    return elements.get(id);
  };
  const ctx = vm.createContext({ $: get, authUser: signedIn ? { id: 'test' } : null,
    storeProductsById: products, storeProductsLoaded: loaded, storeProductsFailed: failed,
    storeBillingBridge: () => bridge, storePlatformName: () => 'App Store', storePlatformId: () => 'ios',
    currentPlan: () => 'free', DEV_TESTING_ENABLED: false, trialStartedAt: null,
    escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') });
  vm.runInContext(section('function storeProductId(', 'async function startStoreSubscription(') + '\n' +
    section('function renderProPlanSettings(', 'function renderAccountPlan('), ctx);
  ctx.renderProPlanSettings();
  return { ctx, get };
}
for (const signedIn of [false, true]) {
  test(`Free status and cards use localized monthly/yearly metadata (${signedIn ? 'signed in' : 'signed out'})`, () => {
    const { get } = setup({ signedIn, loaded: true, products: {
      'meowwork.pro.monthly': { displayPrice: 'US$2.99' }, 'meowwork.pro.yearly': { displayPrice: '€24,99' }
    } });
    assert.match(get('proPlanStatusBox').innerHTML, /月繳 US\$2\.99／月・年繳 €24,99／年/);
    assert.equal(get('proMonthlyPrice').textContent, 'US$2.99');
    assert.equal(get('proYearlyPrice').textContent, '€24,99');
    assert.doesNotMatch(get('proPlanStatusBox').innerHTML, /NT\$99|NT\$790/);
    if (signedIn) assert.equal(get('liveMonthlyCheckout').textContent, '月繳 Pro・US$2.99／月');
  });
  for (const [label, options, expected] of [
    ['loading', {}, '價格載入中…'],
    ['missing products', { loaded: true }, '價格暫時無法取得'],
    ['failed', { failed: true }, '價格暫時無法取得'],
    ['web preview', { bridge: null }, '以商店顯示價格為準']
  ]) test(`Free status handles ${label} without invented prices (${signedIn})`, () => {
    const { get } = setup({ signedIn, ...options });
    assert.ok(get('proPlanStatusBox').innerHTML.includes(expected));
    assert.equal(get('proMonthlyPrice').textContent, expected);
    assert.equal(get('proYearlyPrice').textContent, expected);
    assert.doesNotMatch(get('proPlanStatusBox').innerHTML, /NT\$99|NT\$790/);
  });
}
test('Product loading failure renders unavailable, then successful retry restores localized price', async () => {
  const bridge = { getProducts: async () => { throw new Error('offline'); } };
  const { ctx, get } = setup({ bridge });
  await ctx.loadNativeStoreProducts();
  assert.equal(get('proMonthlyPrice').textContent, '價格暫時無法取得');
  bridge.getProducts = async () => ({ products: [{ id: 'meowwork.pro.monthly', displayPrice: '¥400' }] });
  await ctx.loadNativeStoreProducts();
  assert.equal(get('proMonthlyPrice').textContent, '¥400');
  assert.equal(get('proYearlyPrice').textContent, '價格暫時無法取得');
});
test('Store metadata is escaped before insertion into status HTML', () => {
  const { get } = setup({ products: { 'meowwork.pro.monthly': { displayPrice: '<price>&' } } });
  assert.match(get('proPlanStatusBox').innerHTML, /&lt;price&gt;&amp;/);
});
test('Native bundle preserves account-deletion help and resolves local legal-page links', () => {
  execFileSync(process.execPath, ['native/scripts/sync-web.mjs'], { cwd: root });
  const out = path.join(root, 'native/www');
  assert.equal(fs.readFileSync(path.join(out, 'delete-account.html'), 'utf8'), fs.readFileSync(path.join(root, 'delete-account.html'), 'utf8'));
  for (const page of ['privacy.html', 'delete-account.html', 'terms.html', 'support.html']) {
    const text = fs.readFileSync(path.join(out, page), 'utf8');
    for (const [, target] of text.matchAll(/href="(\.\/[^"#?]*)/g)) {
      assert.ok(fs.existsSync(path.resolve(out, target === './' ? 'index.html' : target)), `${page} has missing local target ${target}`);
    }
  }
});
