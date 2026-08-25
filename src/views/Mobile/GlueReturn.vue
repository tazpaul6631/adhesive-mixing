<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" class="header-toolbar">
        <div slot="start" class="header-start">
          <ion-button fill="clear" class="header-back" @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
            <h1 class="header-title">{{ t("mobile.glueReturn.title") }}</h1>
          </ion-button>
        </div>
        <ion-buttons slot="end" class="header-end">
          <NetworkStatusIcon />
        </ion-buttons>
      </ion-toolbar>
      <MobileOfflineNotice />
    </ion-header>

    <ion-content class="mobile-content">
      <div class="menu-container">
        <section class="qr-panel">
          <div class="qr-panel__body">
            <ion-card class="qr-container">
              <ion-card-header>
                <ion-card-title>{{ t("mobile.glueReturn.qrTitle") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <button type="button" class="qr-scan-field" @click="openScanner">
                  <span v-if="!returnQrText" class="qr-scan-field__text qr-scan-field__text--empty">
                    {{ t("mobile.glueReturn.scanPlaceholder") }}
                  </span>
                  <div v-else-if="pendingReturnGlueInfo" class="qr-scan-field__info">
                    <div class="qr-scan-field__info-row">
                      <span class="qr-scan-field__info-label">{{ t("mobile.glueReturn.fields.lineLabel") }}</span>
                      <span class="qr-scan-field__info-value">{{ pendingReturnGlueInfo.productLineName }}</span>
                    </div>
                    <div class="qr-scan-field__info-row">
                      <span class="qr-scan-field__info-label">{{ t("mobile.glueReturn.fields.glueLabel") }}</span>
                      <span class="qr-scan-field__info-value">{{ pendingReturnGlueInfo.glueName }}</span>
                    </div>
                  </div>
                  <span v-else class="qr-scan-field__text">{{ returnQrText }}</span>
                  <span class="confirm-button__icon">
                    <McScanFill />
                  </span>
                </button>
              </ion-card-content>
            </ion-card>

            <ion-card class="qr-container line-qr-container">
              <ion-card-header>
                <ion-card-title>{{ t("mobile.glueReturn.lineQrTitle") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>

                <button type="button" class="line-scan-add-button" :disabled="!pendingReturnGlueInfo"
                  @click="openLineScanner">
                  <span>{{ t("mobile.glueReturn.lineScanAddButton") }}</span>
                  <span class="confirm-button__icon">
                    <McScanFill />
                  </span>
                </button>

                <p v-if="!pendingReturnGlueInfo" class="line-scan-hint">
                  {{ t("mobile.glueReturn.lineScanDisabledHint") }}
                </p>

                <div v-if="lineChemicalItems.length" class="line-chemical-list">
                  <div class="line-chemical-list__title">
                    {{ t("mobile.glueReturn.lineListTitle", { count: lineChemicalItems.length }) }}
                  </div>

                  <div class="line-chemical-list__items"
                    :class="{ 'line-chemical-list__items--scrollable': lineChemicalItems.length >= 2 }">
                    <div v-for="item in lineChemicalItems" :key="item.id" class="line-chemical-card">
                      <div class="line-chemical-card__main">
                        <div class="line-chemical-card__row">
                          <span class="line-chemical-card__label">{{ t("mobile.glueReturn.fields.lineLabel") }}</span>
                          <span class="line-chemical-card__value">{{ item.productLineName || '-' }}</span>
                        </div>

                        <div class="line-chemical-card__row">
                          <span class="line-chemical-card__label">{{ t("mobile.glueReturn.fields.glueLabel") }}</span>
                          <span class="line-chemical-card__value">{{ item.glueName || '-' }}</span>
                        </div>
                      </div>

                      <button type="button" class="line-chemical-card__delete"
                        :aria-label="t('mobile.glueReturn.removeLineItem')"
                        @click.stop="removeLineChemicalItem(item.id)">
                        <ion-icon :icon="trashOutline"></ion-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-button expand="block" class="confirm-button" :disabled="!canSubmitReturn" @click="confirmReturnQr">
              <ion-spinner v-if="isSubmittingReturn" name="crescent" slot="start"
                class="confirm-button__spinner"></ion-spinner>
              <ion-icon v-else slot="start" :icon="shieldCheckmarkOutline"></ion-icon>
              {{ isSubmittingReturn ? t("mobile.glueReturn.submittingButton") : t("mobile.glueReturn.confirmButton") }}
            </ion-button>
          </div>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
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
  IonSpinner,
  IonToolbar,
} from '@ionic/vue';
import { shieldCheckmarkOutline, trashOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { useI18n } from 'vue-i18n';
import glueReturnApi from '@/api/glueReturn';
import { useAuthStore } from '@/store/auth';
import MobileOfflineNotice from '@/views/Mobile/components/MobileOfflineNotice.vue';
import NetworkStatusIcon from '@/views/Mobile/components/NetworkStatusIcon.vue';
import { buildSystemQrUrl } from "@/views/Mobile/config/systemQrUrl";
import { findGlueOfflineQrData } from '@/services/glueOfflineData.service';
import { addOfflineQueueItem } from '@/services/offlineQueue.service';
import { useOfflineStore } from '@/store/offline';
import { useAppToast } from '@/composables/useAppToast';
import { McScanFill } from '@kalimahapps/vue-icons/mc';
import { resolveCatchErrorMessage } from '@/utils/catchErrorMessage';

interface LineChemicalItem {
  id: string;
  rawQrText: string;
  productLineName: string;
  glueName: string;
  lineChemicalName: string;
  chemicalMasterId: string;
  isMatched: boolean;
  rawData: any;
}

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const { showToast } = useAppToast();

const goBack = () => {
  router.push('/app-menu');
};

const returnQrText = ref('');
const pendingReturnGlueInfo = ref<any>(null);
const lineChemicalItems = ref<LineChemicalItem[]>([]);
const isSubmittingReturn = ref(false);
const hasLineChemicalMismatch = computed(() => lineChemicalItems.value.some((item) => !item.isMatched));
const hasLineChemicalData = computed(() => lineChemicalItems.value.length > 0);
const canSubmitReturn = computed(() => {
  return !!pendingReturnGlueInfo.value
    && hasLineChemicalData.value
    && !hasLineChemicalMismatch.value
    && !isSubmittingReturn.value;
});


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

function getBarcodeValue(barcode: { rawValue?: string; displayValue?: string }) {
  return barcode.rawValue || barcode.displayValue || '';
}

function getReturnGlueIdValue(info: any) {
  if (hasPayloadValue(info?.mixGlueMasterId)) {
    return normalizeCompareValue(info.mixGlueMasterId);
  }

  if (hasPayloadValue(info?.separateGlueId)) {
    return normalizeCompareValue(info.separateGlueId);
  }

  if (hasPayloadValue(info?.noSeparateGlueId)) {
    return normalizeCompareValue(info.noSeparateGlueId);
  }

  return 0;
}

function getReturnGlueCompareValue(info: any) {
  if (hasPayloadValue(info?.glueId)) {
    return normalizeCompareValue(info.glueId);
  }

  if (hasPayloadValue(info?.materialCode)) {
    return normalizeCompareValue(info.materialCode);
  }

  return '';
}

function getLineChemicalIdList() {
  return lineChemicalItems.value
    .map((item) => normalizeCompareValue(item.rawData?.lineChemicalId))
    .filter(Boolean);
}

function getSystemQrUrl(qrText: string) {
  return buildSystemQrUrl(qrText);
}

function getGlueQrType(data: any) {
  if (hasPayloadValue(data?.lineChemicalId) && hasPayloadValue(data?.chemicalMasterId)) {
    return 'lineChemical';
  }

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

function isAllocatedGlueQrType(qrType: string | null) {
  return qrType === 'mixGlue' || qrType === 'separateGlue' || qrType === 'noSeparateGlue';
}

async function resolveGlueQrFromSystemUrl(qrText: string) {
  const systemUrl = getSystemQrUrl(qrText);

  if (!systemUrl) {
    return { data: null, status: 'invalid' as const, message: '' };
  }

  const userId = getCurrentUserId();
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (userId) {
    headers.Authorization = `Bearer ${userId}`;
  }

  try {
    const response = await fetch(systemUrl.toString(), { method: 'GET', headers });

    if (!response.ok) {
      return { data: null, status: 'invalid' as const, message: '' };
    }

    const responseData = await response.json();

    if (responseData?.success === false || !responseData?.data) {
      return {
        data: null,
        status: 'noData' as const,
        message: typeof responseData?.message === 'string' ? responseData.message : 'DATA_NOT_FOUND',
      };
    }

    return { data: responseData.data, status: 'success' as const, message: responseData?.message || '' };
  } catch (error) {
    console.error('Không thể gọi URL QR hệ thống:', error);
    return { data: null, status: 'invalid' as const, message: '' };
  }
}

async function resolveGlueQr(qrText: string) {
  if (!authStore.isOnline) {
    return findGlueOfflineQrData(qrText);
  }

  return resolveGlueQrFromSystemUrl(qrText);
}

async function triggerMismatchFeedback() {
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (error) {
    console.warn('Haptics is not available:', error);
  }
}

async function showWarningAlert(message: string) {
  await triggerMismatchFeedback();
  showToast({
    severity: 'warn',
    summary: t('mobile.glueReturn.title'),
    detail: message,
    life: 3000,
  });
}

function resetReturnField() {
  returnQrText.value = '';
  pendingReturnGlueInfo.value = null;
}

function resetLineChemicalList() {
  lineChemicalItems.value = [];
}

function resetReturnWorkflow() {
  resetReturnField();
  resetLineChemicalList();
}

async function openScanner() {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      showToast({
        severity: 'warn',
        summary: t('mobile.glueReturn.title'),
        detail: t('mobile.glueReturn.messages.cameraPermission'),
        life: 3000,
      });
      return;
    }

    const { barcodes } = await BarcodeScanner.scan();

    if (!barcodes?.length) {
      return;
    }

    const scannedValue = getBarcodeValue(barcodes[0]);

    if (!scannedValue) {
      await showWarningAlert(t('mobile.glueReturn.messages.invalidQr'));
      return;
    }

    const result = await resolveGlueQr(scannedValue);

    if (result.status === 'invalid') {
      resetReturnWorkflow();
      await showWarningAlert(t('mobile.glueReturn.messages.invalidQr'));
      return;
    }

    if (result.status === 'noData' || !result.data) {
      resetReturnWorkflow();
      await showWarningAlert(resolveCatchErrorMessage(
        t,
        (result as any).message || 'DATA_NOT_FOUND',
        t('catchError.DATA_NOT_FOUND'),
      ));
      return;
    }

    const qrType = getGlueQrType(result.data);

    if (!isAllocatedGlueQrType(qrType)) {
      resetReturnWorkflow();
      await showWarningAlert(t('mobile.glueReturn.messages.invalidQr'));
      return;
    }

    returnQrText.value = `${result.data.glueName || ''}`;
    pendingReturnGlueInfo.value = result.data;
    resetLineChemicalList();
  } catch (error) {
    console.error('Lỗi khi quét mã QR:', error);
    showToast({
      severity: 'warn',
      summary: t('mobile.glueReturn.title'),
      detail: t('mobile.glueReturn.messages.loadError'),
      life: 3000,
    });
  }
}

function buildLineChemicalItem(data: any, rawQrText: string): LineChemicalItem {
  const lineChemicalId = normalizeCompareValue(data?.lineChemicalId);
  const lineChemicalMasterId = normalizeCompareValue(data?.chemicalMasterId);
  const returnGlueCompareValue = getReturnGlueCompareValue(pendingReturnGlueInfo.value);
  const isMatched = !!lineChemicalMasterId && !!returnGlueCompareValue && lineChemicalMasterId === returnGlueCompareValue;

  return {
    id: lineChemicalId || `${Date.now()}-${lineChemicalItems.value.length}`,
    rawQrText,
    productLineName: normalizeCompareValue(data?.productLineName),
    glueName: normalizeCompareValue(data?.glueName),
    lineChemicalName: normalizeCompareValue(data?.lineChemicalName),
    chemicalMasterId: lineChemicalMasterId,
    isMatched,
    rawData: data,
  };
}

function removeLineChemicalItem(id: string) {
  lineChemicalItems.value = lineChemicalItems.value.filter((item) => item.id !== id);
}

async function openLineScanner() {
  if (!pendingReturnGlueInfo.value) {
    await showWarningAlert(t('mobile.glueReturn.messages.requireReturnGlueFirst'));
    return;
  }

  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      showToast({
        severity: 'warn',
        summary: t('mobile.glueReturn.title'),
        detail: t('mobile.glueReturn.messages.cameraPermission'),
        life: 3000,
      });
      return;
    }

    const { barcodes } = await BarcodeScanner.scan();

    if (!barcodes?.length) {
      return;
    }

    const scannedValue = getBarcodeValue(barcodes[0]);

    if (!scannedValue) {
      await showWarningAlert(t('mobile.glueReturn.messages.invalidLineQr'));
      return;
    }

    const result = await resolveGlueQr(scannedValue);

    if (result.status === 'invalid') {
      await showWarningAlert(t('mobile.glueReturn.messages.invalidLineQr'));
      return;
    }

    if (result.status === 'noData' || !result.data) {
      await showWarningAlert(resolveCatchErrorMessage(
        t,
        (result as any).message || 'DATA_NOT_FOUND',
        t('catchError.DATA_NOT_FOUND'),
      ));
      return;
    }

    const qrType = getGlueQrType(result.data);

    if (qrType !== 'lineChemical') {
      await showWarningAlert(t('mobile.glueReturn.messages.invalidLineQr'));
      return;
    }

    const lineChemicalId = normalizeCompareValue(result.data?.lineChemicalId);
    const isDuplicated = !!lineChemicalId && lineChemicalItems.value.some((item) => item.id === lineChemicalId);

    if (isDuplicated) {
      await showWarningAlert(t('mobile.glueReturn.messages.duplicateLineQr'));
      return;
    }

    const item = buildLineChemicalItem(result.data, scannedValue);

    if (!item.isMatched) {
      await showWarningAlert(t('mobile.glueReturn.messages.lineMismatchWarning'));
      return;
    }

    lineChemicalItems.value = [...lineChemicalItems.value, item];
  } catch (error) {
    console.error('Lỗi khi quét mã QR thùng keo chuyền:', error);
    showToast({
      severity: 'warn',
      summary: t('mobile.glueReturn.title'),
      detail: t('mobile.glueReturn.messages.loadLineError'),
      life: 3000,
    });
  }
}

async function confirmReturnQr() {
  if (!canSubmitReturn.value || !pendingReturnGlueInfo.value || !hasLineChemicalData.value || hasLineChemicalMismatch.value) {
    return;
  }

  const lineChemicalIds = getLineChemicalIdList();
  const userId = getCurrentUserId();
  const payload = {
    factoryId: normalizeCompareValue(pendingReturnGlueInfo.value.factoryId),
    returnGlueId: getReturnGlueIdValue(pendingReturnGlueInfo.value),
    lineChemicalIds,
    recordStatus: '1',
    createrId: userId,
    updaterId: userId,
  };

  isSubmittingReturn.value = true;

  try {
    if (!authStore.isOnline) {
      await addOfflineQueueItem('ReturnGlue', 'api/mobile/gluereturnlog/create', 'POST', payload);
      await offlineStore.refreshQueueCounts();
      notifyToast(t('mobile.offlineQueue.saved'), 'offlineQueue');
      resetReturnWorkflow();
      return;
    }

    const response = await glueReturnApi.glueReturn(payload);
    const responseData = response.data as any;

    if (!responseData?.success || responseData?.data !== true) {
      throw new Error(responseData?.message || t('mobile.glueReturn.messages.returnConfirmError'));
    }

    notifyToast(resolveCatchErrorMessage(
      t,
      responseData?.message || 'GLUE_RETURN_CONFIRM_SUCCESS',
      t('catchError.GLUE_RETURN_CONFIRM_SUCCESS'),
    ));
    resetReturnWorkflow();
  } catch (error) {
    console.error('Không thể tạo log trả keo:', error);
    const rawMessage = (error as any)?.response?.data?.message
      || (error instanceof Error ? error.message : '');
    showToast({
      severity: 'warn',
      summary: t('mobile.glueReturn.title'),
      detail: resolveCatchErrorMessage(
        t,
        rawMessage,
        t('mobile.glueReturn.messages.returnConfirmError'),
      ),
      life: 3000,
    });
  } finally {
    isSubmittingReturn.value = false;
  }
}

function notifyToast(message: string, type: 'success' | 'offlineQueue' = 'success') {
  showToast({
    severity: type === 'offlineQueue' ? 'warn' : 'success',
    summary: type === 'offlineQueue'
      ? t('mobile.offlineQueue.title')
      : t('mobile.glueReturn.title'),
    detail: message,
  });
}
</script>

<style scoped lang="scss">
.header-container {
  ion-toolbar.header-toolbar {
    --background: #0b56d9;
    --color: #ffffff;
    --min-height: 56px;
    --padding-start: 4px;
    --padding-end: 10px;
    --padding-top: 6px;
    --padding-bottom: 6px;
  }
}

.header-start {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  max-width: calc(100vw - 88px);
  padding-inline-end: 8px;
}

.header-back {
  margin: 0;
  --padding-start: 6px;
  --padding-end: 2px;
  --icon-margin-end: 0;
  --icon-margin-start: 0;
  --color: #ffffff;
}

.header-title {
  margin: 0;
  min-width: 0;
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.01em;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
}

.header-end {
  margin: 0;
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

.qr-panel__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
    font-size: 18px !important;
    font-weight: 700;
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
  text-align: left;
  outline: none;

  &:active {
    border-color: #0b72ed;
    background: #f8fbff;
  }

  &:disabled {
    cursor: not-allowed;
    background: #f8fafc;
    opacity: 0.72;
  }

  &__text {
    flex: 1;
    color: #081a36;
    font-size: 16px !important;
    font-weight: 600;
    line-height: 1.35;
    word-break: break-all;
    white-space: pre-line;
  }

  &__text--empty {
    color: #8a9099;
    font-size: 14px !important;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__info-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
    line-height: 1.35;
  }

  &__info-label {
    flex-shrink: 0;
    color: #64748b;
    font-size: 16px !important;
    font-weight: 600;
  }

  &__info-value {
    color: #081a36;
    font-size: 16px !important;
    font-weight: 700;
    word-break: break-word;
  }
}

.line-qr-container {
  ion-card-content {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
}

.line-scan-description {
  margin: -4px 0 0;
  color: #64748b;
  font-size: 13px !important;
  font-weight: 500;
  line-height: 1.45;
}

.line-scan-add-button {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 18px;
  border: 1px dashed #0b72ed;
  border-radius: 16px;
  background: #f4f8ff;
  color: #0b72ed;
  font-size: 15px !important;
  font-weight: 700;
  outline: none;

  &:active {
    background: #eaf2ff;
  }

  &:disabled {
    border-color: #cbd5e1;
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 20px !important;
  }
}

.line-scan-hint {
  margin: -4px 0 0;
  color: #ee4646;
  font-size: 12px !important;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
}

.line-chemical-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 2px;

  &__title {
    color: #475569;
    font-size: 13px !important;
    font-weight: 700;
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 2px;
  }

  &__items--scrollable {
    max-height: 238px;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 4px;
  }
}

.line-chemical-card {
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 16px;
  background: #f8fbff;

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  &__row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
    line-height: 1.35;
  }

  &__label {
    flex-shrink: 0;
    color: #64748b;
    font-size: 16px !important;
    font-weight: 700;
  }

  &__value {
    color: #1e293b;
    font-size: 16px !important;
    font-weight: 700;
    word-break: break-word;
  }

  &__delete {
    flex: 0 0 36px;
    width: 36px;
    min-height: 36px;
    align-self: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: #ffffff;
    color: #ee4646;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);

    ion-icon {
      font-size: 20px !important;
    }

    &:active {
      color: #dc2626;
      background: #fee2e2;
    }
  }
}

