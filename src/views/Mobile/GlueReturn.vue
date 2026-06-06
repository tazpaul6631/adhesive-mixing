<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 8px !important;">
        <ion-buttons slot="start">
          <ion-back-button default-href="/app-menu"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ t("mobile.glueReturn.title") }}</ion-title>
        <ion-buttons slot="end">
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
                <button
                  type="button"
                  class="qr-scan-field"
                  @click="openScanner"
                >
                  <span
                    v-if="!returnQrText"
                    class="qr-scan-field__text qr-scan-field__text--empty"
                  >
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
                  <ion-icon class="qr-scan-field__icon" :icon="barcodeOutline" color="primary"></ion-icon>
                </button>
              </ion-card-content>
            </ion-card>

            <ion-card class="qr-container">
              <ion-card-header>
                <ion-card-title>{{ t("mobile.glueReturn.lineQrTitle") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="qr-scan-field-wrapper">
                  <button
                    type="button"
                    class="qr-scan-field"
                    :class="{ 'qr-scan-field--with-clear': optionalLineChemicalInfo }"
                    @click="openLineScanner"
                  >
                    <span
                      v-if="!lineQrText"
                      class="qr-scan-field__text qr-scan-field__text--empty"
                    >
                      {{ t("mobile.glueReturn.lineScanPlaceholder") }}
                    </span>
                    <div v-else-if="optionalLineChemicalInfo" class="qr-scan-field__info">
                      <div class="qr-scan-field__info-row">
                        <span class="qr-scan-field__info-label">{{ t("mobile.glueReturn.fields.lineLabel") }}</span>
                        <span class="qr-scan-field__info-value">{{ optionalLineChemicalInfo.productLineName }}</span>
                      </div>
                      <div class="qr-scan-field__info-row">
                        <span class="qr-scan-field__info-label">{{ t("mobile.glueReturn.fields.glueLabel") }}</span>
                        <span class="qr-scan-field__info-value">{{ optionalLineChemicalInfo.glueName }}</span>
                      </div>
                    </div>
                    <span v-else class="qr-scan-field__text">{{ lineQrText }}</span>
                    <ion-icon v-if="!optionalLineChemicalInfo" class="qr-scan-field__icon" :icon="barcodeOutline" color="primary"></ion-icon>
                  </button>
                  <button
                    v-if="optionalLineChemicalInfo"
                    type="button"
                    class="qr-scan-field__clear"
                    @click.stop="resetLineChemicalField"
                  >
                    <ion-icon :icon="closeCircleOutline"></ion-icon>
                  </button>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-button
              expand="block"
              class="confirm-button"
              :disabled="!canSubmitReturn"
              @click="openConfirmDialog"
            >
              <ion-icon slot="start" :icon="shieldCheckmarkOutline"></ion-icon>
              {{ t("mobile.glueReturn.confirmButton") }}
            </ion-button>
          </div>
        </section>
      </div>

      <ion-modal
        :is-open="isConfirmDialogOpen"
        class="return-confirm-modal"
        :backdrop-dismiss="false"
        @didDismiss="closeConfirmDialog"
      >
        <div class="return-confirm-dialog">
          <div class="return-confirm-dialog__icon">
            <ion-icon :icon="alertCircle"></ion-icon>
          </div>
          <h2 class="return-confirm-dialog__title">{{ t("mobile.glueReturn.confirmDialogTitle") }}</h2>
          <div class="return-confirm-dialog__message">
            <span>{{ t("mobile.glueReturn.confirmDialogMessage") }}</span>
          </div>
          <div class="return-confirm-dialog__actions">
            <ion-button fill="clear" color="medium" :disabled="isSubmittingReturn" @click="closeConfirmDialog">
              {{ t("mobile.glueReturn.cancelButton") }}
            </ion-button>
            <ion-button fill="clear" color="primary" :disabled="isSubmittingReturn" @click.stop="confirmReturnQr">
              <ion-spinner v-if="isSubmittingReturn" name="crescent" class="return-confirm-dialog__button-spinner"></ion-spinner>
              <span>{{ isSubmittingReturn ? t("mobile.glueReturn.submittingButton") : t("mobile.glueReturn.okButton") }}</span>
            </ion-button>
          </div>
        </div>
      </ion-modal>

      <ion-toast
        :is-open="showSuccessToast"
        :message="toastMessage"
        duration="1800"
        position="bottom"
        :color="toastColor"
        :css-class="toastCssClass"
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
  IonModal,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/vue';
import { alertCircle, barcodeOutline, closeCircleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
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

const { t } = useI18n();
const authStore = useAuthStore();
const offlineStore = useOfflineStore();

const returnQrText = ref('');
const lineQrText = ref('');
const pendingReturnGlueInfo = ref<any>(null);
const optionalLineChemicalInfo = ref<any>(null);
const isConfirmDialogOpen = ref(false);
const isSubmittingReturn = ref(false);
const showSuccessToast = ref(false);
const toastMessage = ref('');
const toastColor = ref<string | undefined>('success');
const toastCssClass = ref('');

const canSubmitReturn = computed(() => !!pendingReturnGlueInfo.value);

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
    return { data: null, status: 'invalid' as const };
  }

  const userId = getCurrentUserId();
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (userId) {
    headers.Authorization = `Bearer ${userId}`;
  }

  try {
    const response = await fetch(systemUrl.toString(), { method: 'GET', headers });

    if (!response.ok) {
      return { data: null, status: 'invalid' as const };
    }

    const responseData = await response.json();

    if (responseData?.success === false || !responseData?.data) {
      return { data: null, status: 'noData' as const };
    }

    return { data: responseData.data, status: 'success' as const };
  } catch (error) {
    console.error('Không thể gọi URL QR hệ thống:', error);
    return { data: null, status: 'invalid' as const };
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
  alert(message);
}

function resetReturnField() {
  returnQrText.value = '';
  pendingReturnGlueInfo.value = null;
}

function closeConfirmDialog() {
  isConfirmDialogOpen.value = false;
  resetReturnField();
}

async function openScanner() {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      alert(t('mobile.glueReturn.messages.cameraPermission'));
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
      resetReturnField();
      await showWarningAlert(t('mobile.glueReturn.messages.invalidQr'));
      return;
    }

    if (result.status === 'noData' || !result.data) {
      resetReturnField();
      await showWarningAlert(t('mobile.glueReturn.messages.noGlueData'));
      return;
    }

    const qrType = getGlueQrType(result.data);

    if (!isAllocatedGlueQrType(qrType)) {
      resetReturnField();
      await showWarningAlert(t('mobile.glueReturn.messages.invalidQr'));
      return;
    }

    returnQrText.value = `${result.data.glueName || ''}`;
    pendingReturnGlueInfo.value = result.data;
  } catch (error) {
    console.error('Lỗi khi quét mã QR:', error);
    alert(t('mobile.glueReturn.messages.loadError'));
  }
}


