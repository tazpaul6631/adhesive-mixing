<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" class="header-toolbar">
        <div slot="start" class="header-start">
          <ion-back-button default-href="/app-menu" text="" class="header-back"></ion-back-button>
          <h1 class="header-title">{{ t('mobile.glueReturnInRoom.title') }}</h1>
        </div>
        <ion-buttons slot="end" class="header-end">
          <NetworkStatusIcon />
        </ion-buttons>
      </ion-toolbar>
      <MobileOfflineNotice />
    </ion-header>

    <ion-content class="mobile-content">
      <div class="menu-container">
        <section class="form-panel">
          <div class="form-field">
            <label class="form-field__label">{{ t('mobile.glueReturnInRoom.productLineLabel') }}</label>
            <Select v-model="selectedProductLineId" class="w-full" :options="productLineOptions"
              option-label="productLineName" option-value="productLineId"
              :placeholder="t('mobile.glueReturnInRoom.productLinePlaceholder')" :loading="isLoadingProductLines"
              :disabled="isSubmittingReturn" show-clear append-to="body" @before-show="loadProductLines" />
          </div>

          <div class="form-field">
            <label class="form-field__label">{{ t('mobile.glueReturnInRoom.qrTitle') }}</label>
            <button type="button" class="qr-scan-field" :disabled="isSubmittingReturn" @click="openScanner">
              <span v-if="!pendingReturnGlueInfo" class="qr-scan-field__text qr-scan-field__text--empty">
                {{ t('mobile.glueReturnInRoom.scanPlaceholder') }}
              </span>
              <div v-else class="qr-scan-field__info">
                <div class="qr-scan-field__info-row">
                  <span class="qr-scan-field__info-label">{{ t('mobile.glueReturnInRoom.fields.glueLabel') }}</span>
                  <span class="qr-scan-field__info-value">{{ pendingReturnGlueInfo.glueName || '-' }}</span>
                </div>
              </div>
              <span class="qr-scan-field__icon">
                <McScanFill />
              </span>
            </button>
          </div>

          <Button :label="t('mobile.glueReturnInRoom.confirmButton')" icon="pi pi-check"
            class="w-full confirm-submit-btn" :loading="isSubmittingReturn" :disabled="!canSubmitReturn"
            @click="confirmReturnQr" />
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
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
} from '@ionic/vue';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { useI18n } from 'vue-i18n';
import productLineApi from '@/api/productLine';
import glueReturnLogApi from '@/api/glueReturnLog';
import { useAuthStore } from '@/store/auth';
import MobileOfflineNotice from '@/views/Mobile/components/MobileOfflineNotice.vue';
import NetworkStatusIcon from '@/views/Mobile/components/NetworkStatusIcon.vue';
import { buildSystemQrUrl } from '@/views/Mobile/config/systemQrUrl';
import { findGlueOfflineQrData } from '@/services/glueOfflineData.service';
import { addOfflineQueueItem } from '@/services/offlineQueue.service';
import { useOfflineStore } from '@/store/offline';
import { useAppToast } from '@/composables/useAppToast';
import { McScanFill } from '@kalimahapps/vue-icons/mc';
import { resolveCatchErrorMessage } from '@/utils/catchErrorMessage';

type ProductLineOption = {
  productLineId: number;
  productLineName: string;
};

const { t } = useI18n();
const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const { showToast } = useAppToast();

const selectedProductLineId = ref<number | null>(null);
const productLineOptions = ref<ProductLineOption[]>([]);
const isLoadingProductLines = ref(false);

const pendingReturnGlueInfo = ref<any>(null);
const isSubmittingReturn = ref(false);

const canSubmitReturn = computed(() => {
  return selectedProductLineId.value != null
    && !!pendingReturnGlueInfo.value
    && !isSubmittingReturn.value;
});

function normalizeCompareValue(value: any) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function getNestedValue(source: any, path: string[]) {
  return path.reduce((current, key) => current?.[key], source);
}

function hasPayloadValue(value: any) {
  return value !== null && value !== undefined && normalizeCompareValue(value) !== '';
}

function getCurrentUserId() {
  return authStore.user?.employeeId || authStore.token || localStorage.getItem('web_token_backup') || '';
}

