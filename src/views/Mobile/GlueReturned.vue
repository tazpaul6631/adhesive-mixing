<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/app-menu"></ion-back-button>
        </ion-buttons>
        <ion-title>Xác nhận thùng keo trả về</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="mobile-content">
      <div class="menu-container">
        <section class="qr-panel">
          <div class="qr-panel__body">
            <ion-card class="qr-container">
              <ion-card-header>
                <ion-card-title>Mã QR thùng keo trả về</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <button type="button" class="qr-scan-field" @click="openScanner">
                  <span :class="['qr-scan-field__text', { 'qr-scan-field__text--empty': !returnQrText }]">
                    {{ returnQrText || 'Quét mã QR thùng keo trả về' }}
                  </span>
                  <ion-icon class="qr-scan-field__icon" :icon="barcodeOutline" color="primary"></ion-icon>
                </button>

                <div v-if="returnQrText" class="return-info-box">
                  <span class="return-info-box__label">Thông tin mã QR</span>
                  <p>{{ returnQrText }}</p>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-button v-if="returnQrText" expand="block" class="confirm-button" :disabled="isSubmittingReturn"
              @click="openReturnConfirmDialog">
              <ion-icon slot="start" :icon="shieldCheckmarkOutline"></ion-icon>
              Xác nhận trả về
            </ion-button>
          </div>
        </section>
      </div>

      <ion-modal :is-open="isReturnConfirmDialogOpen" class="return-confirm-modal" :backdrop-dismiss="false"
        @didDismiss="handleReturnDialogDismiss">
        <div class="return-confirm-dialog">
          <div class="return-confirm-dialog__icon">
            <ion-icon :icon="alertCircle"></ion-icon>
          </div>

          <h2 class="return-confirm-dialog__title">Xác nhận trả về</h2>

          <p class="return-confirm-dialog__message">
            Xác nhận trả về thùng keo
            <strong>{{ pendingReturnQrText }}</strong>
            ?
          </p>

          <div class="return-confirm-dialog__actions">
            <ion-button fill="clear" color="medium" :disabled="isSubmittingReturn" @click="cancelReturnConfirm">
              HỦY
            </ion-button>
            <ion-button fill="clear" color="primary" :disabled="isSubmittingReturn" @click="confirmReturnQr">
              OK
            </ion-button>
          </div>
        </div>
      </ion-modal>

      <ion-toast
        :is-open="showSuccessToast"
        :message="toastMessage"
        duration="1800"
        position="top"
        color="success"
        @didDismiss="showSuccessToast = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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
  IonModal,
  IonPage,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/vue';
import { alertCircle, barcodeOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

const returnQrText = ref('');
const pendingReturnQrText = ref('');
const showSuccessToast = ref(false);
const toastMessage = ref('');
const isReturnConfirmDialogOpen = ref(false);
const isSubmittingReturn = ref(false);

function normalizeQrText(value: string) {
  return value.trim();
}

async function openScanner() {
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
        handleReturnScanResult(scannedValue);
      } else {
        alert('Mã QR không hợp lệ hoặc không có dữ liệu!');
      }
    }
  } catch (error) {
    console.error('Lỗi khi quét mã QR:', error);
  }
}

function handleReturnScanResult(value: string) {
  const normalizedValue = normalizeQrText(value);

  if (!normalizedValue) {
    return;
  }

  returnQrText.value = normalizedValue;
  closeCurrentToast();
}

function openReturnConfirmDialog() {
  if (!returnQrText.value) {
    return;
  }

  pendingReturnQrText.value = returnQrText.value;
  isReturnConfirmDialogOpen.value = true;
}

function handleReturnDialogDismiss() {
  if (!isReturnConfirmDialogOpen.value) {
    return;
  }

  cancelReturnConfirm();
}

function cancelReturnConfirm() {
  isReturnConfirmDialogOpen.value = false;
  isSubmittingReturn.value = false;
  resetReturnField();
}