.confirm-button {
  overflow: hidden;
  margin: 0;
  border-radius: 16px;
  font-size: 15px !important;
  font-weight: 500;
  min-height: 50px;
  text-transform: none;

  ion-icon {
    margin-right: 10px;
  }

  &::part(native) {
    border-radius: 16px;
  }

  &[disabled] {
    opacity: 0.48;
    pointer-events: none;
  }
}

.confirm-button__icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 22px;
  line-height: 1;
  color: rgba(0, 0, 0, 0.582)
}

.confirm-button__icon :deep(svg) {
  width: 22px;
  height: 22px;
  display: block;
}

.confirm-button__spinner {
  width: 22px;
  height: 22px;
}

@media (min-width: 768px) {
  .menu-container {
    max-width: 660px;
    padding: 32px 24px 48px;
  }

  .qr-container {
    border-radius: 22px;

    ion-card-header {
      padding: 28px 30px 18px;
    }

    ion-card-content {
      padding: 0 30px 30px;
    }
  }

  .qr-scan-field {
    min-height: 78px;
    padding: 18px 24px;
    border-radius: 18px;
  }

  .line-scan-description {
    font-size: 15px !important;
  }

  .line-scan-add-button {
    min-height: 64px;
    border-radius: 18px;
    font-size: 17px !important;
  }

  .line-scan-hint {
    font-size: 14px !important;
  }

  .line-chemical-list {
    gap: 12px;

    &__title {
      font-size: 15px !important;
    }

    &__items {
      gap: 12px;
    }

    &__items--scrollable {
      max-height: 310px;
    }
  }

  .line-chemical-card {
    padding: 16px;
    border-radius: 18px;

    &__label,
    &__value {
      font-size: 15px !important;
    }

    &__delete {
      flex-basis: 42px;
      width: 42px;
      min-height: 42px;
    }
  }

  .confirm-button {
    min-height: 82px;
    border-radius: 18px;
    --border-radius: 18px;
  }
}
</style>
