import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const android = join(root, 'android');
const appGradle = join(android, 'app', 'build.gradle');
const variablesGradle = join(android, 'variables.gradle');
const pluginSource = join(root, 'android-sources', 'MeowStoreBillingPlugin.java');
const manifestPath = join(android, 'app', 'src', 'main', 'AndroidManifest.xml');
const resources = join(android, 'app', 'src', 'main', 'res');
const launchThemePath = join(resources, 'values', 'styles.xml');
const brandIcon = join(root, '..', 'app-icon-v178-512.png');
const brandSplash = join(root, '..', 'splash-v183.jpg');

if (!existsSync(appGradle) || !existsSync(variablesGradle) || !existsSync(pluginSource) || !existsSync(manifestPath) || !existsSync(launchThemePath) || !existsSync(brandIcon) || !existsSync(brandSplash)) {
  throw new Error('Generate the Capacitor Android project first, and keep android-sources/MeowStoreBillingPlugin.java available.');
}

const javaRoot = join(android, 'app', 'src', 'main', 'java');
function findFile(directory, filename) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(path, filename);
      if (found) return found;
    } else if (entry.name === filename) return path;
  }
  return null;
}

const mainActivity = findFile(javaRoot, 'MainActivity.java') || findFile(javaRoot, 'MainActivity.kt');
if (!mainActivity) throw new Error('Could not locate generated Android MainActivity.');
const packageDirectory = join(mainActivity, '..');
const pluginDestination = join(packageDirectory, 'MeowStoreBillingPlugin.java');
const expectedPackage = 'package com.lumilab.meowwork';
if (!readFileSync(pluginSource, 'utf8').startsWith(expectedPackage)) {
  throw new Error('Android application package and native billing bridge package differ.');
}
writeFileSync(pluginDestination, readFileSync(pluginSource));

