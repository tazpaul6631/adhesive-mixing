<template>
  <AppPage>
    <AppHeader no-border class="mobile-glue-header">
      <template #start>
        <div class="header-start">
          <button type="button" class="header-back" @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
            <h1 class="header-title">{{ t("mobile.glueConfirm.title") }}</h1>
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
        <section class="qr-panel">
          <div class="qr-panel__body">
            <article class="qr-container">
              <header class="qr-container__header">
                <h2 class="qr-container__title">{{ t("mobile.glueConfirm.lineQrTitle") }}</h2>
              </header>
              <div class="qr-container__body">
                <button type="button" class="qr-scan-field" @click="openScanner('line')">
                  <span v-if="!lineQrText" class="qr-scan-field__text qr-scan-field__text--empty">
                    {{ t("mobile.glueConfirm.scanPlaceholder") }}
                  </span>
                  <div v-else-if="lineChemicalInfo" class="qr-scan-field__info">
                    <div v-if="lineChemicalInfo.productLineName" class="qr-scan-field__info-row">
                      <span class="qr-scan-field__info-label">{{ t("mobile.glueConfirm.fields.productLineLabel")
                      }}</span>
                      <span class="qr-scan-field__info-value">{{ lineChemicalInfo.productLineName }}</span>
                    </div>
                    <div class="qr-scan-field__info-row">
                      <span class="qr-scan-field__info-label">{{ t("mobile.glueConfirm.fields.glueLabel") }}</span>
                      <span class="qr-scan-field__info-value">{{
                        lineChemicalInfo.glueName || lineChemicalInfo.layoutLineChemicalName
                      }}</span>
                    </div>
                  </div>
                  <span v-else class="qr-scan-field__text">
                    {{ lineQrText }}
                  </span>
                  <span class="confirm-button__icon">
                    <McScanFill />
                  </span>
                </button>
              </div>
            </article>

            <article class="qr-container">
              <header class="qr-container__header">
                <h2 class="qr-container__title">{{ t("mobile.glueConfirm.allocatedQrTitle") }}</h2>
              </header>
              <div class="qr-container__body">
                <button type="button" class="qr-scan-field" @click="openScanner('allocated')">
                  <span v-if="!allocatedQrText" class="qr-scan-field__text qr-scan-field__text--empty">
                    {{ t("mobile.glueConfirm.scanPlaceholder") }}
                  </span>
                  <div v-else-if="allocatedDisplayRows.length" class="qr-scan-field__info">
                    <div v-for="row in allocatedDisplayRows" :key="row.label" class="qr-scan-field__info-row">
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
              </div>
            </article>

            <div v-if="statusMessage" class="status-box" :class="statusClass">
              <i :class="['pi', 'status-box__icon', statusIcon]" aria-hidden="true"></i>
              <div class="status-box__content">
                <p><strong>{{ t("mobile.glueConfirm.statusLabel") }} </strong>{{ statusMessage }}</p>
              </div>
            </div>

            <div v-if="allocatedExpiredMessage" class="status-box status-box--danger status-box--compact">
              <i class="pi pi-exclamation-circle status-box__icon" aria-hidden="true"></i>
              <div class="status-box__content">
                <p>{{ allocatedExpiredMessage }}</p>
              </div>
            </div>

            <Button class="confirm-button w-full" icon="pi pi-verified" :disabled="isConfirmButtonDisabled"
              :label="t('mobile.glueConfirm.confirmReturnButton')" @click="handleConfirmReturn" />

          </div>
        </section>
      </div>
    </AppContent>
  </AppPage>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useRouter } from "vue-router";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { Haptics, NotificationType } from '@capacitor/haptics';
