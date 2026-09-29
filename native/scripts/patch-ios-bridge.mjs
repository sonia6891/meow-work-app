import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const bridgeSourcePath = resolve(root, 'ios-sources/ViewController.swift');
const scenePath = resolve(root, 'ios/App/App/SceneDelegate.swift');
const projectPath = resolve(root, 'ios/App/App.xcodeproj/project.pbxproj');
const privacySourcePath = resolve(root, 'ios-sources/PrivacyInfo.xcprivacy');
const privacyTargetPath = resolve(root, 'ios/App/App/PrivacyInfo.xcprivacy');
const entitlementsSourcePath = resolve(root, 'ios-sources/App.entitlements');
const entitlementsTargetPath = resolve(root, 'ios/App/App/App.entitlements');
const infoPlistPath = resolve(root, 'ios/App/App/Info.plist');

const bridgeSource = readFileSync(bridgeSourcePath, 'utf8');
const sceneSource = readFileSync(scenePath, 'utf8');

const importPattern = /^import\s+[^\n]+$/gm;
const imports = [
  ...bridgeSource.match(importPattern) || [],
  ...sceneSource.match(importPattern) || []
];
const uniqueImports = [...new Set(imports)];

const bridgeBody = bridgeSource.replace(importPattern, '').trim();
let sceneBody = sceneSource.replace(importPattern, '').trim();
const defaultRoot = 'window?.rootViewController = CAPBridgeViewController()';
const customRoot = 'window?.rootViewController = ViewController()';
if (sceneBody.includes(defaultRoot)) {
  sceneBody = sceneBody.replace(defaultRoot, customRoot);
  const output = [uniqueImports.join('\n'), '', bridgeBody, '', sceneBody, ''].join('\n');
  writeFileSync(scenePath, output);
} else if (!sceneBody.includes(customRoot) || !sceneBody.includes('class ViewController: CAPBridgeViewController')) {
  throw new Error('Expected either the generated Capacitor SceneDelegate or the already patched MeowWork SceneDelegate.');
}

const privacyManifest = readFileSync(privacySourcePath, 'utf8');
writeFileSync(privacyTargetPath, privacyManifest);

const entitlements = readFileSync(entitlementsSourcePath, 'utf8');
writeFileSync(entitlementsTargetPath, entitlements);

let infoPlist = readFileSync(infoPlistPath, 'utf8');
if (!infoPlist.includes('<string>com.lumilab.meowwork</string>')) {
  const callbackScheme = `\t<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>com.lumilab.meowwork.auth</string>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>com.lumilab.meowwork</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>\n`;
  infoPlist = infoPlist.replace(/<\/dict>\s*<\/plist>\s*$/, `${callbackScheme}</dict>\n</plist>\n`);
}
if (!infoPlist.includes('<string>com.lumilab.meowwork</string>')) throw new Error('Could not register the native OAuth callback URL scheme.');
writeFileSync(infoPlistPath, infoPlist);

let project = readFileSync(projectPath, 'utf8');
let deviceFamilyMatches = project.match(/TARGETED_DEVICE_FAMILY = "1,2";/g) || [];
const alreadyPhoneOnly = (project.match(/TARGETED_DEVICE_FAMILY = 1;/g) || []).length >= 2;
if (deviceFamilyMatches.length < 2 && !alreadyPhoneOnly) {
  throw new Error('Unable to locate iPhone+iPad target settings before narrowing v1 to iPhone.');
}
if (!alreadyPhoneOnly) project = project.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, 'TARGETED_DEVICE_FAMILY = 1;');

const privacyBuildId = 'A15100000000000000000001';
const privacyFileId = 'A15100000000000000000002';

if (!project.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;')) {
  const signStylePattern = /\t\t\t\tCODE_SIGN_STYLE = Automatic;/g;
  const matches = project.match(signStylePattern) || [];
  if (matches.length < 2) {
    throw new Error('Unable to locate target signing build settings for App.entitlements.');
  }
  project = project.replace(
    signStylePattern,
    '\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;'
  );
}

if (!project.includes('PrivacyInfo.xcprivacy in Resources')) {
  project = project.replace(
    '/* End PBXBuildFile section */',
    `\t\t${privacyBuildId} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${privacyFileId} /* PrivacyInfo.xcprivacy */; };\n/* End PBXBuildFile section */`
  );
  project = project.replace(
    '/* End PBXFileReference section */',
    `\t\t${privacyFileId} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n/* End PBXFileReference section */`
  );

  const infoLine = project.match(/^\s+[0-9A-F]+ \/\* Info\.plist \*\/,\s*$/m);
  if (!infoLine) throw new Error('Unable to locate App group Info.plist anchor in Xcode project.');
  project = project.replace(
    infoLine[0],
    `\t\t\t\t${privacyFileId} /* PrivacyInfo.xcprivacy */,\n${infoLine[0]}`
  );

  const resourcesStart = project.indexOf('/* Begin PBXResourcesBuildPhase section */');
  const resourcesEnd = project.indexOf('/* End PBXResourcesBuildPhase section */');
  if (resourcesStart < 0 || resourcesEnd < 0) throw new Error('Unable to locate Resources build phase.');
  let resourcesBlock = project.slice(resourcesStart, resourcesEnd);
  resourcesBlock = resourcesBlock.replace(
    'files = (\n',
    `files = (\n\t\t\t\t${privacyBuildId} /* PrivacyInfo.xcprivacy in Resources */,\n`
  );
  project = project.slice(0, resourcesStart) + resourcesBlock + project.slice(resourcesEnd);
}
writeFileSync(projectPath, project);

console.log('Patched generated SceneDelegate, OAuth URL scheme, native bridges, app PrivacyInfo.xcprivacy, and Sign in with Apple entitlements.');