function resetLineChemicalField() {
  lineQrText.value = '';
  optionalLineChemicalInfo.value = null;
}

async function openLineScanner() {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      alert(t('mobile.glueReturn.messages.cameraPermission'));
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

    lineQrText.value = t('mobile.glueReturn.messages.loadingInfo');

    const result = await resolveGlueQr(scannedValue);

    if (result.status === 'invalid') {
      resetLineChemicalField();
      await showWarningAlert(t('mobile.glueReturn.messages.invalidLineQr'));
      return;
    }

    if (result.status === 'noData' || !result.data) {
      resetLineChemicalField();
      await showWarningAlert(t('mobile.glueReturn.messages.noLineData'));
      return;
    }

    const qrType = getGlueQrType(result.data);

    if (qrType !== 'lineChemical') {
      resetLineChemicalField();
      await showWarningAlert(t('mobile.glueReturn.messages.invalidLineQr'));
      return;
    }

    optionalLineChemicalInfo.value = result.data;
    lineQrText.value = `${result.data.glueName || ''}`;
  } catch (error) {
    console.error('Lỗi khi quét mã QR thùng keo chuyền:', error);
    resetLineChemicalField();
    alert(t('mobile.glueReturn.messages.loadLineError'));
  }
}

function openConfirmDialog() {
  if (!canSubmitReturn.value) {
    return;
  }

  isConfirmDialogOpen.value = true;
}

