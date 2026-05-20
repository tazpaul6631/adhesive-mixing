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
                  @click="openScanner('line')"
                >
                  <span
                    v-if="!lineQrText"
                    class="qr-scan-field__text qr-scan-field__text--empty"
                  >
                    Quét mã QR thùng keo chuyền
                  </span>
                  <div v-else-if="lineChemicalInfo" class="qr-scan-field__info">
                    <div class="qr-scan-field__info-row">
                      <span class="qr-scan-field__info-label">Chuyền:</span>
                      <span class="qr-scan-field__info-value">{{ lineChemicalInfo.productLineName }}</span>
                    </div>
                    <div class="qr-scan-field__info-row">
                      <span class="qr-scan-field__info-label">Keo:</span>
                      <span class="qr-scan-field__info-value">{{ lineChemicalInfo.glueName }}</span>
                    </div>
                  </div>
                  <span v-else class="qr-scan-field__text">
                    {{ lineQrText }}
                  </span>
                  <ion-icon class="qr-scan-field__icon" :icon="barcodeOutline" color="primary"></ion-icon>
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
                  @click="openScanner('allocated')"
                >
                  <span
                    v-if="!allocatedQrText"
                    class="qr-scan-field__text qr-scan-field__text--empty"
                  >
                    Quét mã QR thùng keo phát
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
                  <ion-icon class="qr-scan-field__icon" :icon="barcodeOutline" color="primary"></ion-icon>
                </button>
              </ion-card-content>
            </ion-card>

            <div v-if="statusMessage" class="status-box" :class="statusClass">
              <ion-icon class="status-box__icon" :icon="statusIcon"></ion-icon>
              <div class="status-box__content">
                <p><strong>Trạng thái: </strong>{{ statusMessage }}</p>
              </div>
            </div>

            <ion-button
              expand="block"
              class="confirm-button"
              :disabled="isConfirmButtonDisabled"
              @click="handleConfirmReturn"
            >
              <ion-icon slot="start" :icon="shieldCheckmarkOutline"></ion-icon>
              Xác nhận trả về
            </ion-button>

            <ion-button
              v-if="shouldShowReturnScanButton"
              expand="block"
              :class="['confirm-button', { 'confirm-button--disabled': isReturnScanButtonDisabled }]"
              :disabled="isReturnScanButtonDisabled"
              @click="openScanner('return')"
            >
              <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
              Quét Mã QR thùng keo trả về
            </ion-button>
          </div>
        </section>
      </div>

      <ion-modal
        :is-open="isReturnConfirmDialogOpen"
        class="return-confirm-modal"
        :backdrop-dismiss="false"
        @didDismiss="handleReturnDialogDismiss"
      >
        <div class="return-confirm-dialog">
          <div class="return-confirm-dialog__icon">
            <ion-icon :icon="alertCircle"></ion-icon>
          </div>

          <h2 class="return-confirm-dialog__title">Xác nhận trả về</h2>

          <p class="return-confirm-dialog__message">
            Xác nhận trả về thùng keo
            <strong>{{ pendingReturnDisplayText }}</strong>
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
import { computed, ref } from "vue";
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
} from "@ionic/vue";
import { alertCircle, barcodeOutline, checkmarkCircle, qrCodeOutline, shieldCheckmarkOutline } from "ionicons/icons";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { Haptics, NotificationType } from '@capacitor/haptics';
import separateGlueApi from "@/api/separate";
import mixGlueApi from "@/api/mixGlue";
import glueReturnApi from "@/api/glueReturn";
import { useAuthStore } from "@/store/auth";

type ConfirmScanTarget = "line" | "allocated";
type ScanTarget = ConfirmScanTarget | "return";
type ReturnScanButtonDisplayMode = "disabled" | "hidden";
type StatusBoxClass = "status-box--default" | "status-box--success" | "status-box--danger";

type LineQrPayload = {
  factoryId: string;
  lineChemicalId: string;
  productLineId: string;
};

type SeparateGlueQrPayload = {
  type: "separate";
  factoryId: string;
  sgId: string;
};

