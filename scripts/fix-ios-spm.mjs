import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Capacitor may add Cordova plugins to ios/App/CapApp-SPM/Package.swift even when
 * they have no native iOS SPM package (e.g. cordova-plugin-android-permissions).
 * Remove those references so xcodebuild can resolve dependencies.
 */
const IOS_SPM_PLUGINS_TO_REMOVE = [
  'CordovaPluginAndroidPermissions',
];

const root = process.cwd();
const packageSwiftPath = join(root, 'ios/App/CapApp-SPM/Package.swift');

if (!existsSync(packageSwiftPath)) {
  console.warn('[fix-ios-spm] Package.swift not found, skipping.');
  process.exit(0);
}

let content = readFileSync(packageSwiftPath, 'utf8');
const original = content;

for (const pluginName of IOS_SPM_PLUGINS_TO_REMOVE) {
  const dependencyLine = new RegExp(
    `\\s*\\.package\\(name: "${pluginName}", path: "[^"]+"\\),?\\n`,
    'g'
  );
  const productLine = new RegExp(
    `\\s*\\.product\\(name: "${pluginName}", package: "${pluginName}"\\),?\\n`,
    'g'
  );

  content = content.replace(dependencyLine, '\n');
  content = content.replace(productLine, '\n');
}

if (content === original) {
  console.log('[fix-ios-spm] No Android-only Cordova plugin references found.');
} else {
  writeFileSync(packageSwiftPath, content, 'utf8');
  console.log('[fix-ios-spm] Removed Android-only plugin references from Package.swift');
}

// Verify remaining local Cordova SPM paths exist (created by cap sync, gitignored).
const cordovaPluginsRoot = join(root, 'ios/capacitor-cordova-ios-plugins/sources');
const packageRefPattern = /\.package\(name: "([^"]+)", path: "\.\.\/\.\.\/capacitor-cordova-ios-plugins\/sources\/([^"]+)"\)/g;

let match;
while ((match = packageRefPattern.exec(content)) !== null) {
  const folderName = match[2];
  const folderPath = join(cordovaPluginsRoot, folderName);
  if (!existsSync(folderPath)) {
    console.error(
      `[fix-ios-spm] Missing Cordova iOS package folder: ${folderPath}\n` +
        'Run: npx cap sync ios'
    );
    process.exit(1);
  }
}

console.log('[fix-ios-spm] Package.swift is ready for xcodebuild.');
