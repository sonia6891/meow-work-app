'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'native/package.json'), 'utf8'));
const androidManifest = fs.readFileSync(path.join(root, 'native/android/app/src/main/AndroidManifest.xml'), 'utf8');
const androidActivity = fs.readFileSync(path.join(root, 'native/android/app/src/main/java/com/lumilab/meowwork/MainActivity.java'), 'utf8');
const iosInfo = fs.readFileSync(path.join(root, 'native/ios/App/App/Info.plist'), 'utf8');

assert.match(html, /function nativeOAuthRedirect\(\)\{return 'com\.lumilab\.meowwork:\/\/auth\/callback'\}/);
assert.match(html, /skipBrowserRedirect:native/);
assert.match(html, /exchangeCodeForSession\(code\)/);
assert.match(html, /addListener\('appUrlOpen'/);
assert.equal(packageJson.dependencies['@capacitor/app'], '8.1.1');
assert.equal(packageJson.dependencies['@capacitor/browser'], '8.0.4');
assert.match(androidManifest, /android:scheme="com\.lumilab\.meowwork" android:host="auth" android:pathPrefix="\/callback"/);
assert.match(androidActivity, /registerPlugin\(MeowStoreBillingPlugin\.class\)/);
assert.match(iosInfo, /<key>CFBundleURLSchemes<\/key>[\s\S]*?<string>com\.lumilab\.meowwork<\/string>/);

console.log('PASS native OAuth redirect, callback handling, Capacitor modules, and iOS/Android URL registration');