type MixGlueQrPayload = {
  type: "mix";
  factoryId: string;
  mgmId: string;
  womId: string;
};

type AllocatedQrPayload = SeparateGlueQrPayload | MixGlueQrPayload;

const authStore = useAuthStore();

const returnScanButtonDisplayMode = "disabled" as ReturnScanButtonDisplayMode;
const invalidLineQrMessage = "Mã QR không hợp lệ. Vui lòng quét lại mã QR thùng keo chuyền.";
const invalidAllocatedQrMessage = "Mã QR không hợp lệ. Vui lòng quét lại mã QR thùng keo phát.";
const noGlueDataMessage = "Không có dữ liệu thùng keo.";

const lineQrText = ref("");
const allocatedQrText = ref("");
const lineQrRawText = ref("");
const allocatedQrRawText = ref("");
const returnQrText = ref("");
const pendingReturnQrText = ref("");
const pendingReturnGlueInfo = ref<any>(null);

const lineChemicalInfo = ref<any>(null);
const allocatedGlueInfo = ref<any>(null);
const allocatedDisplayRows = ref<Array<{ label: string; value: string }>>([]);

const showSuccessToast = ref(false);
const toastMessage = ref("");
const isReturnConfirmDialogOpen = ref(false);
const isSubmittingReturn = ref(false);
const isReturnScanReady = ref(false);
const isConfirmReturnCompleted = ref(false);
const isLoadingLineQr = ref(false);
const isLoadingAllocatedQr = ref(false);

const shouldShowReturnScanButton = computed(() => {
  if (returnScanButtonDisplayMode === "hidden") {
    return isReturnScanReady.value;
  }

  return true;
});

const isReturnScanButtonDisabled = computed(() => {
  return !isReturnScanReady.value;
});

const pendingReturnDisplayText = computed(() => {
  if (pendingReturnGlueInfo.value) {
    return formatAllocatedGlueDisplay(pendingReturnGlueInfo.value);
  }

  return pendingReturnQrText.value;
});

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
  const isGlueMatched = normalizeCompareValue(lineChemicalInfo.value.chemicalMasterId) ===
    normalizeCompareValue(allocatedGlueInfo.value.glueId);

  return isProductLineMatched && isGlueMatched;
});

const isConfirmButtonDisabled = computed(() => {
  return isConfirmReturnCompleted.value || !isFirstTwoQrMatched.value || isLoadingLineQr.value || isLoadingAllocatedQr.value;
});

