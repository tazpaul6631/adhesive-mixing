<template>
  <AppPage>
    <AppHeader no-border class="mobile-glue-header">
      <template #start>
        <div class="header-start">
          <button type="button" class="header-back" @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
            <h1 class="header-title">{{ t('mobile.glueReturnInRoom.title') }}</h1>
          </button>
        </div>
      </template>
      <template #end>
        <div class="header-end">
          <NetworkStatusIcon />
        </div>
      </template>
      <template #after>
        <MobileOfflineNotice />
      </template>
    </AppHeader>

    <AppContent class="mobile-content" :scroll="true" :padding="false">
      <div class="menu-container">
        <section class="form-panel">
          <div class="form-field">
            <label class="form-field__label">{{ t('mobile.glueReturnInRoom.productLineLabel') }}</label>
            <Select v-model="selectedProductLineId" class="w-full" :options="productLineOptions"
              option-label="productLineName" option-value="productLineId" filter resetFilterOnHide
              :filter-placeholder="t('mobile.glueReturnInRoom.productLineFilterPlaceholder')"
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
                <div v-if="scannedProductLineName" class="qr-scan-field__info-row">
                  <span class="qr-scan-field__info-label">{{ t('mobile.glueReturnInRoom.fields.lineLabel') }}</span>
                  <span class="qr-scan-field__info-value">{{ scannedProductLineName }}</span>
                </div>
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

          <div v-if="hasProductLineMismatch" class="status-box status-box--warn">
            <i class="pi pi-exclamation-circle status-box__icon" aria-hidden="true"></i>
            <div class="status-box__content">
              <p>{{ t('mobile.glueReturnInRoom.messages.lineMismatchWarning') }}</p>
            </div>
          </div>

          <Button :label="t('mobile.glueReturnInRoom.confirmButton')" icon="pi pi-check"
            class="w-full confirm-submit-btn" :loading="isSubmittingReturn" :disabled="!canSubmitReturn"
            @click="confirmReturnQr" />
        </section>
      </div>
    </AppContent>
  </AppPage>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
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
import { AppPage, AppHeader, AppContent } from '@/components/layout';

type ProductLineOption = {
  productLineId: string;
  productLineName: string;
};

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const { showToast } = useAppToast();

const goBack = () => {
  router.push('/app-menu');
};

const selectedProductLineId = ref<string | null>(null);
const productLineOptions = ref<ProductLineOption[]>([]);
const isLoadingProductLines = ref(false);

const pendingReturnGlueInfo = ref<any>(null);
const isSubmittingReturn = ref(false);

const scannedProductLineName = computed(() => {
  return normalizeCompareValue(pendingReturnGlueInfo.value?.productLineName);
});

const scannedProductLineIds = computed(() => {
  return getScannedProductLineIds(pendingReturnGlueInfo.value);
});

const hasValidReturnGlueId = computed(() => {
  return isValidReturnGlueId(getReturnGlueIdValue(pendingReturnGlueInfo.value));
});

const hasProductLineMismatch = computed(() => {
  if (selectedProductLineId.value == null || !pendingReturnGlueInfo.value) {
    return false;
  }

  const scannedIds = scannedProductLineIds.value;
  if (!scannedIds.length) {
    return false;
  }

  return !scannedIds.includes(normalizeCompareValue(selectedProductLineId.value));
});

const canSubmitReturn = computed(() => {
  return selectedProductLineId.value != null
    && !!pendingReturnGlueInfo.value
    && hasValidReturnGlueId.value
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

function normalizeProductLineIdList(value: any): string[] {
  const values = Array.isArray(value) ? value : (hasPayloadValue(value) ? [value] : []);
  return [...new Set(values.map(normalizeCompareValue).filter(Boolean))];
}

function getScannedProductLineIds(info: any): string[] {
  const fromIds = normalizeProductLineIdList(info?.productLineIds);
  if (fromIds.length) {
    return fromIds;
  }

  return normalizeProductLineIdList(info?.productLineId);
}

function isValidReturnGlueId(value: string) {
  return hasPayloadValue(value) && value !== '0';
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
  if (hasPayloadValue(info?.glueId)) {
    return normalizeCompareValue(info.glueId);
  }

  return '';
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

watch(hasProductLineMismatch, async (isMismatch) => {
  if (isMismatch) {
    await showWarningAlert(t('mobile.glueReturnInRoom.messages.lineMismatchWarning'));
  }
});

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
    productLineOptions.value = items
      .map((item: any) => ({
        productLineId: normalizeCompareValue(item?.productLineId),
        productLineName: normalizeCompareValue(item?.productLineName),
      }))
      .filter((item: ProductLineOption) => item.productLineId && item.productLineId !== '0' && item.productLineName);
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

    if (!isValidReturnGlueId(getReturnGlueIdValue(result.data))) {
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

  const returnGlueId = getReturnGlueIdValue(pendingReturnGlueInfo.value);
  if (!isValidReturnGlueId(returnGlueId)) {
    await showWarningAlert(t('mobile.glueReturnInRoom.messages.invalidQr'));
    return;
  }

  const userId = getCurrentUserId();
  const payload = {
    factoryId: getFactoryId(),
    returnGlueId,
    productLineId: normalizeCompareValue(selectedProductLineId.value),
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
.mobile-glue-header :deep(.app-header__toolbar) {
  min-height: 56px;
  padding-inline: 4px 10px;
}

.header-start {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  max-width: calc(100vw - 88px);
}

.header-back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 6px 2px 6px 6px;
  border: none;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  min-width: 0;
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
  display: flex;
  align-items: center;
}

.mobile-content {
  background: #f6f9fd;
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

.status-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 14px !important;

  &__icon {
    flex-shrink: 0;
    font-size: 18px !important;
  }

  &__content {
    flex: 1;
  }

  &__content p {
    margin: 0;
    line-height: 1.45;
  }

  &--warn {
    border: 1px solid #fde68a;
    color: #92400e;
    background: #fffbeb;
  }
}

@media (min-width: 768px) {
  .menu-container {
    max-width: 660px;
    padding: 32px 24px 48px;
  }
}
</style>
