<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/app-menu"></ion-back-button>
        </ion-buttons>
        <ion-title>Chuyền xác nhận keo & trả keo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="mobile-content">
      <div class="menu-container">
        <section class="qr-panel">
          <div class="qr-panel__body">
            <ion-card class="qr-container">
              <ion-card-header>
                <ion-card-title>Mã QR thùng keo chuyền</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <button
                  type="button"
                  class="qr-scan-field"
                  :class="{ 'qr-scan-field--disabled': isFirstTwoQrMatched }"
                  :disabled="isFirstTwoQrMatched"
                  @click="openScanner('line')"
                >
                  <span :class="['qr-scan-field__text', { 'qr-scan-field__text--empty': !lineQrText }]">
                    {{ lineQrText || 'Quét mã QR thùng keo chuyền' }}
                  </span>
                  <ion-icon class="qr-scan-field__icon" :icon="qrCodeOutline" color="primary"></ion-icon>
                </button>
              </ion-card-content>
            </ion-card>

            <ion-card class="qr-container">
              <ion-card-header>
                <ion-card-title>Mã QR thùng keo phát</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <button
                  type="button"
                  class="qr-scan-field"
                  :class="{ 'qr-scan-field--disabled': isFirstTwoQrMatched }"
                  :disabled="isFirstTwoQrMatched"
                  @click="openScanner('issue')"
                >
                  <span :class="['qr-scan-field__text', { 'qr-scan-field__text--empty': !issueQrText }]">
                    {{ issueQrText || 'Quét mã QR thùng keo phát' }}
                  </span>
                  <ion-icon class="qr-scan-field__icon" :icon="qrCodeOutline" color="primary"></ion-icon>
                </button>
              </ion-card-content>
            </ion-card>

            <ion-button
              expand="block"
              class="confirm-button"
              :disabled="isConfirmButtonDisabled"
              @click="handleConfirmReturn"
            >
              <ion-icon slot="start" :icon="shieldCheckmarkOutline"></ion-icon>
              Xác nhận trả về
            </ion-button>

            <ion-card v-if="showReturnQrSection" class="qr-container">
              <ion-card-header>
                <ion-card-title>Mã QR thùng keo trả về</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <button type="button" class="qr-scan-field" @click="openScanner('return')">
                  <span :class="['qr-scan-field__text', { 'qr-scan-field__text--empty': !returnQrText }]">
                    {{ returnQrText || 'Quét mã QR thùng keo trả về' }}
                  </span>
                  <ion-icon class="qr-scan-field__icon" :icon="qrCodeOutline" color="primary"></ion-icon>
                </button>
              </ion-card-content>
            </ion-card>
          </div>

          <div v-if="statusMessage" class="status-box" :class="statusClass">
            <ion-icon class="status-box__icon" :icon="statusIcon"></ion-icon>
            <div class="status-box__content">
              <strong>Trạng thái:</strong>
              <span>{{ statusMessage }}</span>
            </div>
          </div>
        </section>
      </div>

      <ion-toast
        :is-open="showSuccessToast"
        message="Xác nhận thành công"
        duration="1800"
        color="success"
        @didDismiss="showSuccessToast = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/vue';
import { alertCircle, checkmarkCircle, qrCodeOutline, qrCodeSharp, scanOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

type ScanTarget = 'line' | 'issue' | 'return';

const lineQrText = ref('');
const issueQrText = ref('');
const returnQrText = ref('');

const showReturnQrSection = ref(false);
const showSuccessToast = ref(false);

const isFirstTwoQrReady = computed(() => {
  return !!lineQrText.value && !!issueQrText.value;
});

const isFirstTwoQrMatched = computed(() => {
  return isFirstTwoQrReady.value && normalizeQrText(lineQrText.value) === normalizeQrText(issueQrText.value);
});

const isConfirmButtonDisabled = computed(() => {
  return !isFirstTwoQrMatched.value || showReturnQrSection.value;
});

const statusMessage = computed(() => {
  if (isFirstTwoQrReady.value && !isFirstTwoQrMatched.value) {
    return 'Mã QR thùng keo trên chuyền không khớp với keo trên thùng keo phát';
  }

  if (isFirstTwoQrMatched.value && !showReturnQrSection.value) {
    return 'Mã QR hợp lệ.';
  }
});

const statusClass = computed(() => {
  if (isFirstTwoQrReady.value && !isFirstTwoQrMatched.value) {
    return 'status-box--danger';
  }

  if (isFirstTwoQrMatched.value || returnQrText.value) {
    return 'status-box--success';
  }

  return 'status-box--default';
});

const statusIcon = computed(() => {
  return statusClass.value === 'status-box--danger' ? alertCircle : checkmarkCircle;
});

function normalizeQrText(value: string) {
  return value.trim();
}

async function openScanner(target: ScanTarget) {
  if ((target === 'line' || target === 'issue') && isFirstTwoQrMatched.value) {
    return;
  }

  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      alert('Cần cấp quyền camera để quét mã QR!');
      return;
    }

    const { barcodes } = await BarcodeScanner.scan();

    if (barcodes && barcodes.length > 0) {
      const scannedValue = barcodes[0].rawValue;

      if (scannedValue) {
        handleScanResult(target, scannedValue);
      } else {
        alert('Mã QR không hợp lệ hoặc không có dữ liệu!');
      }
    }
  } catch (error) {
    console.error('Lỗi khi quét mã QR:', error);
    alert('Vui lòng quét mã QR phù hợp.');
  }
}