import { useI18n } from "vue-i18n";
import glueReturnApi from "@/api/glueReturn";
import { useAuthStore } from "@/store/auth";
import { useLineChemicalStore } from '@/store/lineChemical';
import { AppPage, AppHeader, AppContent } from '@/components/layout';
import MobileOfflineNotice from '@/views/Mobile/components/MobileOfflineNotice.vue';
import NetworkStatusIcon from '@/views/Mobile/components/NetworkStatusIcon.vue';
import { buildSystemQrUrl, getGlueQrCode } from "@/views/Mobile/config/systemQrUrl";
import { findGlueOfflineQrData } from '@/services/glueOfflineData.service';
import { addOfflineQueueItem } from '@/services/offlineQueue.service';
import { useOfflineStore } from '@/store/offline';
import { useAppToast } from '@/composables/useAppToast';
import { McScanFill } from '@kalimahapps/vue-icons/mc';
import { resolveCatchErrorMessage } from '@/utils/catchErrorMessage';

type ConfirmScanTarget = "line" | "allocated";
type LineQrKind = "lc" | "llc";
type StatusBoxClass = "status-box--default" | "status-box--success" | "status-box--danger";
type GlueQrType = "lineChemical" | "mixGlue" | "separateGlue" | "noSeparateGlue";
type ResolveGlueQrResult = {
  data: any | null;
  status: "success" | "invalid" | "noData";
};

const authStore = useAuthStore();
const router = useRouter();
const lineChemicalStore = useLineChemicalStore();
const offlineStore = useOfflineStore();
const { t } = useI18n();
const { showToast } = useAppToast();

const goBack = () => {
  router.push('/app-menu');
};

const lineQrText = ref("");
const allocatedQrText = ref("");
const lineQrRawText = ref("");
const allocatedQrRawText = ref("");
const lineChemicalInfo = ref<any>(null);
const allocatedGlueInfo = ref<any>(null);
const allocatedDisplayRows = ref<Array<{ label: string; value: string }>>([]);

const isConfirmReturnCompleted = ref(false);
const isLoadingLineQr = ref(false);
const isLoadingAllocatedQr = ref(false);
const isConfirmingReturn = ref(false);

const CONFIRM_GR_ENDPOINT = 'api/mobile/gluereturnlog/confirmgr';

const isFirstTwoQrReady = computed(() => {
  return !!lineChemicalInfo.value && !!allocatedGlueInfo.value;
});

const isFirstTwoQrMatched = computed(() => {
  if (!lineChemicalInfo.value || !allocatedGlueInfo.value) {
    return false;
  }

  const lineGlueName = normalizeGlueName(
    lineChemicalInfo.value.glueName || lineChemicalInfo.value.layoutLineChemicalName
  );
  const allocatedGlueName = normalizeGlueName(allocatedGlueInfo.value.glueName);
  return !!lineGlueName && !!allocatedGlueName && lineGlueName === allocatedGlueName;
});

const isAllocatedGlueExpired = computed(() => {
  return isEndDateExpired(allocatedGlueInfo.value?.endDate);
});

const allocatedExpiredMessage = computed(() => {
  return isAllocatedGlueExpired.value ? t("mobile.glueConfirm.messages.allocatedExpired") : "";
});

