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
implementation 'com.github.mik3y:usb-serial-for-android:3.7.3'

# serial
port.write(buffer, 1000);
int result = buffer.length;

#install (nếu cần)
npm install @capacitor/browser@latest
npx cap sync android

# terminal
./gradlew clean