function handleScanResult(target: ScanTarget, value: string) {
  const normalizedValue = normalizeQrText(value);

  if (!normalizedValue) {
    return;
  }

  if (target === 'line') {
    lineQrText.value = normalizedValue;
    resetReturnStep();
    return;
  }

  if (target === 'issue') {
    issueQrText.value = normalizedValue;
    resetReturnStep();
    return;
  }

  returnQrText.value = normalizedValue;
  showSuccessToast.value = true;
  resetForm();
}

function handleConfirmReturn() {
  if (isConfirmButtonDisabled.value) {
    return;
  }

  showReturnQrSection.value = true;
}

function resetReturnStep() {
  returnQrText.value = '';
  showReturnQrSection.value = false;
  showSuccessToast.value = false;
}

function resetForm() {
  lineQrText.value = '';
  issueQrText.value = '';
  returnQrText.value = '';
  showReturnQrSection.value = false;
}
</script>

<style scoped lang="scss">
.header-back-button {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  --color: #ffffff;
  --icon-font-size: 2rem;
  --padding-start: 0;
  --padding-end: 0;
  --min-width: 54px;
  --min-height: 54px;
}

.mobile-content {
  --background: #f6f9fd;
}

.menu-container {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 24px 16px 34px;
}

.qr-panel {
  &__body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.qr-container {
  margin: 0;
  padding: 0;
  border: 1px solid rgba(226, 232, 240, 0.72);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);

  ion-card-header {
    padding: 24px 24px 16px;
  }

  ion-card-title {
    color: #081a36;
    font-weight: 700;
    font-size: 1rem;
  }

  ion-card-content {
    padding: 0 24px 24px;
  }
}

.qr-scan-field {
  width: 100%;
  min-height: 55px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid #d5dbe6a8;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: none;
  text-align: left;
  outline: none;

  &:active {
    border-color: #0b72ed;
    background: #f8fbff;
  }

  &:disabled,
  &--disabled {
    cursor: not-allowed;
    background: #f8fafc;
    opacity: 0.72;
  }

  &__text {
    flex: 1;
    color: #081a36;
    font-weight: 600;
    line-height: 1.35;
    font-size: 0.875rem;
    word-break: break-all;
  }

  &__text--empty {
    color: #8a9099;
    font-size: 0.875rem;
  }

  &__icon {
    flex-shrink: 0;
    font-size: 1.5rem;
  }
}

.confirm-button {
  margin: 8px 0 10px;
  overflow: hidden;
  border-radius: 16px;
  font-weight: 500;
  text-transform: none;
  font-size: 1rem;
  min-height: 50px;

  ion-icon {
    margin-right: 10px;
  }

  &::part(native) {
    border-radius: 16px;
  }

  &[disabled] {
    opacity: 0.48;
  }
}

.status-box {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-top: 18px;
  padding: 18px 20px;
  border-radius: 16px;
  font-size: 0.875rem;

  &__icon {
    flex-shrink: 0;
    margin-top: 1px;
    font-size: 1.25rem;
  }

  &__content {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  strong {
    font-weight: 700;
  }

  &--default {
    border: 1px solid #d8e1ee;
    color: #475569;
    background: #ffffff;
  }

  &--success {
    border: 1px solid #bbf7d0;
    color: #137333;
    background: #f0fdf4;
  }

  &--danger {
    border: 1px solid #fecaca;
    color: #dc1f2e;
    background: #fff7f7;
  }
}

@media (min-width: 768px) {
  .menu-container {
    max-width: 660px;
    padding: 32px 24px 48px;
  }

  .qr-panel__body {
    gap: 20px;
  }

  .qr-container {
    border-radius: 22px;

    ion-card-header {
      padding: 28px 30px 18px;
    }

    ion-card-title {
      font-size: 1.72rem;
    }

    ion-card-content {
      padding: 0 30px 30px;
    }
  }

  .qr-scan-field {
    min-height: 78px;
    padding: 18px 24px;
    border-radius: 18px;

    &__text {
      font-size: 1.28rem;
    }

    &__icon {
      font-size: 2.25rem;
    }
  }

  .confirm-button {
    min-height: 82px;
    margin: 10px 0 12px;
    border-radius: 18px;
    font-size: 1.5rem;
    --border-radius: 18px;
  }

  .status-box {
    margin-top: 22px;
    padding: 22px 24px;
    border-radius: 18px;
    font-size: 1.32rem;

    &__icon {
      font-size: 2.8rem;
    }
  }
}
</style>
