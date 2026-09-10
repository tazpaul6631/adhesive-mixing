import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { platform } from 'node:os';

/** Avoid SPM "artifact already exists" / corrupted xcframework download on CI. */
const clearSwiftPmCaches = () => {
  const cacheRoots = [
    join(homedir(), 'Library/Caches/org.swift.swiftpm'),
    join(homedir(), 'Library/org.swift.swiftpm'),
  ];

  for (const cacheRoot of cacheRoots) {
    if (!existsSync(cacheRoot)) continue;
    console.log(`[build-ios] Clearing SwiftPM cache: ${cacheRoot}`);
    rmSync(cacheRoot, { recursive: true, force: true });
  }
};

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

clearSwiftPmCaches();

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
