<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 8px !important;">
        <ion-buttons slot="start">
          <ion-back-button default-href="/app-menu"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ t('mobile.glueInfoCheck.title') }}</ion-title>
        <NetworkStatusIcon slot="end" />
      </ion-toolbar>
    </ion-header>

    <ion-content class="mobile-content">
      <div class="menu-container">
        <section class="qr-panel">
          <div class="qr-panel__body">
            <ion-card class="qr-container">
              <ion-card-header>
                <ion-card-title>{{ t('mobile.glueInfoCheck.qrTitle') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <button type="button" class="qr-scan-field" :disabled="isLoadingQr" @click="openScanner">
                  <span :class="['qr-scan-field__text', { 'qr-scan-field__text--empty': !returnQrText }]">
                    {{ returnQrText || t('mobile.glueInfoCheck.scanPlaceholder') }}
                  </span>
                  <ion-spinner v-if="isLoadingQr" name="crescent" class="qr-scan-field__spinner"></ion-spinner>
                  <ion-icon v-else class="qr-scan-field__icon" :icon="barcodeOutline" color="primary"></ion-icon>
                </button>
              </ion-card-content>
            </ion-card>

            <ion-card v-if="returnQrInfo" class="info-container">
              <ion-card-header>
                <ion-card-title>{{ t('mobile.glueInfoCheck.infoTitle') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="info-content">
                  <div
                    v-for="field in returnInfoFields"
                    :key="field.label"
                    class="info-content__row"
                  >
                    <span class="info-content__label">{{ field.label }}</span>
                    <span class="info-content__value">{{ field.value }}</span>
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
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { barcodeOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/store/auth';
import NetworkStatusIcon from '@/views/Mobile/components/NetworkStatusIcon.vue';
import { buildSystemQrUrl } from "@/views/Mobile/config/systemQrUrl";

type GlueQrType = 'mixGlue' | 'separateGlue' | 'noSeparateGlue';
type ResolveGlueQrResult = {
  data: any | null;
  status: 'success' | 'invalid' | 'noData';
};

const { t } = useI18n();
const authStore = useAuthStore();

const returnQrText = ref('');
const returnQrInfo = ref<any | null>(null);
const isLoadingQr = ref(false);

const returnQrType = computed(() => getAllocatedGlueQrType(returnQrInfo.value));

const returnInfoFields = computed(() => {
  if (!returnQrInfo.value) {
    return [];
  }

  return getGlueInfoFields(returnQrInfo.value, returnQrType.value);
});

function normalizeQrText(value: string) {
  return value.trim();
}

function normalizeCompareValue(value: any) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function hasPayloadValue(value: any) {
  return value !== null && value !== undefined && normalizeCompareValue(value) !== '';
}

function getCurrentUserId() {
  return authStore.user?.employeeId || authStore.token || localStorage.getItem('web_token_backup') || '';
}

function getSystemQrUrl(qrText: string) {
  return buildSystemQrUrl(qrText);
}

function getAllocatedGlueQrType(data: any): GlueQrType | null {
  if (hasPayloadValue(data?.mixGlueMasterId) && hasPayloadValue(data?.glueId)) {
    return 'mixGlue';
  }

  if (hasPayloadValue(data?.separateGlueId) && hasPayloadValue(data?.glueId)) {
    return 'separateGlue';
  }

  if (hasPayloadValue(data?.noSeparateGlueId) && hasPayloadValue(data?.materialCode)) {
    return 'noSeparateGlue';
  }

  return null;
}

function getGlueTypeLabel(qrType: GlueQrType | null) {
  if (qrType === 'mixGlue') {
    return t('mobile.glueInfoCheck.types.mixGlue');
  }

  if (qrType === 'separateGlue') {
    return t('mobile.glueInfoCheck.types.separateGlue');
  }

  if (qrType === 'noSeparateGlue') {
    return t('mobile.glueInfoCheck.types.noSeparateGlue');
  }

  return '';
}

function getGlueBucketId(info: any, qrType: GlueQrType | null) {
  if (qrType === 'mixGlue') {
    return normalizeCompareValue(info?.mixGlueMasterId);
  }

  if (qrType === 'separateGlue') {
    return normalizeCompareValue(info?.separateGlueId);
  }

  if (qrType === 'noSeparateGlue') {
    return normalizeCompareValue(info?.noSeparateGlueId);
  }

  return '';
}

function getGlueCodeValue(info: any, qrType: GlueQrType | null) {
  if (qrType === 'noSeparateGlue') {
    return normalizeCompareValue(info?.materialCode);
  }

  return normalizeCompareValue(info?.glueId);
}

function getRequestDetailName(info: any) {
  return normalizeCompareValue(info?.requestDetailName);
}


function isUnconfirmedGlueBucket(info: any) {
  return normalizeCompareValue(info?.seq) === '0';
}

function getGlueInfoFields(info: any, qrType: GlueQrType | null) {
  const fields = [
    { label: t('mobile.glueInfoCheck.fields.sequence'), value: normalizeCompareValue(info?.seq) },
    // { label: t('mobile.glueInfoCheck.fields.type'), value: getGlueTypeLabel(qrType) },
    { label: t('mobile.glueInfoCheck.fields.factory'), value: normalizeCompareValue(info?.factoryName) },
    // { label: t('mobile.glueInfoCheck.fields.bucketId'), value: getGlueBucketId(info, qrType) },
    // { label: t('mobile.glueInfoCheck.fields.requestDetail'), value: getRequestDetailName(info) },
    { label: t('mobile.glueInfoCheck.fields.productLine'), value: normalizeCompareValue(info?.productLineName) },
    { label: t('mobile.glueInfoCheck.fields.glue'), value: normalizeCompareValue(info?.glueName) },
    // { label: qrType === 'noSeparateGlue' ? t('mobile.glueInfoCheck.fields.materialCode') : t('mobile.glueInfoCheck.fields.glueId'), value: getGlueCodeValue(info, qrType) },
  ];

  return fields.filter((field) => hasPayloadValue(field.value));
}

function formatGlueDisplay(info: any) {
  const glueName = normalizeCompareValue(info?.glueName);

  if (glueName) {
    return `${t('mobile.glueInfoCheck.fields.glue')} ${glueName}`;
  }

  return t('mobile.glueInfoCheck.scannedPlaceholder');
}

async function triggerWarningFeedback() {
  try {
    await Haptics.notification({
      type: NotificationType.Warning,
    });
  } catch (error) {
    console.warn('Haptics is not available:', error);
  }
}

async function showWarningAlert(message: string) {
  await triggerWarningFeedback();
  alert(message);
}

async function resolveGlueQrFromSystemUrl(qrText: string): Promise<ResolveGlueQrResult> {
  const systemUrl = getSystemQrUrl(qrText);

  if (!systemUrl) {
    return { data: null, status: 'invalid' };
  }

  const userId = getCurrentUserId();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (userId) {
    headers.Authorization = `Bearer ${userId}`;
  }

  let response: Response;

  try {
    response = await fetch(systemUrl.toString(), {
      method: 'GET',
      headers,
    });
  } catch (error) {
    console.error('Không thể gọi URL QR hệ thống:', error);
    return { data: null, status: 'invalid' };
  }

  if (!response.ok) {
    return { data: null, status: 'invalid' };
  }

  let responseData: any;

  try {
    responseData = await response.json();
  } catch (error) {
    console.error('Response QR không phải JSON:', error);
    return { data: null, status: 'invalid' };
  }

  if (responseData?.success === false || !responseData?.data) {
    return { data: null, status: 'noData' };
  }

  return { data: responseData.data, status: 'success' };
}

function resetGlueInfo() {
  returnQrText.value = '';
  returnQrInfo.value = null;
}

async function openScanner() {
  if (isLoadingQr.value) {
    return;
  }

  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      alert(t('mobile.glueInfoCheck.messages.cameraPermission'));
      return;
    }

    const { barcodes } = await BarcodeScanner.scan();

    if (barcodes && barcodes.length > 0) {
      const scannedValue = barcodes[0].rawValue;

      if (scannedValue) {
        await handleGlueInfoScanResult(scannedValue);
      } else {
        await showWarningAlert(t('mobile.glueInfoCheck.messages.invalidQr'));
      }
    }
  } catch (error) {
    console.error('Lỗi khi quét mã QR:', error);
  }
}

async function handleGlueInfoScanResult(value: string) {
  const normalizedValue = normalizeQrText(value);

  if (!normalizedValue) {
    return;
  }

  returnQrText.value = t('mobile.glueInfoCheck.messages.loadingInfo');
  returnQrInfo.value = null;
  isLoadingQr.value = true;

  try {
    const result = await resolveGlueQrFromSystemUrl(normalizedValue);

    if (result.status === 'invalid') {
      resetGlueInfo();
      await showWarningAlert(t('mobile.glueInfoCheck.messages.invalidQr'));
      return;
    }

    if (result.status === 'noData' || !result.data) {
      resetGlueInfo();
      await showWarningAlert(t('mobile.glueInfoCheck.messages.noGlueData'));
      return;
    }

    const qrType = getAllocatedGlueQrType(result.data);

    if (!qrType) {
      resetGlueInfo();
      await showWarningAlert(t('mobile.glueInfoCheck.messages.invalidQr'));
      return;
    }

    if (isUnconfirmedGlueBucket(result.data)) {
      resetGlueInfo();
      await showWarningAlert(t('mobile.glueInfoCheck.messages.unconfirmedGlue'));
      return;
    }

    returnQrInfo.value = result.data;
    returnQrText.value = formatGlueDisplay(result.data);
  } catch (error) {
    console.error('Không thể lấy thông tin QR thùng keo phát:', error);
    resetGlueInfo();
    alert(t('mobile.glueInfoCheck.messages.loadError'));
  } finally {
    isLoadingQr.value = false;
  }
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

  &:disabled {
    opacity: 0.72;
  }

  &:active:not(:disabled) {
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

  &__icon,
  &__spinner {
    flex-shrink: 0;
    font-size: 18px !important;
    width: 18px;
    height: 18px;
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
    font-size: 16px !important;
    font-weight: 600;
    line-height: 1.35;
  }

  &__value {
    color: #081a36;
    font-size: 18px !important;
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

    &__icon,
    &__spinner {
      font-size: 18px !important;
      width: 18px;
      height: 18px;
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
