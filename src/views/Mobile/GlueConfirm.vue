<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 8px !important;">
        <ion-buttons slot="start">
          <ion-back-button default-href="/app-menu"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ t("mobile.glueConfirm.title") }}</ion-title>
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
                <ion-card-title>{{ t("mobile.glueConfirm.lineQrTitle") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <button
                  type="button"
                  class="qr-scan-field"
                  @click="openScanner('line')"
                >
                  <span
                    v-if="!lineQrText"
                    class="qr-scan-field__text qr-scan-field__text--empty"
                  >
                    {{ t("mobile.glueConfirm.scanPlaceholder") }}
                  </span>
                  <div v-else-if="lineChemicalInfo" class="qr-scan-field__info">
                    <div class="qr-scan-field__info-row">
                      <span class="qr-scan-field__info-label">{{ t("mobile.glueConfirm.fields.productLineLabel") }}</span>
                      <span class="qr-scan-field__info-value">{{ lineChemicalInfo.productLineName }}</span>
                    </div>
                    <div class="qr-scan-field__info-row">
                      <span class="qr-scan-field__info-label">{{ t("mobile.glueConfirm.fields.glueLabel") }}</span>
                      <span class="qr-scan-field__info-value">{{ lineChemicalInfo.glueName }}</span>
                    </div>
                  </div>
                  <span v-else class="qr-scan-field__text">
                    {{ lineQrText }}
                  </span>
                  <span class="confirm-button__icon">
                    <McScanFill />
                  </span>
                </button>
              </ion-card-content>
            </ion-card>

            <ion-card class="qr-container">
              <ion-card-header>
                <ion-card-title>{{ t("mobile.glueConfirm.allocatedQrTitle") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <button
                  type="button"
                  class="qr-scan-field"
                  @click="openScanner('allocated')"
                >
                  <span
                    v-if="!allocatedQrText"
                    class="qr-scan-field__text qr-scan-field__text--empty"
                  >
                    {{ t("mobile.glueConfirm.scanPlaceholder") }}
                  </span>
                  <div v-else-if="allocatedDisplayRows.length" class="qr-scan-field__info">
                    <div
                      v-for="row in allocatedDisplayRows"
                      :key="row.label"
                      class="qr-scan-field__info-row"
                    >
                      <span class="qr-scan-field__info-label">{{ row.label }}</span>
                      <span class="qr-scan-field__info-value">{{ row.value }}</span>
                    </div>
                  </div>
                  <span v-else class="qr-scan-field__text">
                    {{ allocatedQrText }}
                  </span>
                  <span class="confirm-button__icon">
                    <McScanFill />
                  </span>
                </button>
              </ion-card-content>
            </ion-card>

            <div v-if="statusMessage" class="status-box" :class="statusClass">
              <ion-icon class="status-box__icon" :icon="statusIcon"></ion-icon>
              <div class="status-box__content">
                <p><strong>{{ t("mobile.glueConfirm.statusLabel") }} </strong>{{ statusMessage }}</p>
              </div>
            </div>

            <div v-if="allocatedExpiredMessage" class="status-box status-box--danger status-box--compact">
              <ion-icon class="status-box__icon" :icon="alertCircle"></ion-icon>
              <div class="status-box__content">
                <p>{{ allocatedExpiredMessage }}</p>
              </div>
            </div>

            <ion-button
              expand="block"
              class="confirm-button"
              :disabled="isConfirmButtonDisabled"
              @click="handleConfirmReturn"
            >
              <ion-icon slot="start" :icon="shieldCheckmarkOutline"></ion-icon>
              {{ t("mobile.glueConfirm.confirmReturnButton") }}
            </ion-button>

          </div>
        </section>
      </div>

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
import { computed, nextTick, ref } from "vue";
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
} from "@ionic/vue";
import { alertCircle, barcodeOutline, checkmarkCircle, shieldCheckmarkOutline } from "ionicons/icons";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { Haptics, NotificationType } from '@capacitor/haptics';
import { useI18n } from "vue-i18n";
import glueReturnApi from "@/api/glueReturn";
import { useAuthStore } from "@/store/auth";
import { useLineChemicalStore } from "@/services/lineChemical.store";
import MobileOfflineNotice from '@/views/Mobile/components/MobileOfflineNotice.vue';
import NetworkStatusIcon from '@/views/Mobile/components/NetworkStatusIcon.vue';
import { buildSystemQrUrl } from "@/views/Mobile/config/systemQrUrl";
import { findGlueOfflineQrData } from '@/services/glueOfflineData.service';
import { addOfflineQueueItem } from '@/services/offlineQueue.service';
import { useOfflineStore } from '@/store/offline';
import { McScanFill } from '@kalimahapps/vue-icons';

type ConfirmScanTarget = "line" | "allocated";
type StatusBoxClass = "status-box--default" | "status-box--success" | "status-box--danger";
type GlueQrType = "lineChemical" | "mixGlue" | "separateGlue" | "noSeparateGlue";
type ResolveGlueQrResult = {
  data: any | null;
  status: "success" | "invalid" | "noData";
};

const authStore = useAuthStore();
const lineChemicalStore = useLineChemicalStore();
const offlineStore = useOfflineStore();
const { t } = useI18n();

const lineQrText = ref("");
const allocatedQrText = ref("");
const lineQrRawText = ref("");
const allocatedQrRawText = ref("");
const lineChemicalInfo = ref<any>(null);
const allocatedGlueInfo = ref<any>(null);
const allocatedDisplayRows = ref<Array<{ label: string; value: string }>>([]);

const showSuccessToast = ref(false);
const toastMessage = ref("");
const toastColor = ref<string | undefined>('success');
const toastCssClass = ref('');
const isConfirmReturnCompleted = ref(false);
const isLoadingLineQr = ref(false);
const isLoadingAllocatedQr = ref(false);
const isConfirmingReturn = ref(false);

const isFirstTwoQrReady = computed(() => {
  return !!lineChemicalInfo.value && !!allocatedGlueInfo.value;
});

const isFirstTwoQrMatched = computed(() => {
  if (!lineChemicalInfo.value || !allocatedGlueInfo.value) {
    return false;
  }

  const lineProductLineId = normalizeCompareValue(lineChemicalInfo.value.productLineId);
  const allocatedProductLineIds = getAllocatedProductLineIds(allocatedGlueInfo.value);
  const isProductLineMatched = !!lineProductLineId && allocatedProductLineIds.includes(lineProductLineId);

  const lineChemicalMasterId = normalizeCompareValue(lineChemicalInfo.value.chemicalMasterId);
  const allocatedCompareValue = getAllocatedGlueCompareValue(allocatedGlueInfo.value);
  const isGlueMatched = !!lineChemicalMasterId && !!allocatedCompareValue && lineChemicalMasterId === allocatedCompareValue;

  return isProductLineMatched && isGlueMatched;
});

const isAllocatedGlueExpired = computed(() => {
  return isEndDateExpired(allocatedGlueInfo.value?.endDate);
});

const allocatedExpiredMessage = computed(() => {
  return isAllocatedGlueExpired.value ? t("mobile.glueConfirm.messages.allocatedExpired") : "";
});

const isConfirmButtonDisabled = computed(() => {
  return isConfirmReturnCompleted.value || !isFirstTwoQrMatched.value || isAllocatedGlueExpired.value || isLoadingLineQr.value || isLoadingAllocatedQr.value || isConfirmingReturn.value;
});

const statusMessage = computed(() => {
  if (!isFirstTwoQrReady.value) {
    return "";
  }

  if (!isFirstTwoQrMatched.value) {
    return t("mobile.glueConfirm.messages.statusMismatch");
  }

  return t("mobile.glueConfirm.messages.statusMatched");
});

const statusClass = computed<StatusBoxClass>(() => {
  if (!isFirstTwoQrReady.value) {
    return "status-box--default";
  }

  if (!isFirstTwoQrMatched.value) {
    return "status-box--danger";
  }

  return "status-box--success";
});

const statusIcon = computed(() => {
  return statusClass.value === "status-box--danger" ? alertCircle : checkmarkCircle;
});

function normalizeQrText(value: string) {
  return value.trim();
}

function normalizeCompareValue(value: any) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function hasPayloadValue(value: any) {
  return value !== null && value !== undefined && normalizeCompareValue(value) !== "";
}

function parseEndDateValue(value: any) {
  const normalizedValue = normalizeCompareValue(value);

  if (!normalizedValue) {
    return null;
  }

  const normalizedDateText = normalizedValue.includes("T")
    ? normalizedValue
    : normalizedValue.replace(" ", "T");

  const parsedDate = new Date(normalizedDateText);

  if (Number.isNaN(parsedDate.getTime())) {
    console.warn("Invalid glue endDate value:", value);
    return null;
  }

  return parsedDate;
}

function isEndDateExpired(value: any) {
  const endDate = parseEndDateValue(value);

  if (!endDate) {
    return false;
  }

  return Date.now() >= endDate.getTime();
}

async function triggerMismatchFeedback() {
  try {
    await Haptics.notification({
      type: NotificationType.Warning,
    });
  } catch (error) {
    console.warn("Haptics is not available:", error);
  }
}

async function showWarningAlert(message: string) {
  await triggerMismatchFeedback();
  alert(message);
}

function notifyMismatchIfNeeded() {
  if (!lineChemicalInfo.value || !allocatedGlueInfo.value) {
    return;
  }

  if (!isFirstTwoQrMatched.value) {
    void triggerMismatchFeedback();
  }
}

function getCurrentUserId() {
  return authStore.user?.employeeId || authStore.token || localStorage.getItem("web_token_backup") || "";
}

function getBarcodeValue(barcode: { rawValue?: string; displayValue?: string }) {
  return barcode.rawValue || barcode.displayValue || "";
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

function normalizeProductLineIdList(value: any) {
  if (Array.isArray(value)) {
    return value
      .map((productLineId: any) => normalizeCompareValue(productLineId))
      .filter(Boolean);
  }

  if (!hasPayloadValue(value)) {
    return [];
  }

  return normalizeCompareValue(value)
    .split(",")
    .map((productLineId: string) => productLineId.trim())
    .filter(Boolean);
}

function getAllocatedProductLineIds(info: any) {
  const productLineIds = normalizeProductLineIdList(info?.productLineIds);

  if (productLineIds.length) {
    return productLineIds;
  }

  return normalizeProductLineIdList(info?.productLineId);
}

function getAllocatedGlueCompareValue(info: any) {
  if (hasPayloadValue(info?.noSeparateGlueId)) {
    return normalizeCompareValue(info?.materialCode);
  }

  return normalizeCompareValue(info?.glueId);
}

function getSystemQrUrl(qrText: string) {
  return buildSystemQrUrl(qrText);
}

function getGlueQrType(data: any): GlueQrType | null {
  if (hasPayloadValue(data?.lineChemicalId) && hasPayloadValue(data?.chemicalMasterId)) {
    return "lineChemical";
  }

  if (hasPayloadValue(data?.mixGlueMasterId) && hasPayloadValue(data?.glueId)) {
    return "mixGlue";
  }

  if (hasPayloadValue(data?.separateGlueId) && hasPayloadValue(data?.glueId)) {
    return "separateGlue";
  }

  if (hasPayloadValue(data?.noSeparateGlueId) && hasPayloadValue(data?.materialCode)) {
    return "noSeparateGlue";
  }

  return null;
}

function isAllocatedGlueQrType(qrType: GlueQrType | null) {
  return qrType === "mixGlue" || qrType === "separateGlue" || qrType === "noSeparateGlue";
}

async function resolveGlueQrFromSystemUrl(qrText: string): Promise<ResolveGlueQrResult> {
  const systemUrl = getSystemQrUrl(qrText);

  if (!systemUrl) {
    return { data: null, status: "invalid" };
  }

  const userId = getCurrentUserId();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (userId) {
    headers.Authorization = `Bearer ${userId}`;
  }

  let response: Response;

  try {
    response = await fetch(systemUrl.toString(), {
      method: "GET",
      headers,
    });
  } catch (error) {
    console.error("Không thể gọi URL QR hệ thống:", error);
    return { data: null, status: "invalid" };
  }

  if (!response.ok) {
    return { data: null, status: "invalid" };
  }

  let responseData: any;

  try {
    responseData = await response.json();
  } catch (error) {
    console.error("Response QR không phải JSON:", error);
    return { data: null, status: "invalid" };
  }

  if (responseData?.success === false || !responseData?.data) {
    return { data: null, status: "noData" };
  }

  return { data: responseData.data, status: "success" };
}


async function resolveGlueQr(qrText: string): Promise<ResolveGlueQrResult> {
  if (!authStore.isOnline) {
    return findGlueOfflineQrData(qrText);
  }

  return resolveGlueQrFromSystemUrl(qrText);
}

async function openScanner(target: ConfirmScanTarget) {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== "granted" && camera !== "limited") {
      alert(t("mobile.glueConfirm.messages.cameraPermission"));
      return;
    }

    const { barcodes } = await BarcodeScanner.scan();

    if (barcodes && barcodes.length > 0) {
      const scannedValue = barcodes[0].rawValue;

      if (scannedValue) {
        await handleConfirmScanResult(target, scannedValue);
      } else {
        await showWarningAlert(t("mobile.glueConfirm.messages.invalidAllocatedQr"));
      }
    }
  } catch (error) {
    console.error("Lỗi khi quét mã QR:", error);
  }
}

async function handleConfirmScanResult(target: ConfirmScanTarget, value: string) {
  const normalizedValue = normalizeQrText(value);

  if (!normalizedValue) {
    return;
  }

  if (target === "line") {
    await handleLineQrScanResult(normalizedValue);
  }

  if (target === "allocated") {
    await handleAllocatedQrScanResult(normalizedValue);
  }

  closeCurrentToast();
}

async function handleLineQrScanResult(qrText: string) {
  lineQrText.value = t("mobile.glueConfirm.messages.loadingInfo");
  isLoadingLineQr.value = true;

  try {
    const result = await resolveGlueQr(qrText);

    if (result.status === "invalid") {
      resetLineQrField();
      await showWarningAlert(t("mobile.glueConfirm.messages.invalidLineQr"));
      return;
    }

    if (result.status === "noData" || !result.data) {
      resetLineQrField();
      await showWarningAlert(t("mobile.glueConfirm.messages.noGlueData"));
      return;
    }

    const qrType = getGlueQrType(result.data);

    if (qrType !== "lineChemical") {
      resetLineQrField();
      await showWarningAlert(t("mobile.glueConfirm.messages.invalidLineQr"));
      return;
    }

    lineQrRawText.value = qrText;
    lineChemicalInfo.value = result.data;
    lineQrText.value = formatLineChemicalDisplay(result.data);
    resetConfirmReturnStatus();
    notifyMismatchIfNeeded();
  } catch (error) {
    console.error("Không thể lấy thông tin QR thùng keo chuyền:", error);
    resetLineQrField();
    alert(t("mobile.glueConfirm.messages.loadLineError"));
  } finally {
    isLoadingLineQr.value = false;
  }
}

async function handleAllocatedQrScanResult(qrText: string) {
  allocatedQrText.value = t("mobile.glueConfirm.messages.loadingInfo");
  isLoadingAllocatedQr.value = true;

  try {
    const result = await resolveGlueQr(qrText);

    if (result.status === "invalid") {
      resetAllocatedQrField();
      await showWarningAlert(t("mobile.glueConfirm.messages.invalidAllocatedQr"));
      return;
    }

    if (result.status === "noData" || !result.data) {
      resetAllocatedQrField();
      await showWarningAlert(t("mobile.glueConfirm.messages.noGlueData"));
      return;
    }

    const qrType = getGlueQrType(result.data);

    if (!isAllocatedGlueQrType(qrType)) {
      resetAllocatedQrField();
      await showWarningAlert(t("mobile.glueConfirm.messages.invalidAllocatedQr"));
      return;
    }

    allocatedQrRawText.value = qrText;
    allocatedGlueInfo.value = result.data;
    allocatedDisplayRows.value = getAllocatedDisplayRows(result.data);
    allocatedQrText.value = formatAllocatedGlueDisplay(result.data);
    resetConfirmReturnStatus();
    notifyMismatchIfNeeded();
  } catch (error) {
    console.error("Không thể lấy thông tin QR thùng keo phát:", error);
    resetAllocatedQrField();
    alert(t("mobile.glueConfirm.messages.loadAllocatedError"));
  } finally {
    isLoadingAllocatedQr.value = false;
  }
}



async function handleConfirmReturn() {
  if (isConfirmButtonDisabled.value || !lineChemicalInfo.value || !allocatedGlueInfo.value) {
    return;
  }

  isConfirmingReturn.value = true;

  try {
    const payload: Record<string, any> = {
      factoryId: normalizeCompareValue(allocatedGlueInfo.value.factoryId),
      updaterId: getCurrentUserId(),
      productLineId: normalizeCompareValue(lineChemicalInfo.value?.productLineId),
    };

    const mixGlueMasterId = allocatedGlueInfo.value.mixGlueMasterId;
    const separateGlueId = allocatedGlueInfo.value.separateGlueId;
    const noSeparateGlueId = allocatedGlueInfo.value.noSeparateGlueId;

    if (hasPayloadValue(mixGlueMasterId)) {
      payload.mixGlueMasterId = mixGlueMasterId;
    }

    if (hasPayloadValue(separateGlueId)) {
      payload.separateGlueId = separateGlueId;
    }

    if (hasPayloadValue(noSeparateGlueId)) {
      payload.noSeparateGlueId = noSeparateGlueId;
    }

    if (!authStore.isOnline) {
      await addOfflineQueueItem('ReceiveGlue', 'api/mobile/gluereturnlog/confirmgr', 'POST', payload);
      await offlineStore.refreshQueueCounts();

      lineChemicalStore.setLineChemicalSession({
        lineChemicalId: lineChemicalInfo.value?.lineChemicalId ?? null,
        productLineId: lineChemicalInfo.value?.productLineId ?? null,
        factoryId: allocatedGlueInfo.value?.factoryId ?? null,
        productLineName: lineChemicalInfo.value?.productLineName ?? null,
        glueName: lineChemicalInfo.value?.glueName ?? null,
        confirmedAt: new Date().toISOString(),
      });

      isConfirmReturnCompleted.value = true;
      showToast(t('mobile.offlineQueue.saved'), 'offlineQueue');
      return;
    }

    console.group("[GlueConfirm] POST /api/mobile/gluereturnlog/confirmgr");
    console.info("Request payload:", payload);

    try {
      const response = await glueReturnApi.glueReturnConfirm(payload);
      console.info("Response:", response?.data ?? response);

      const responseData = response.data as any;

      if (!responseData.success || responseData.data !== true) {
        throw new Error(responseData.message || "");
      }

      lineChemicalStore.setLineChemicalSession({
        lineChemicalId: lineChemicalInfo.value?.lineChemicalId ?? null,
        productLineId: lineChemicalInfo.value?.productLineId ?? null,
        factoryId: allocatedGlueInfo.value?.factoryId ?? null,
        productLineName: lineChemicalInfo.value?.productLineName ?? null,
        glueName: lineChemicalInfo.value?.glueName ?? null,
        confirmedAt: new Date().toISOString(),
      });

      isConfirmReturnCompleted.value = true;
      showToast(t("mobile.glueConfirm.messages.confirmSuccess"));
    } finally {
      console.groupEnd();
    }
  } catch (error) {
    console.error("Không thể xác nhận:", error);

    const errorMessage = error instanceof Error && error.message
      ? error.message
      : t("mobile.glueConfirm.messages.confirmError");

    alert(errorMessage);
  } finally {
    isConfirmingReturn.value = false;
  }
}

function resetLineQrField() {
  lineQrText.value = "";
  lineQrRawText.value = "";
  lineChemicalInfo.value = null;
  resetConfirmReturnStatus();
}

function resetAllocatedQrField() {
  allocatedQrText.value = "";
  allocatedQrRawText.value = "";
  allocatedGlueInfo.value = null;
  allocatedDisplayRows.value = [];
  resetConfirmReturnStatus();
}

function resetConfirmReturnStatus() {
  isConfirmReturnCompleted.value = false;
}

function showToast(message: string, type: 'success' | 'offlineQueue' = 'success') {
  toastMessage.value = message;
  toastColor.value = type === 'offlineQueue' ? undefined : 'success';
  toastCssClass.value = type === 'offlineQueue' ? 'offline-queue-toast' : '';
  showSuccessToast.value = true;
}

function closeCurrentToast() {
  showSuccessToast.value = false;
}

function formatLineChemicalDisplay(info: any) {
  return formatGlueDisplay(info);
}

function formatGlueDisplay(info: any) {
  return `${t("mobile.glueConfirm.fields.productLineLabel")} ${info.productLineName}\n${t("mobile.glueConfirm.fields.glueLabel")} ${info.glueName}`;
}

function formatAllocatedGlueDisplay(info: any) {
  return formatGlueDisplay(info);
}

function getAllocatedDisplayRows(info: any) {
  return [
    { label: t("mobile.glueConfirm.fields.productLineLabel"), value: String(info.productLineName ?? "") },
    { label: t("mobile.glueConfirm.fields.glueLabel"), value: String(info.glueName ?? "") },
  ];
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
    font-size: 16px !important;
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

  &__icon {
    flex-shrink: 0;
    font-size: 18px !important;
  }
}

.confirm-button {
  overflow: hidden;
  margin: 0;
  border-radius: 16px;
  font-weight: 500;
  text-transform: none;
  font-size: 15px !important;
  min-height: 50px;

  ion-icon {
    margin-right: 10px;
  }

  &::part(native) {
    border-radius: 16px;
  }

  &[disabled],
  &--disabled {
    opacity: 0.48;
    pointer-events: none;
  }

  &--disabled::part(native) {
    cursor: not-allowed;
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
  color:rgba(0, 0, 0, 0.582)
}

.confirm-button__icon :deep(svg) {
  width: 22px;
  height: 22px;
  display: block;
}

.confirm-button__text {
  display: inline-flex;
  align-items: center;
  line-height: 1;
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

  &--compact {
    padding: 14px 18px;
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

    &__info {
      gap: 6px;
    }

    &__info-row {
      gap: 8px;
    }

    &__info-label,
    &__info-value {
      font-size: 1.28rem;
    }

    &__icon {
      font-size: 2.25rem;
    }
  }

  .confirm-button {
    min-height: 82px;
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