const isConfirmButtonDisabled = computed(() => {
  return !isFirstTwoQrMatched.value || isAllocatedGlueExpired.value || isLoadingLineQr.value || isLoadingAllocatedQr.value || isConfirmingReturn.value;
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
  return statusClass.value === "status-box--danger" ? "pi-exclamation-circle" : "pi-check-circle";
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

function normalizeGlueName(value: any) {
  return normalizeCompareValue(value)
    .replace(/\s+/g, "")
    .toLowerCase();
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
  showToast({
    severity: 'warn',
    summary: t('mobile.glueConfirm.title'),
    detail: message,
    life: 3000,
  });
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

function getLineReceiveType(data: any): string {
  return normalizeCompareValue(data?.type);
}

function getLineQrKind(qrText: string, data?: any): LineQrKind | null {
  const code = getGlueQrCode(qrText);
  if (code === "lc" || code === "llc") {
    return code;
  }

  if (hasPayloadValue(data?.layoutLineChemicalId) && !hasPayloadValue(data?.lineChemicalId)) {
    return "llc";
  }

  if (hasPayloadValue(data?.lineChemicalId) || hasPayloadValue(data?.productLineId)) {
    return "lc";
  }

  return null;
}

function buildConfirmGrPayload(scanFailed: boolean): Record<string, any> | null {
  if (!lineChemicalInfo.value || !allocatedGlueInfo.value) {
    return null;
  }

  const userId = getCurrentUserId();
  const receiveType = getLineReceiveType(lineChemicalInfo.value);
  const lineQrKind = (lineChemicalInfo.value._lineQrKind as LineQrKind | undefined)
    ?? getLineQrKind(lineQrRawText.value, lineChemicalInfo.value);
  const lineChemicalId = normalizeCompareValue(lineChemicalInfo.value.lineChemicalId);
  const layoutLineChemicalId = normalizeCompareValue(
    lineChemicalInfo.value.layoutLineChemicalId
  );
  // BE không còn nhận productLineId khi confirm.
  // const productLineId = normalizeCompareValue(lineChemicalInfo.value.productLineId);

  const payload: Record<string, any> = {
    factoryId: normalizeCompareValue(allocatedGlueInfo.value.factoryId),
    updaterId: userId,
    receivedBy: userId,
    scanFailed,
  };

  // s/llc → layoutLineChemicalId (llcqrdata). s/lc → id theo type / lcqrdata.
  if (lineQrKind === "llc") {
    if (!layoutLineChemicalId) {
      return null;
    }
    payload.layoutLineChemicalId = layoutLineChemicalId;
  } else if (receiveType === "UseProductLine" || receiveType === "UseLineChemical") {
    // UseProductLine: không gửi productLineId — dùng lineChemicalId / layoutLineChemicalId.
    // if (!productLineId) return null;
    // payload.productLineId = productLineId;
    if (!lineChemicalId && !layoutLineChemicalId) {
      return null;
    }
    if (lineChemicalId) {
      payload.lineChemicalId = lineChemicalId;
    }
    if (layoutLineChemicalId) {
      payload.layoutLineChemicalId = layoutLineChemicalId;
    }
  } else if (receiveType === "UseLayoutLineChemical") {
    if (!layoutLineChemicalId) {
      return null;
    }
    payload.layoutLineChemicalId = layoutLineChemicalId;
  } else {
    if (layoutLineChemicalId && !lineChemicalId) {
      payload.layoutLineChemicalId = layoutLineChemicalId;
    } else {
      if (!lineChemicalId && !layoutLineChemicalId) {
        return null;
      }
      if (lineChemicalId) {
        payload.lineChemicalId = lineChemicalId;
      }
      if (layoutLineChemicalId) {
        payload.layoutLineChemicalId = layoutLineChemicalId;
      }
      // if (productLineId) {
      //   payload.productLineId = productLineId;
      // }
    }
  }

  const { mixGlueMasterId, separateGlueId, noSeparateGlueId } = allocatedGlueInfo.value;
  if (hasPayloadValue(mixGlueMasterId)) payload.mixGlueMasterId = mixGlueMasterId;
  if (hasPayloadValue(separateGlueId)) payload.separateGlueId = separateGlueId;
  if (hasPayloadValue(noSeparateGlueId)) payload.noSeparateGlueId = noSeparateGlueId;

  return payload;
}

async function enqueueConfirmGrPayload(payload: Record<string, any>) {
  await addOfflineQueueItem('ReceiveGlue', CONFIRM_GR_ENDPOINT, 'POST', payload);
  await offlineStore.refreshQueueCounts();
}

async function submitConfirmGrPayload(
  payload: Record<string, any>,
  options: { silent?: boolean; fallbackToQueueOnFailure?: boolean } = {}
): Promise<string | boolean> {
  if (!authStore.isOnline) {
    await enqueueConfirmGrPayload(payload);
    return true;
  }

  try {
    const response = await glueReturnApi.glueReturnConfirm(payload);
    const responseData = response.data as any;

    if (!responseData.success || responseData.data !== true) {
      if (options.fallbackToQueueOnFailure) {
        await enqueueConfirmGrPayload(payload);
        return true;
      }
      if (options.silent) {
        console.warn('[GlueConfirm] confirmgr rejected:', responseData.message);
        return false;
      }
      throw new Error(responseData.message || '');
    }

    return typeof responseData.message === 'string' ? responseData.message : true;
  } catch (error) {
    if (options.fallbackToQueueOnFailure) {
      try {
        await enqueueConfirmGrPayload(payload);
        return true;
      } catch (queueError) {
        console.error('[GlueConfirm] fallback queue failed:', queueError);
        return false;
      }
    }
    if (options.silent) {
      console.error('[GlueConfirm] confirmgr failed:', error);
      return false;
    }
    throw error;
  }
}

async function logScanMismatch() {
  if (!lineChemicalInfo.value || !allocatedGlueInfo.value || isFirstTwoQrMatched.value) {
    return;
  }

  const payload = buildConfirmGrPayload(true);
  if (!payload) {
    return;
  }

  await submitConfirmGrPayload(payload, { silent: true, fallbackToQueueOnFailure: true });
}

async function notifyMismatchIfNeeded() {
  if (!lineChemicalInfo.value || !allocatedGlueInfo.value) {
    return;
  }

  if (isFirstTwoQrMatched.value) {
    return;
  }

  await triggerMismatchFeedback();
  await logScanMismatch();
}

function saveLineChemicalSessionAfterConfirm() {
  const info = lineChemicalInfo.value;
  lineChemicalStore.setLineChemicalSession({
    lineChemicalId: info?.lineChemicalId ?? info?.layoutLineChemicalId ?? null,
    productLineId: info?.productLineId ?? null,
    factoryId: allocatedGlueInfo.value?.factoryId ?? null,
    productLineName: info?.productLineName ?? null,
    glueName: info?.glueName || info?.layoutLineChemicalName || null,
    confirmedAt: new Date().toISOString(),
  });
}

function getSystemQrUrl(qrText: string) {
  return buildSystemQrUrl(qrText);
}

/** Chuẩn hóa data QR chuyền: hỗ trợ lineChemicalId (cũ) và layoutLineChemicalId (/s/llc). */
function normalizeLineChemicalScanData(data: any) {
  if (!data || typeof data !== 'object') return data;

  return {
    ...data,
    glueName: data.glueName || data.layoutLineChemicalName || '',
    productLineName: data.productLineName || '',
  };
}

function getGlueQrType(data: any): GlueQrType | null {
  const receiveType = getLineReceiveType(data);
  const hasLineId =
    hasPayloadValue(data?.lineChemicalId) ||
    hasPayloadValue(data?.layoutLineChemicalId);
  const hasProductLineId = hasPayloadValue(data?.productLineId);
  const hasLayoutLineId = hasPayloadValue(data?.layoutLineChemicalId);
  const hasLayoutGlueName =
    hasPayloadValue(data?.glueName) || hasPayloadValue(data?.layoutLineChemicalName);

  if (receiveType === 'UseProductLine') {
    if (hasProductLineId) {
      return "lineChemical";
    }
    return null;
  }

  if (receiveType === 'UseLineChemical') {
    if (hasLineId && hasPayloadValue(data?.chemicalMasterId)) {
      return "lineChemical";
    }
    return null;
  }

  if (receiveType === 'UseLayoutLineChemical') {
    if (hasLayoutLineId && hasLayoutGlueName) {
      return "lineChemical";
    }
    return null;
  }

  // Offline llcqrdata thường không có type — nhận layoutLineChemicalId + tên keo / glueId.
  if (hasLayoutLineId && (hasLayoutGlueName || hasPayloadValue(data?.glueId))) {
    return "lineChemical";
  }

  if (hasLineId && hasPayloadValue(data?.chemicalMasterId)) {
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
      showToast({
        severity: 'warn',
        summary: t('mobile.glueConfirm.title'),
        detail: t("mobile.glueConfirm.messages.cameraPermission"),
        life: 3000,
      });
      return;
    }

    const { barcodes } = await BarcodeScanner.scan();

    if (barcodes && barcodes.length > 0) {
      const scannedValue = barcodes[0].rawValue;
      console.log('scannedValue', scannedValue);
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
}

async function handleLineQrScanResult(qrText: string) {
  lineQrText.value = t("mobile.glueConfirm.messages.loadingInfo");
  isLoadingLineQr.value = true;

  try {
    const lineQrKind = getLineQrKind(qrText);
    if (lineQrKind !== "lc" && lineQrKind !== "llc") {
      resetLineQrField();
      await showWarningAlert(t("mobile.glueConfirm.messages.invalidLineQr"));
      return;
    }

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
    const normalized = {
      ...normalizeLineChemicalScanData(result.data),
      _lineQrKind: lineQrKind,
    };
    lineChemicalInfo.value = normalized;
    lineQrText.value = formatLineChemicalDisplay(normalized);
    resetConfirmReturnStatus();
    await notifyMismatchIfNeeded();
  } catch (error) {
    console.error("Không thể lấy thông tin QR thùng keo chuyền:", error);
    resetLineQrField();
    showToast({
      severity: 'warn',
      summary: t('mobile.glueConfirm.title'),
      detail: t("mobile.glueConfirm.messages.loadLineError"),
      life: 3000,
    });
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
    await notifyMismatchIfNeeded();
  } catch (error) {
    console.error("Không thể lấy thông tin QR thùng keo phát:", error);
    resetAllocatedQrField();
    showToast({
      severity: 'warn',
      summary: t('mobile.glueConfirm.title'),
      detail: t("mobile.glueConfirm.messages.loadAllocatedError"),
      life: 3000,
    });
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
    const payload = buildConfirmGrPayload(false);
    if (!payload) {
      return;
    }

    if (!authStore.isOnline) {
      await submitConfirmGrPayload(payload);
      saveLineChemicalSessionAfterConfirm();
      notifyToast(t('mobile.offlineQueue.saved'), 'offlineQueue');
      resetAllocatedQrField();
      resetLineQrField();
      return;
    }

    try {
      const result = await submitConfirmGrPayload(payload);
      saveLineChemicalSessionAfterConfirm();
      notifyToast(resolveCatchErrorMessage(
        t,
        typeof result === 'string' ? result : 'LINE_GLUE_CONFIRM_SUCCESS',
        t('catchError.LINE_GLUE_CONFIRM_SUCCESS'),
      ));
      resetAllocatedQrField();
      resetLineQrField();
    } finally {
      console.groupEnd();
    }
  } catch (error) {
    console.error("Không thể xác nhận:", error);

    const rawMessage = (error as any)?.response?.data?.message
      || (error instanceof Error ? error.message : '');

    showToast({
      severity: 'warn',
      summary: t('mobile.glueConfirm.title'),
      detail: resolveCatchErrorMessage(
        t,
        rawMessage,
        t('mobile.glueConfirm.messages.confirmError'),
      ),
      life: 3000,
    });
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

function notifyToast(message: string, type: 'success' | 'offlineQueue' = 'success') {
  showToast({
    severity: type === 'offlineQueue' ? 'warn' : 'success',
    summary: type === 'offlineQueue'
      ? t('mobile.offlineQueue.title')
      : t('mobile.glueConfirm.title'),
    detail: message,
    life: 3000,
  });
}

function formatLineChemicalDisplay(info: any) {
  const glueName = info?.glueName || info?.layoutLineChemicalName || '';
  const productLineName = info?.productLineName || '';
  if (productLineName) {
    return `${t("mobile.glueConfirm.fields.productLineLabel")} ${productLineName}\n${t("mobile.glueConfirm.fields.glueLabel")} ${glueName}`;
  }
  return `${t("mobile.glueConfirm.fields.glueLabel")} ${glueName}`;
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

  &__header {
    padding: 24px 24px 16px;
  }

  &__title {
    margin: 0;
    color: #081a36;
    font-weight: 700;
    font-size: 18px;
  }

  &__body {
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
  border-radius: 16px !important;
  font-weight: 500;
  text-transform: none;
  font-size: 15px !important;
  min-height: 50px;

  &:disabled {
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
  }

  .qr-container__header {
    padding: 28px 30px 18px;
  }

  .qr-container__title {
    font-size: 1.72rem;
  }

  .qr-container__body {
    padding: 0 30px 30px;
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