async function confirmReturnQr() {
  if (!pendingReturnQrText.value || isSubmittingReturn.value) {
    return;
  }

  isSubmittingReturn.value = true;

  try {
    await submitReturnQrMock(pendingReturnQrText.value);
    isReturnConfirmDialogOpen.value = false;
    showToast('Xác nhận thành công');
    resetReturnField();
  } catch (error) {
    console.error('Không thể xác nhận trả về thùng keo:', error);
    alert('Không thể xác nhận trả về thùng keo. Vui lòng thử lại!');
  } finally {
    isSubmittingReturn.value = false;
  }
}

async function submitReturnQrMock(qrText: string) {
  console.info('Mock submit returned QR:', qrText);
  await new Promise((resolve) => setTimeout(resolve, 300));
}

function resetReturnField() {
  returnQrText.value = '';
  pendingReturnQrText.value = '';
}

function showToast(message: string) {
  toastMessage.value = message;
  showSuccessToast.value = true;
}

function closeCurrentToast() {
  showSuccessToast.value = false;
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
    font-size: 18px !important;
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

  &__text {
    flex: 1;
    color: #081a36;
    font-weight: 600;
    line-height: 1.35;
    font-size: 16px !important;
    word-break: break-all;
  }

  &__text--empty {
    color: #8a9099;
    font-size: 14px !important;
  }

  &__icon {
    flex-shrink: 0;
    font-size: 18px !important;
  }
}

.return-info-box {
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px solid #d8e1ee;
  border-radius: 14px;
  background: #f8fbff;

  &__label {
    display: block;
    margin-bottom: 6px;
    color: #64748b;
    font-size: 13px !important;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: #081a36;
    font-size: 14px !important;
    font-weight: 600;
    line-height: 1.45;
    word-break: break-all;
  }
}

.confirm-button {
  overflow: hidden;
  margin: 0;
  border-radius: 16px;
  font-weight: 500;
  text-transform: none;
  font-size: 14px !important;
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

.return-confirm-modal {
  --width: min(90vw, 360px);
  --height: auto;
  --border-radius: 20px;
  --box-shadow: 0 18px 48px rgba(15, 23, 42, 0.2);
}

.return-confirm-dialog {
  padding: 26px 22px 12px;
  border-radius: 20px;
  background: #ffffff;
  text-align: center;

  &__icon {
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    border-radius: 50%;
    background: #eaf2ff;
    color: #0b72ed;

    ion-icon {
      font-size: 1.8rem;
    }
  }

  &__title {
    margin: 0 0 10px;
    color: #081a36;
    font-size: 16px !important;
    font-weight: 700;
  }

  &__message {
    margin: 0;
    color: #475569;
    font-size: 14px !important;
    line-height: 1.5;
    word-break: break-word;

    strong {
      color: #081a36;
      font-weight: 700;
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 22px;
  }
}

@media (min-width: 768px) {
  .menu-container {
    max-width: 660px;
    padding: 32px 24px 48px;
  }

  .qr-panel__body {
    gap: 16px;
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

  .return-info-box {
    margin-top: 18px;
    padding: 18px 20px;
    border-radius: 16px;

    &__label {
      font-size: 1rem;
    }

    p {
      font-size: 1.18rem;
    }
  }

  .confirm-button {
    min-height: 82px;
    border-radius: 18px;
    font-size: 1.5rem;
    --border-radius: 18px;
  }

  .return-confirm-modal {
    --width: min(82vw, 460px);
    --border-radius: 24px;
  }

  .return-confirm-dialog {
    padding: 34px 30px 16px;
    border-radius: 24px;

    &__icon {
      width: 64px;
      height: 64px;
      margin-bottom: 18px;

      ion-icon {
        font-size: 2.4rem;
      }
    }

    &__title {
      font-size: 1.7rem;
    }

    &__message {
      font-size: 1.18rem;
    }

    &__actions {
      margin-top: 28px;

      ion-button {
        font-size: 1.05rem;
      }
    }
  }
}
</style>