let activity = readFileSync(mainActivity, 'utf8');
if (mainActivity.endsWith('.java')) {
  const importLine = 'import com.lumilab.meowwork.MeowStoreBillingPlugin;';
  if (!activity.includes(importLine)) activity = activity.replace(/(package [^;]+;\s*)/, `$1\n${importLine}\n`);
  if (!activity.includes('registerPlugin(MeowStoreBillingPlugin.class)')) {
    activity = activity.replace(/(public class MainActivity extends BridgeActivity\s*\{)/, '$1\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(MeowStoreBillingPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n');
  }
}
if (!activity.includes('registerPlugin(MeowStoreBillingPlugin')) throw new Error('Could not register billing plugin in generated MainActivity.');
writeFileSync(mainActivity, activity);

let gradle = readFileSync(appGradle, 'utf8');
if (!gradle.includes('com.android.billingclient:billing:9.1.0')) {
  gradle = gradle.replace(/dependencies\s*\{/, '$&\n    implementation "com.android.billingclient:billing:9.1.0"');
}
if (!gradle.includes('com.android.billingclient:billing:9.1.0')) throw new Error('Could not add Play Billing dependency.');
gradle = gradle.replace(/targetSdk(?:Version)?\s*(?:=\s*)?(?:rootProject\.ext\.targetSdkVersion|\d+)/, 'targetSdk 36');
gradle = gradle.replace(/versionCode\s+\d+/, "versionCode Integer.parseInt(System.getenv('MEOW_VERSION_CODE') ?: '1')");
gradle = gradle.replace(/versionName\s+"[^"]+"/, "versionName System.getenv('MEOW_VERSION_NAME') ?: '1.0'");
if (!gradle.includes("MEOW_VERSION_CODE") || !gradle.includes("MEOW_VERSION_NAME")) throw new Error('Could not configure release version values.');
if (!gradle.includes('MEOW_UPLOAD_KEYSTORE')) {
  gradle = gradle.replace(/buildTypes\s*\{/, `signingConfigs {
        release {
            def uploadStoreFile = System.getenv('MEOW_UPLOAD_KEYSTORE')
            if (uploadStoreFile) {
                storeFile file(uploadStoreFile)
                storePassword System.getenv('MEOW_UPLOAD_STORE_PASSWORD')
                keyAlias System.getenv('MEOW_UPLOAD_KEY_ALIAS')
                keyPassword System.getenv('MEOW_UPLOAD_KEY_PASSWORD')
            }
        }
    }

    buildTypes {`);
  gradle = gradle.replace(/(buildTypes\s*\{\s*release\s*\{)/, `$1
            if (System.getenv('MEOW_UPLOAD_KEYSTORE')) signingConfig signingConfigs.release`);
}
if (!gradle.includes('MEOW_UPLOAD_KEYSTORE')) throw new Error('Could not configure environment-based Play upload signing.');
writeFileSync(appGradle, gradle);

let variables = readFileSync(variablesGradle, 'utf8');
variables = variables.replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 36');
variables = variables.replace(/compileSdkVersion\s*=\s*\d+/, 'compileSdkVersion = 36');
if (!/targetSdkVersion\s*=\s*36/.test(variables) || !/compileSdkVersion\s*=\s*36/.test(variables)) {
  throw new Error('Generated Capacitor variables.gradle must declare compileSdkVersion and targetSdkVersion.');
}
writeFileSync(variablesGradle, variables);

let manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes('xmlns:tools="http://schemas.android.com/tools"')) {
  manifest = manifest.replace(/<manifest\b([^>]*)>/, '<manifest$1 xmlns:tools="http://schemas.android.com/tools">');
}
const exactAlarmPermission = '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />';
if (!manifest.includes('android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove"')) {
  manifest = manifest.replace('</manifest>', `    ${exactAlarmPermission}\n</manifest>`);
}
const oauthFilter = `<intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.lumilab.meowwork" android:host="auth" android:pathPrefix="/callback" />
            </intent-filter>`;
if (!manifest.includes('android:scheme="com.lumilab.meowwork"')) {
  manifest = manifest.replace(/(<activity\b[\s\S]*?<\/activity>)/, (activity) => activity.replace('</activity>', `${oauthFilter}\n        </activity>`));
}
if (!manifest.includes('android:scheme="com.lumilab.meowwork"')) throw new Error('Could not register the native OAuth callback URL scheme.');
if (!manifest.includes('android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove"')) throw new Error('Could not remove the unused exact-alarm permission.');
manifest = manifest.replace(/android:icon="[^"]*"/, 'android:icon="@mipmap/meow_launcher"');
manifest = manifest.replace(/android:roundIcon="[^"]*"/, 'android:roundIcon="@mipmap/meow_launcher"');
if (!manifest.includes('android:icon="@mipmap/meow_launcher"') || !manifest.includes('android:roundIcon="@mipmap/meow_launcher"')) {
  throw new Error('Could not install the branded Android launcher icon.');
}
writeFileSync(manifestPath, manifest);

function putResource(directory, filename, content) {
  const target = join(resources, directory);
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, filename), content);
}
function copyResource(directory, filename, source) {
  const target = join(resources, directory);
  mkdirSync(target, { recursive: true });
  copyFileSync(source, join(target, filename));
}

// Keep the approved web artwork in the native shell. The default Capacitor
// launcher and splash assets are not suitable for the store build.
copyResource('mipmap-nodpi', 'meow_launcher.png', brandIcon);
copyResource('drawable-nodpi', 'meow_launcher_art.png', brandIcon);
copyResource('drawable-nodpi', 'meow_splash_art.jpg', brandSplash);
putResource('values', 'meow_launcher_colors.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources><color name="meow_launcher_background">#FAEEDA</color></resources>
`);
putResource('drawable', 'meow_launcher_foreground.xml', `<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:drawable="@drawable/meow_launcher_art"
    android:insetLeft="18dp" android:insetTop="18dp"
    android:insetRight="18dp" android:insetBottom="18dp" />
`);
putResource('mipmap-anydpi-v26', 'meow_launcher.xml', `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/meow_launcher_background" />
    <foreground android:drawable="@drawable/meow_launcher_foreground" />
</adaptive-icon>
`);
putResource('drawable', 'meow_splash.xml', `<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:src="@drawable/meow_splash_art" android:gravity="fill" />
`);
let launchTheme = readFileSync(launchThemePath, 'utf8');
launchTheme = launchTheme.replace(/@drawable\/splash\b/, '@drawable/meow_splash');
if (!launchTheme.includes('@drawable/meow_splash')) throw new Error('Could not install the branded Android launch image.');
writeFileSync(launchThemePath, launchTheme);

console.log(`Configured Play Billing 9.1.0, API 36, native bridge, reminders, and approved Android launch artwork in ${android}`);
