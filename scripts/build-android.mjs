import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';

const root = process.cwd();
const androidDir = join(root, 'android');
const isWin = platform() === 'win32';
const gradlew = join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');

if (!existsSync(gradlew)) {
  console.error('[build-android] Missing android/gradlew. Run: npx cap add android');
  process.exit(1);
}

const cmd = isWin ? `"${gradlew}" assembleRelease` : './gradlew assembleRelease';

console.log('[build-android] Building release APK...');
execSync(cmd, { cwd: androidDir, stdio: 'inherit' });

const apkPath = join(
  androidDir,
  'app/build/outputs/apk/release/app-release-unsigned.apk'
);

console.log(`[build-android] Done. Unsigned APK: ${apkPath}`);
console.log('[build-android] Sign the APK before installing on devices (see README).');
