<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/app-menu"></ion-back-button>
        </ion-buttons>
        <ion-title>Tra cứu thông tin thùng keo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="mobile-content">
      <div class="menu-container">
        <section class="qr-panel">
          <div class="qr-panel__body">
            <ion-card class="qr-container">
              <ion-card-header>
                <ion-card-title>Mã QR thùng keo</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <button type="button" class="qr-scan-field" @click="openScanner">
                  <span :class="['qr-scan-field__text', { 'qr-scan-field__text--empty': !returnQrText }]">
                    {{ returnQrText || 'Quét mã QR thùng keo' }}
                  </span>
                  <ion-icon class="qr-scan-field__icon" :icon="barcodeOutline" color="primary"></ion-icon>
                </button>
              </ion-card-content>
            </ion-card>

            <ion-card v-if="returnQrText" class="info-container">
              <ion-card-header>
                <ion-card-title>Thông tin thùng keo</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="info-content">
                  <template v-if="returnInfoFields.length">
                    <div
                      v-for="field in returnInfoFields"
                      :key="field.label"
                      class="info-content__row"
                    >
                      <span class="info-content__label">{{ field.label }}</span>
                      <span class="info-content__value">{{ field.value }}</span>
                    </div>
                  </template>

                  <div v-else class="info-content__row">
                    <span class="info-content__label">Dữ liệu mock</span>
                    <span class="info-content__value">Không tìm thấy thông tin mock cho mã QR này</span>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </div>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  IonBackButton,
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
  IonToolbar,
} from '@ionic/vue';
import { barcodeOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { findMockGlueInfo, getGlueInfoFields, normalizeGlueQrText } from './glueQr.mock';
import type { GlueQrInfo } from './glueQr.mock';

const returnQrText = ref('');
const returnQrInfo = ref<GlueQrInfo | null>(null);

const returnInfoFields = computed(() => {
  return returnQrInfo.value ? getGlueInfoFields(returnQrInfo.value) : [];
});

function normalizeQrText(value: string) {
  return normalizeGlueQrText(value);
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
  returnQrInfo.value = findMockGlueInfo(normalizedValue);
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

.qr-container,
.info-container {
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

.info-container {
  ion-card-title {
    text-align: center;
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

.info-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 2px;

  &__row {
    display: grid;
    grid-template-columns: minmax(96px, 42%) 1fr;
    gap: 8px;
    align-items: start;
  }

  &__label {
    color: #64748b;
    font-size: 14px !important;
    font-weight: 600;
    line-height: 1.35;
  }

  &__value {
    color: #081a36;
    font-size: 16px !important;
    font-weight: 600;
    line-height: 1.45;
    word-break: break-word;
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

  .qr-container,
  .info-container {
    border-radius: 22px;

    ion-card-header {
      padding: 28px 30px 18px;
    }

    ion-card-title {
      font-size: 16px !important;
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
      font-size: 16px !important;
    }

    &__icon {
      font-size: 18px !important;
    }
  }

  .info-content {
    gap: 12px;
    padding: 0 2px;

    &__row {
      grid-template-columns: minmax(120px, 38%) 1fr;
    }

    &__label {
      font-size: 14px !important;
    }

    &__value {
      font-size: 16px !important;
    }
  }
}
</style>