function resolveUserFactoryId() {
  const userData = authStore.user;
  const candidates = [
    userData?.factoryId,
    userData?.factoryID,
    userData?.factoryCode,
    userData?.factory,
    getNestedValue(userData, ['factory', 'factoryId']),
    getNestedValue(userData, ['employee', 'factoryId']),
    getNestedValue(userData, ['user', 'factoryId']),
  ];

  return candidates.map(normalizeCompareValue).find(Boolean) || '';
}

function resolveUserDepartmentId() {
  const userData = authStore.user;
  const candidates = [
    userData?.departmentId,
    userData?.departmentID,
    userData?.departmentCode,
    userData?.department,
    getNestedValue(userData, ['department', 'departmentId']),
    getNestedValue(userData, ['employee', 'departmentId']),
    getNestedValue(userData, ['user', 'departmentId']),
  ];

  return candidates.map(normalizeCompareValue).find(Boolean) || '';
}

function getFactoryId() {
  return normalizeCompareValue(pendingReturnGlueInfo.value?.factoryId) || resolveUserFactoryId();
}

function getDepartmentId(): string | null {
  const raw = resolveUserDepartmentId();
  return raw || null;
}

function getBarcodeValue(barcode: { rawValue?: string; displayValue?: string }) {
  return barcode.rawValue || barcode.displayValue || '';
}

function getReturnGlueIdValue(info: any) {
  if (hasPayloadValue(info?.mixGlueMasterId)) {
    return Number(info.mixGlueMasterId);
  }

  if (hasPayloadValue(info?.separateGlueId)) {
    return Number(info.separateGlueId);
  }

  if (hasPayloadValue(info?.noSeparateGlueId)) {
    return Number(info.noSeparateGlueId);
  }

  return 0;
}

