Ứng dụng **Ionic + Capacitor + Vue 3** — quản lý trộn/chiết keo, in tem Bluetooth.

## Yêu cầu

| Mục | Android | iOS |
|-----|---------|-----|
| Node.js | 18+ | 18+ |
| Build tool | JDK 17, Android SDK | **macOS + Xcode** |
| Cài lên máy thật | APK đã ký | Apple Developer + IPA/TestFlight |

## Cài đặt

```bash
npm install --legacy-peer-deps
```

## Build web

```bash
npm run build
# hoặc
npm run build:web
```

## Build Android (APK)

```bash
# Unsigned APK
npm run build:android

# Ký APK (Linux/macOS — cần zipalign + apksigner trong PATH)
npm run build:android:signed
```

APK unsigned: `android/app/build/outputs/apk/release/app-release-unsigned.apk`  
APK signed: `android/app/build/outputs/apk/release/adhesive-mixing-release.apk`

Windows: sau `npm run build:android`, ký APK bằng Android Studio hoặc `apksigner` từ Android SDK.

```bash
npx cap open android   # mở Android Studio
```

## Build iOS

**Chỉ chạy trên macOS** (có Xcode):

```bash
# Build cho Simulator (CI / kiểm tra compile)
npm run build:ios

# Archive cho thiết bị thật (cần Apple Developer signing)
npm run build:ios:archive
```

Sau archive, mở Xcode Organizer để export **IPA** (Ad Hoc / TestFlight / App Store):

```bash
npx cap open ios
```

Trên Windows/Linux: dùng GitHub Actions job `build-ios` (artifact Simulator `.app`).

## GitHub Actions

Push lên `main` chạy 2 job song song:

| Job | Output |
|-----|--------|
| `build-android` | `adhesive-mixing-release.apk` |
| `build-ios` | `App.app` (Simulator) |

### Secrets tùy chọn

**Android** (production keystore cố định):

- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

**iOS** (archive + IPA trên CI — tùy chọn):

- `APPLE_CERTIFICATE_P12` — file `.p12` encode base64
- `APPLE_CERTIFICATE_PASSWORD` — mật khẩu certificate

Nếu chưa cấu hình iOS secrets, CI vẫn build Simulator app để verify compile.

**Lưu ý iOS:** `cordova-plugin-android-permissions` chỉ có native Android; sau `cap sync ios` script `scripts/fix-ios-spm.mjs` tự gỡ reference khỏi `Package.swift` để tránh lỗi xcodebuild.

## Capacitor sync

```bash
npm run cap:sync:android
npm run cap:sync:ios
```

App ID: `adhesive.mixing` (xem `capacitor.config.ts`).


Ứng dụng được phát triển trên nền tảng **Ionic + Capacitor + Vue 3**, tích hợp với Backend C# để cung cấp giải pháp an ninh toàn diện.

## 🚀 Tính năng chính
* **High Performance:** Tối ưu hóa hiệu năng với Gradle Caching.
* **Cross-platform:** Chạy mượt mà trên Android (đã test trên Samsung S24 Ultra).

## 🛠️ Công nghệ sử dụng
* **Frontend:** Vue 3, Ionic Framework, Capacitor.
* **Backend:** C# (.NET Core).
* **Build Tool:** Gradle 8.x.
* **Automation:** GitHub Actions (Tự động build APK).

## 📖 Hướng dẫn cài đặt & Chạy Project

### 1. Yêu cầu hệ thống
* Node.js (phiên bản 18 trở lên).
* Android Studio + SDK 34+.
* Java JDK 17.

### 2. Cài đặt môi trường
```bash
# Cài đặt các thư viện Node.js
npm install

# Thay đổi capacitor
npm run build
npx cap copy
npx cap sync

# Thêm 
implementation fileTree(dir: 'src/main/libs', include: ['*.jar', '*.aar'])
implementation fileTree(dir: 'libs', include: ['*.jar', '*.aar'])