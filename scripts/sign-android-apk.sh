#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK_DIR="$ROOT/android/app/build/outputs/apk/release"
UNSIGNED="$APK_DIR/app-release-unsigned.apk"
ALIGNED="$APK_DIR/app-release-aligned.apk"
SIGNED="$APK_DIR/adhesive-mixing-release.apk"
KEYSTORE="$APK_DIR/adhesive-mixing-ci.jks"

STORE_PASS="${ANDROID_KEYSTORE_PASSWORD:-12345678}"
KEY_PASS="${ANDROID_KEY_PASSWORD:-12345678}"
KEY_ALIAS="${ANDROID_KEY_ALIAS:-adhesive_mixing}"

if [[ ! -f "$UNSIGNED" ]]; then
  echo "Missing unsigned APK. Run: npm run build:android"
  exit 1
fi

if [[ ! -f "$KEYSTORE" ]]; then
  keytool -genkey -v -keystore "$KEYSTORE" -keyalg RSA -keysize 2048 -validity 10000 \
    -alias "$KEY_ALIAS" -storepass "$STORE_PASS" -keypass "$KEY_PASS" \
    -dname "CN=JiaHsin, OU=IT, O=JiaHsin, L=HCM, ST=HCM, C=VN"
fi

zipalign -v -p 4 "$UNSIGNED" "$ALIGNED"

apksigner sign \
  --ks "$KEYSTORE" \
  --ks-pass "pass:$STORE_PASS" \
  --ks-key-alias "$KEY_ALIAS" \
  --key-pass "pass:$KEY_PASS" \
  --out "$SIGNED" \
  "$ALIGNED"

apksigner verify --verbose "$SIGNED"
echo "Signed APK: $SIGNED"