function getGlueQrType(data: any) {
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
  const systemUrl = buildSystemQrUrl(qrText);

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

async function triggerWarningFeedback() {
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (error) {
    console.warn('Haptics is not available:', error);
  }
}

async function showWarningAlert(message: string) {
  await triggerWarningFeedback();
  showToast({
    severity: 'warn',
    summary: t('mobile.glueReturnInRoom.title'),
    detail: message,
    life: 3000,
  });
}

function notifyToast(message: string, type: 'success' | 'offlineQueue' = 'success') {
  showToast({
    severity: type === 'offlineQueue' ? 'warn' : 'success',
    summary: type === 'offlineQueue'
      ? t('mobile.offlineQueue.title')
      : t('mobile.glueReturnInRoom.title'),
    detail: message,
    life: 3000,
  });
}

async function loadProductLines() {
  if (isLoadingProductLines.value) {
    return;
  }

  const factoryId = getFactoryId();
  const departmentId = getDepartmentId();

  if (!factoryId) {
    showToast({
      severity: 'warn',
      summary: t('mobile.glueReturnInRoom.title'),
      detail: t('mobile.glueReturnInRoom.messages.factoryMissing'),
      life: 3000,
    });
    return;
  }

  if (departmentId === null) {
    showToast({
      severity: 'warn',
      summary: t('mobile.glueReturnInRoom.title'),
      detail: t('mobile.glueReturnInRoom.messages.departmentMissing'),
      life: 3000,
    });
    return;
  }

  isLoadingProductLines.value = true;
  try {
    const response = await productLineApi.getBaseList({
      factoryId,
      departmentId,
    });
    const responseData = response?.data as any;

    if (responseData?.success === false) {
      throw new Error(responseData?.message || t('mobile.glueReturnInRoom.messages.productLineLoadError'));
    }

    const items = Array.isArray(responseData?.data) ? responseData.data : [];
    productLineOptions.value = items.filter((item: any) =>
      item?.productLineId !== null
      && item?.productLineId !== undefined
      && normalizeCompareValue(item?.productLineName)
    );
  } catch (error) {
    console.error('Không thể tải danh sách chuyền:', error);
    productLineOptions.value = [];
    showToast({
      severity: 'warn',
      summary: t('mobile.glueReturnInRoom.title'),
      detail: error instanceof Error && error.message
        ? error.message
        : t('mobile.glueReturnInRoom.messages.productLineLoadError'),
      life: 3000,
    });
  } finally {
    isLoadingProductLines.value = false;
  }
}

function resetReturnField() {
  pendingReturnGlueInfo.value = null;
}

function resetForm() {
  selectedProductLineId.value = null;
  resetReturnField();
}

async function openScanner() {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      showToast({
        severity: 'warn',
        summary: t('mobile.glueReturnInRoom.title'),
        detail: t('mobile.glueReturnInRoom.messages.cameraPermission'),
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
      await showWarningAlert(t('mobile.glueReturnInRoom.messages.invalidQr'));
      return;
    }

    const result = await resolveGlueQr(scannedValue);

    if (result.status === 'invalid') {
      resetReturnField();
      await showWarningAlert(t('mobile.glueReturnInRoom.messages.invalidQr'));
      return;
    }

    if (result.status === 'noData' || !result.data) {
      resetReturnField();
      await showWarningAlert(resolveCatchErrorMessage(
        t,
        (result as any).message || 'DATA_NOT_FOUND',
        t('catchError.DATA_NOT_FOUND'),
      ));
      return;
    }

    const qrType = getGlueQrType(result.data);

    if (!isAllocatedGlueQrType(qrType)) {
      resetReturnField();
      await showWarningAlert(t('mobile.glueReturnInRoom.messages.invalidQr'));
      return;
    }

    pendingReturnGlueInfo.value = result.data;
  } catch (error) {
    console.error('Lỗi khi quét mã QR:', error);
    showToast({
      severity: 'warn',
      summary: t('mobile.glueReturnInRoom.title'),
      detail: t('mobile.glueReturnInRoom.messages.loadError'),
      life: 3000,
    });
  }
}

async function confirmReturnQr() {
  if (!canSubmitReturn.value || !pendingReturnGlueInfo.value || selectedProductLineId.value == null) {
    return;
  }

  const userId = getCurrentUserId();
  const payload = {
    factoryId: getFactoryId(),
    returnGlueId: getReturnGlueIdValue(pendingReturnGlueInfo.value),
    productLineId: Number(selectedProductLineId.value),
    recordStatus: '1',
    createrId: userId,
    updaterId: userId,
  };

  isSubmittingReturn.value = true;

  try {
    if (!authStore.isOnline) {
      await addOfflineQueueItem('ReturnGlue', 'api/mobile/gluereturnlog/createinmgr', 'POST', payload);
      await offlineStore.refreshQueueCounts();
      notifyToast(t('mobile.offlineQueue.saved'), 'offlineQueue');
      resetForm();
      return;
    }

    const response = await glueReturnLogApi.postCreateGlueReturnLogInRoom(payload);
    const responseData = response.data as any;

    if (!responseData?.success || responseData?.data !== true) {
      throw new Error(responseData?.message || t('mobile.glueReturnInRoom.messages.returnConfirmError'));
    }

    notifyToast(resolveCatchErrorMessage(
      t,
      responseData?.message || 'RETURNED_GLUE_CONFIRM_SUCCESS',
      t('catchError.RETURNED_GLUE_CONFIRM_SUCCESS'),
    ));
    resetForm();
  } catch (error) {
    console.error('Không thể tạo log trả keo trong phòng:', error);
    const rawMessage = (error as any)?.response?.data?.message
      || (error instanceof Error ? error.message : '');
    showToast({
      severity: 'warn',
      summary: t('mobile.glueReturnInRoom.title'),
      detail: resolveCatchErrorMessage(
        t,
        rawMessage,
        t('mobile.glueReturnInRoom.messages.returnConfirmError'),
      ),
      life: 3000,
    });
  } finally {
    isSubmittingReturn.value = false;
  }
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

.form-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.72);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__label {
    color: #475569;
    font-size: 14px !important;
    font-weight: 700;
  }
}

.qr-scan-field {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #d5dbe6a8;
  border-radius: 12px;
  background: #ffffff;
  text-align: left;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  &__text {
    flex: 1;
    color: #081a36;
    font-size: 14px !important;
    font-weight: 600;

    &--empty {
      color: #94a3b8;
      font-weight: 500;
    }
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
    gap: 8px;
    min-width: 0;
  }

  &__info-label {
    flex: 0 0 auto;
    color: #64748b;
    font-size: 13px !important;
    font-weight: 700;
  }

  &__info-value {
    flex: 1 1 auto;
    min-width: 0;
    color: #081a36;
    font-size: 14px !important;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  &__icon {
    width: 22px;
    height: 22px;
    flex: 0 0 22px;
    color: #0b72ed;

    :deep(svg) {
      width: 22px;
      height: 22px;
      display: block;
    }
  }
}

.confirm-submit-btn {
  margin-top: 4px;
}

@media (min-width: 768px) {
  .menu-container {
    max-width: 660px;
    padding: 32px 24px 48px;
  }
}
</style>
