import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';

if (platform() !== 'darwin') {
  console.error('[build-ios] iOS builds require macOS with Xcode installed.');
  console.error('[build-ios] On Windows/Linux, use GitHub Actions job build-ios or a Mac.');
  process.exit(1);
}

const root = process.cwd();
const iosProjectDir = join(root, 'ios/App');
const xcodeProject = join(iosProjectDir, 'App.xcodeproj');

if (!existsSync(xcodeProject)) {
  console.error('[build-ios] Missing ios/App/App.xcodeproj. Run: npx cap add ios');
  process.exit(1);
}

const derivedDataPath = join(iosProjectDir, 'build/DerivedData');
const mode = process.argv[2] || 'simulator';

if (mode === 'archive') {
  console.log('[build-ios] Archiving for device (requires Apple signing in Xcode)...');
  execSync(
    [
      'xcodebuild archive',
      '-project App.xcodeproj',
      '-scheme App',
      '-configuration Release',
      `-archivePath ${join(iosProjectDir, 'build/App.xcarchive')}`,
      '-allowProvisioningUpdates',
    ].join(' '),
    { cwd: iosProjectDir, stdio: 'inherit' }
  );
  console.log(`[build-ios] Archive: ${join(iosProjectDir, 'build/App.xcarchive')}`);
  console.log('[build-ios] Export IPA in Xcode: Window → Organizer → Distribute App');
  process.exit(0);
}

console.log('[build-ios] Building Release for iOS Simulator...');
execSync(
  [
    'xcodebuild build',
    '-project App.xcodeproj',
    '-scheme App',
    '-configuration Release',
    `-derivedDataPath ${derivedDataPath}`,
    "-destination 'generic/platform=iOS Simulator'",
    'CODE_SIGNING_ALLOWED=NO',
  ].join(' '),
  { cwd: iosProjectDir, stdio: 'inherit', shell: '/bin/bash' }
);

const appPath = join(derivedDataPath, 'Build/Products/Release-iphonesimulator/App.app');
console.log(`[build-ios] Done. Simulator app: ${appPath}`);
console.log('[build-ios] For installable IPA on real devices: npm run build:ios:archive (on Mac + Apple Developer account)');