const statusMessage = computed(() => {
  if (!isFirstTwoQrReady.value) {
    return "";
  }

  if (!isFirstTwoQrMatched.value) {
    return "Mã QR thùng keo chuyền không khớp với mã QR thùng keo phát.";
  }

  return "Mã QR thùng keo chuyền khớp với mã QR thùng keo phát.";
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

function normalizeProductLineIdList(value: any) {
  if (Array.isArray(value)) {
    return value
      .flatMap((productLineId: any) => normalizeCompareValue(productLineId).split(","))
      .map((productLineId: string) => normalizeCompareValue(productLineId))
      .filter(Boolean);
  }

  const productLineIds = normalizeCompareValue(value);

  if (!productLineIds) {
    return [];
  }

  return productLineIds
    .split(",")
    .map((productLineId: string) => normalizeCompareValue(productLineId))
    .filter(Boolean);
}

function getAllocatedProductLineIds(info: any) {
  const productLineIds = normalizeProductLineIdList(info?.productLineIds);

  if (productLineIds.length) {
    return productLineIds;
  }

  return normalizeProductLineIdList(info?.productLineId);
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

function getGlueIdValue(info: any) {
  return info?.glueId || 0;
}

async function fetchAllocatedGlueInfo(payload: AllocatedQrPayload) {
  const response = payload.type === "mix"
    ? await mixGlueApi.getMixGlueScanQr(
        payload.factoryId,
        payload.mgmId,
        payload.womId
      )
    : await separateGlueApi.getSeparateGlueScanQr(
        payload.factoryId,
        payload.sgId
      );
  const responseData = response.data as any;

  if (!responseData.success || !responseData.data) {
    return null;
  }

  return responseData.data;
}

async function openScanner(target: ScanTarget) {
  if (target === "return" && isReturnScanButtonDisabled.value) {
    return;
  }

  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== "granted" && camera !== "limited") {
      alert("Cần cấp quyền camera để quét mã QR!");
      return;
    }

    const { barcodes } = await BarcodeScanner.scan();

    if (barcodes && barcodes.length > 0) {
      const scannedValue = barcodes[0].rawValue;

      if (scannedValue) {
        if (target === "return") {
          await handleReturnScanResult(scannedValue);
        } else {
          await handleConfirmScanResult(target, scannedValue);
        }
      } else {
        await showWarningAlert(invalidAllocatedQrMessage);
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
  const payload = parseLineQrPayload(qrText);

  if (!payload) {
    resetLineQrField();
    await showWarningAlert(invalidLineQrMessage);
    return;
  }

  lineQrText.value = "Đang tải thông tin...";
  isLoadingLineQr.value = true;

  try {
    const response = await separateGlueApi.getLineChemicalScanQr(
      payload.factoryId,
      payload.lineChemicalId,
      payload.productLineId
    );
    const responseData = response.data as any;

    if (!responseData.success || !responseData.data) {
      resetLineQrField();
      await showWarningAlert(noGlueDataMessage);
      return;
    }

    lineQrRawText.value = qrText;
    lineChemicalInfo.value = responseData.data;
    lineQrText.value = formatLineChemicalDisplay(responseData.data);
    resetConfirmReturnStatus();
    notifyMismatchIfNeeded();
  } catch (error) {
    console.error("Không thể lấy thông tin QR thùng keo chuyền:", error);
    resetLineQrField();
    alert("Không thể lấy thông tin mã QR thùng keo chuyền. Vui lòng kiểm tra kết nối API!");
  } finally {
    isLoadingLineQr.value = false;
  }
}

async function handleAllocatedQrScanResult(qrText: string) {
  const payload = parseAllocatedQrPayload(qrText);

  if (!payload) {
    resetAllocatedQrField();
    await showWarningAlert(invalidAllocatedQrMessage);
    return;
  }

  allocatedQrText.value = "Đang tải thông tin...";
  isLoadingAllocatedQr.value = true;

  try {
    const allocatedInfo = await fetchAllocatedGlueInfo(payload);

    if (!allocatedInfo) {
      resetAllocatedQrField();
      await showWarningAlert(noGlueDataMessage);
      return;
    }

    allocatedQrRawText.value = qrText;
    allocatedGlueInfo.value = allocatedInfo;
    allocatedDisplayRows.value = getAllocatedDisplayRows(allocatedInfo);
    allocatedQrText.value = formatAllocatedGlueDisplay(allocatedInfo);
    resetConfirmReturnStatus();
    notifyMismatchIfNeeded();
  } catch (error) {
    console.error("Không thể lấy thông tin QR thùng keo phát:", error);
    resetAllocatedQrField();
    alert("Không thể lấy thông tin mã QR thùng keo phát. Vui lòng kiểm tra kết nối API!");
  } finally {
    isLoadingAllocatedQr.value = false;
  }
}

async function handleReturnScanResult(value: string) {
  const normalizedValue = normalizeQrText(value);

  if (!normalizedValue) {
    return;
  }

  const payload = parseAllocatedQrPayload(normalizedValue);

  if (!payload) {
    resetReturnField();
    await showWarningAlert(invalidAllocatedQrMessage);
    return;
  }

  try {
    const returnGlueInfo = await fetchAllocatedGlueInfo(payload);

    if (!returnGlueInfo) {
      resetReturnField();
      await showWarningAlert(noGlueDataMessage);
      return;
    }

    returnQrText.value = formatAllocatedGlueDisplay(returnGlueInfo);
    pendingReturnQrText.value = normalizedValue;
    pendingReturnGlueInfo.value = returnGlueInfo;
    isReturnConfirmDialogOpen.value = true;
  } catch (error) {
    console.error("Không thể lấy thông tin QR thùng keo trả về:", error);
    resetReturnField();
    alert("Không thể lấy thông tin mã QR thùng keo trả về. Vui lòng kiểm tra kết nối API!");
  }
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
    await submitReturnQr();
    isReturnConfirmDialogOpen.value = false;
    resetReturnField();
    showToast("Trả về thành công");
  } catch (error) {
    console.error("Không thể xác nhận trả về thùng keo:", error);
    alert("Không thể xác nhận trả về thùng keo. Vui lòng thử lại!");
  } finally {
    isSubmittingReturn.value = false;
  }
}

async function submitReturnQr() {
  if (!pendingReturnGlueInfo.value || !lineChemicalInfo.value) {
    throw new Error("Missing return glue or line chemical data");
  }

  const userId = getCurrentUserId();
  const payload = {
    factoryId: normalizeCompareValue(pendingReturnGlueInfo.value.factoryId),
    returnGlueId: getGlueIdValue(pendingReturnGlueInfo.value),
    lineChemicalId: lineChemicalInfo.value.lineChemicalId || 0,
    recordStatus: "1",
    createrId: userId,
    updaterId: userId,
  };

  console.group("[GlueConfirm] POST /api/mobile/gluereturnlog/create");
  console.info("Request payload:", payload);

  try {
    const response = await glueReturnApi.glueReturn(payload);
    console.info("Response:", response?.data ?? response);

    const responseData = response.data as any;

    if (!responseData.success || responseData.data !== true) {
      throw new Error(responseData.message || "Create glue return log failed");
    }
  } finally {
    console.groupEnd();
  }
}

async function handleConfirmReturn() {
  if (isConfirmButtonDisabled.value || !allocatedGlueInfo.value) {
    return;
  }

  const payload: Record<string, any> = {
    factoryId: normalizeCompareValue(allocatedGlueInfo.value.factoryId),
    updaterId: getCurrentUserId(),
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

  console.group("[GlueConfirm] POST /api/mobile/gluereturnlog/confirmgr");
  console.info("Request payload:", payload);

  try {
    const response = await glueReturnApi.glueReturnConfirm(payload);
    console.info("Response:", response?.data ?? response);

    const responseData = response.data as any;

    if (!responseData.success || responseData.data !== true) {
      throw new Error(responseData.message || "Confirm glue return failed");
    }

    isReturnScanReady.value = true;
    isConfirmReturnCompleted.value = true;
    showToast("Xác nhận trả về thành công");
  } catch (error) {
    console.error("Không thể xác nhận trả về:", error);
    alert("Không thể xác nhận trả về. Vui lòng thử lại!");
  } finally {
    console.groupEnd();
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

function resetConfirmFields() {
  resetLineQrField();
  resetAllocatedQrField();
}

function resetReturnField() {
  returnQrText.value = "";
  pendingReturnQrText.value = "";
  pendingReturnGlueInfo.value = null;
}

function resetReturnScanState() {
  isReturnScanReady.value = false;
}

function resetConfirmReturnStatus() {
  isReturnScanReady.value = false;
  isConfirmReturnCompleted.value = false;
  resetReturnField();
}

function showToast(message: string) {
  toastMessage.value = message;
  showSuccessToast.value = true;
}

function closeCurrentToast() {
  showSuccessToast.value = false;
}

function formatLineChemicalDisplay(info: any) {
  return formatGlueDisplay(info);
}

function formatGlueDisplay(info: any) {
  return `Chuyền: ${info.productLineName}\nKeo: ${info.glueName}`;
}

function formatAllocatedGlueDisplay(info: any) {
  return formatGlueDisplay(info);
}

function getAllocatedDisplayRows(info: any) {
  return [
    { label: "Chuyền:", value: String(info.productLineName ?? "") },
    { label: "Keo:", value: String(info.glueName ?? "") },
  ];
}

function parseLineQrPayload(qrText: string): LineQrPayload | null {
  const normalizedText = normalizeQrText(qrText);

  if (!normalizedText) {
    return null;
  }

  const pathname = getQrPathname(normalizedText);

  if (!pathname) {
    return null;
  }

  return parseLineQrPathPayload(pathname);
}

function getQrPathname(qrText: string) {
  try {
    return new URL(qrText).pathname;
  } catch {
    return qrText.startsWith("/") ? qrText : "";
  }
}

function parseLineQrPathPayload(pathname: string): LineQrPayload | null {
  const parts = pathname.split("/").filter(Boolean);
  const scanQrIndex = parts.findIndex((part, index) => {
    return (
      part.toLowerCase() === "scanqr" &&
      parts[index - 3]?.toLowerCase() === "api" &&
      parts[index - 2]?.toLowerCase() === "mobile" &&
      parts[index - 1]?.toLowerCase() === "linechemical"
    );
  });

  if (scanQrIndex === -1) {
    return null;
  }

  const factoryId = parts[scanQrIndex + 1];
  const lineChemicalId = parts[scanQrIndex + 2];
  const productLineId = parts[scanQrIndex + 3];

  if (!factoryId || !lineChemicalId || !productLineId) {
    return null;
  }

  return {
    factoryId: decodeURIComponent(factoryId),
    lineChemicalId: decodeURIComponent(lineChemicalId),
    productLineId: decodeURIComponent(productLineId),
  };
}

function parseAllocatedQrPayload(qrText: string): AllocatedQrPayload | null {
  const normalizedText = normalizeQrText(qrText);

  if (!normalizedText) {
    return null;
  }

  const pathname = getQrPathname(normalizedText);

  if (!pathname) {
    return null;
  }

  return parseAllocatedQrPathPayload(pathname);
}

function parseAllocatedQrPathPayload(pathname: string): AllocatedQrPayload | null {
  const separateGluePayload = parseSeparateGlueQrPathPayload(pathname);

  if (separateGluePayload) {
    return separateGluePayload;
  }

  return parseMixGlueQrPathPayload(pathname);
}

function parseSeparateGlueQrPathPayload(pathname: string): SeparateGlueQrPayload | null {
  const parts = pathname.split("/").filter(Boolean);
  const scanQrIndex = parts.findIndex((part, index) => {
    return (
      part.toLowerCase() === "scansgqr" &&
      parts[index - 3]?.toLowerCase() === "api" &&
      parts[index - 2]?.toLowerCase() === "mobile" &&
      parts[index - 1]?.toLowerCase() === "separateglue"
    );
  });

  if (scanQrIndex === -1) {
    return null;
  }

  const factoryId = parts[scanQrIndex + 1];
  const sgId = parts[scanQrIndex + 2];

  if (!factoryId || !sgId) {
    return null;
  }

  return {
    type: "separate",
    factoryId: decodeURIComponent(factoryId),
    sgId: decodeURIComponent(sgId),
  };
}

function parseMixGlueQrPathPayload(pathname: string): MixGlueQrPayload | null {
  const parts = pathname.split("/").filter(Boolean);
  const scanQrIndex = parts.findIndex((part, index) => {
    return (
      part.toLowerCase() === "scanqr" &&
      parts[index - 3]?.toLowerCase() === "api" &&
      parts[index - 2]?.toLowerCase() === "mobile" &&
      parts[index - 1]?.toLowerCase() === "mixglue"
    );
  });

  if (scanQrIndex === -1) {
    return null;
  }

  const factoryId = parts[scanQrIndex + 1];
  const mgmId = parts[scanQrIndex + 2];
  const womId = parts[scanQrIndex + 3];

  if (!factoryId || !mgmId || !womId) {
    return null;
  }

  return {
    type: "mix",
    factoryId: decodeURIComponent(factoryId),
    mgmId: decodeURIComponent(mgmId),
    womId: decodeURIComponent(womId),
  };
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
  font-size: 14px !important;
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