async function confirmReturnQr() {
  if (!pendingReturnGlueInfo.value) {
    return;
  }

  const lineChemicalId = hasPayloadValue(optionalLineChemicalInfo.value?.lineChemicalId)
    ? normalizeCompareValue(optionalLineChemicalInfo.value.lineChemicalId)
    : '0';

  const userId = getCurrentUserId();
  const payload = {
    factoryId: normalizeCompareValue(pendingReturnGlueInfo.value.factoryId),
    returnGlueId: getReturnGlueIdValue(pendingReturnGlueInfo.value),
    lineChemicalId,
    recordStatus: '1',
    createrId: userId,
    updaterId: userId,
  };

  isSubmittingReturn.value = true;

  try {
    if (!authStore.isOnline) {
      await addOfflineQueueItem('ReturnGlue', 'api/mobile/gluereturnlog/create', 'POST', payload);
      await offlineStore.refreshQueueCounts();
      showToast(t('mobile.offlineQueue.saved'), 'offlineQueue');
      return;
    }

    const response = await glueReturnApi.glueReturn(payload);
    const responseData = response.data as any;

    if (!responseData?.success || responseData?.data !== true) {
      throw new Error(responseData?.message || t('mobile.glueReturn.messages.returnConfirmError'));
    }

    showToast(t('mobile.glueReturn.messages.returnSuccess'));
  } catch (error) {
    console.error('Không thể tạo log trả keo:', error);
    alert(error instanceof Error ? error.message : t('mobile.glueReturn.messages.returnConfirmError'));
  } finally {
    isSubmittingReturn.value = false;
    closeConfirmDialog();
  }
}

function showToast(message: string, type: 'success' | 'offlineQueue' = 'success') {
  toastMessage.value = message;
  toastColor.value = type === 'offlineQueue' ? undefined : 'success';
  toastCssClass.value = type === 'offlineQueue' ? 'offline-queue-toast' : '';
  showSuccessToast.value = true;
}
</script>


<style scoped lang="scss">
.header-container {
  ion-toolbar {
    --background: #0b56d9;
    --color: #ffffff;
  }

  ion-title {
    color: #ffffff;
    font-size: 18px !important;
    font-weight: 700;
  }
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

.qr-scan-field-wrapper {
  position: relative;
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

  &--with-clear {
    padding-right: 48px;
  }

  &__icon {
    flex-shrink: 0;
    font-size: 18px !important;
  }

  &__clear {
    position: absolute;
    top: 50%;
    right: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #94a3b8;
    transform: translateY(-50%);

    ion-icon {
      font-size: 22px !important;
    }

    &:active {
      color: #475569;
      background: #f1f5f9;
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

.status-box {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 16px;
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

  &--danger {
    border: 1px solid #fecaca;
    color: #dc1f2e;
    background: #fff7f7;
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
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 22px;
  }

  &__button-spinner {
    width: 16px;
    height: 16px;
    margin-right: 6px;
  }
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

  .qr-scan-field-wrapper {
  position: relative;
}

.qr-scan-field {
    min-height: 78px;
    padding: 18px 24px;
    border-radius: 18px;
  }

  .confirm-button {
    min-height: 82px;
    border-radius: 18px;
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
      font-size: 1.7rem !important;
    }

    &__message {
      font-size: 1.18rem !important;
    }

    &__actions {
      margin-top: 28px;
    }
  }
}
</style>