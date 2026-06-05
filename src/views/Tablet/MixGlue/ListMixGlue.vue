<template>
  <ion-page :class="{ 'list-mix-glue--scanning': isScanning }">
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <div class="flex align-items-center justify-content-between">
          <ion-title class="no-padding">{{ t('appMenu.features.mixGlue.title') }}</ion-title>
          <LocaleSelect device-scope="tablet" select-class="mr-4" />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding list-mix-glue-content" :scroll-events="true">
      <div class="main-container max-w-full mx-auto" :class="{ 'list-mix-glue-layer--hidden': isScanning }">
        <div class="surface-card p-0 shadow-1 border-round-xl">
          <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between gap-2">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-list mr-2"></i>{{ t('listMixGlue.sectionTitle') }}
            </span>
            <div class="flex align-items-center gap-2">
              <Button v-if="hasPendingPrint" icon="pi pi-exclamation-triangle" severity="warn" outlined size="large"
                :badge="String(pendingCount)" badgeSeverity="danger"
                :title="t('listMixGlue.print.pendingButtonTitle', { count: pendingCount })"
                :aria-label="t('listMixGlue.print.pendingButtonTitle', { count: pendingCount })"
                @click="openPendingPrintDialog" />
              <BluetoothPrinterStatus ref="bluetoothRef" />
            </div>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <DataTable :value="lineDetails" lazy :totalRecords="totalRecords" @page="onPageLine" scrollable
              scrollHeight="520px" stripedRows class="modern-table auto-columns-table" tableStyle="width: 100%;"
              @row-click="onRowClick" :paginator="true" :rows="rowsPerPage" :rowsPerPageOptions="[5, 10, 20, 50]"
              selectionMode="single" v-model:selection="selectedItem" dataKey="workOrderMasterId">

              <template #empty>
                <div style="text-align: center; height: 440px; align-content: center;">
                  <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                  <p style="margin: 0; color: #6b7280;">{{ t('listMixGlue.empty') }}</p>
                </div>
              </template>

              <Column field="workOrderMasterName" :header="t('listMixGlue.columns.workOrder')"
                headerClass="dt-col-primary" bodyClass="dt-col-primary">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else class="dt-cell-wrap">{{ data.workOrderMasterName }}</span>
                </template>
              </Column>

              <Column field="chemicalMasterName" :header="t('listMixGlue.columns.glue')" headerClass="dt-col-primary"
                bodyClass="dt-col-primary">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else class="dt-cell-wrap">{{ data.chemicalMasterName }}</span>
                </template>
              </Column>

              <Column field="workOrderWeight" :header="t('listMixGlue.columns.totalWeight')" headerClass="dt-col-weight"
                bodyClass="dt-col-weight">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.workOrderWeight }}</span>
                </template>
              </Column>

              <Column field="createrId" :header="t('listMixGlue.columns.updater')" headerClass="dt-col-text"
                bodyClass="dt-col-text">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="70%" height="1rem" />
                  <span v-else>{{ data.updaterId }}</span>
                </template>
              </Column>

              <Column field="createDate" :header="t('listMixGlue.columns.updateDate')" headerClass="dt-col-datetime"
                bodyClass="dt-col-datetime">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <span v-else><i class="pi pi-clock text-xs mr-1"></i>{{ data.updateDate ?
                    format.formatDate(data.updateDate) : '' }}</span>
                </template>
              </Column>

              <Column v-if="showConfirmColumn" :header="t('listMixGlue.columns.confirm')" :exportable="false"
                headerClass="dt-col-action" bodyClass="dt-col-action">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <div v-else-if="shouldShowConfirmActions(data)" class="flex gap-2">
                    <Button :disabled="data.mixGlueStep !== '2' || isRowProcessing(data.workOrderMasterId)"
                      icon="pi pi-check-circle" severity="success" size="large"
                      @click.stop="handleConfirm(data.workOrderMasterId)" />
                    <Button
                      :disabled="data.mixGlueStep !== '3' || !canPrintRow(data) || isRowProcessing(data.workOrderMasterId)"
                      icon="pi pi-print" severity="success" size="large" @click.stop="handlePrint(data)" />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </div>
    </ion-content>

    <div v-if="isScanning" class="scan-camera-overlay">
      <div class="scan-camera-content">
        <p class="scan-camera-title">{{ scanTitle }}</p>
        <p class="scan-camera-note" v-html="scanNote"></p>

        <div class="scan-camera-frame">
          <span class="scan-corner scan-corner--tl"></span>
          <span class="scan-corner scan-corner--tr"></span>
          <span class="scan-corner scan-corner--bl"></span>
          <span class="scan-corner scan-corner--br"></span>
          <span class="scan-frame-line"></span>
        </div>

        <div class="scan-camera-hint-wrapper flex justify-center items-center gap-2">
          <p class="scan-camera-hint">
            <i class="pi pi-camera"></i>
            {{ t('login.cameraFrontOn') }}
          </p>
        </div>

        <Button class="scan-cancel-btn" :label="t('login.cancelScan')" icon="pi pi-times" severity="secondary"
          @click="cancelScan" />
      </div>
    </div>

    <BatchPrintProgressOverlay locale-scope="listMixGlue" :visible="isPrinting" :current="progress.current"
      :total="progress.total" />

    <BatchPrintRetryDialog v-model:visible="showRetryDialog" locale-scope="listMixGlue" :failed-items="failedItems"
      :loading="isPrinting" @retry="handleRetryPrint" />
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  onIonViewWillEnter, onIonViewDidEnter, onIonViewDidLeave, useBackButton
} from '@ionic/vue';
import { ref, nextTick, computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import format from '@/mixins/format';
import workOrder from '@/api/workOrder';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useMixGlueDraftStore } from '@/store/mixGlueDraft';
import mixGlueApi from '@/api/mixGlue';
import employeeApi from '@/api/employee';
import BluetoothPrinterStatus from '@/components/BluetoothPrinterStatus.vue';
import BatchPrintProgressOverlay from '@/components/BatchPrintProgressOverlay.vue';
import BatchPrintRetryDialog from '@/components/BatchPrintRetryDialog.vue';
import { useTabletBarcodeScan } from '@/composables/useTabletBarcodeScan';
import { parsePrintQueueFromBe } from '@/services/mixGlueLabelPrint';
import { useMixGlueLabelBatchPrint } from '@/composables/useMixGlueLabelBatchPrint';
import LocaleSelect from '@/components/LocaleSelect.vue';
import { useAppLocale } from '@/composables/useAppLocale';
import { useRequireOnline } from '@/composables/useRequireOnline';

const router = useRouter();
const authStore = useAuthStore();
const { t } = useAppLocale(() => 'tablet');
const { requireOnline, notifyOfflineFromError } = useRequireOnline();

const selectedItem = ref<any>(null);
const toast = useToast();
const draftStore = useMixGlueDraftStore();
const bluetoothRef = ref<any>(null);
const printingWorkOrderId = ref<string | null>(null);
const showRetryDialog = ref(false);
const lastPrintTotal = ref(0);
const { scanOnce, isScanning, cancelScan, scanTitle, scanNote } = useTabletBarcodeScan();

const {
  isPrinting,
  progress,
  failedItems,
  printJobContext,
  hasPendingPrint,
  pendingCount,
  clearFailedItems,
  restorePendingFromStorage,
  startPrint,
  retryFailed,
} = useMixGlueLabelBatchPrint();

const canPrintRow = (row: Partial<WorkOrderMaster>) =>
  row.mixGlueComplete === true && row.mixGlueConfirm === true;

const shouldShowConfirmActions = (row: Partial<WorkOrderMaster>) => row.isNoMixGlue !== true;

const isRowProcessing = (workOrderMasterId?: string) =>
  isScanning.value ||
  isPrinting.value ||
  (workOrderMasterId != null && printingWorkOrderId.value === workOrderMasterId);

useBackButton(10, (processNextHandler) => {
  if (isScanning.value) {
    void cancelScan();
    return;
  }
  processNextHandler();
});

export interface WorkOrderMaster {
  orderDetails: any[];
  mixChemicals: any[];
  noMixChemicals: any[];
  factoryId: string;
  workOrderMasterId: string;
  workOrderMasterName: string;
  recordStatus: string;
  createrId: string;
  createDate: string;
  updaterId: string;
  updateDate: string;
  chemicalMasterName: string;
  hourlyValidity: string;
  workOrderWeight: string;
  isMixGlue: boolean;
  isNoMixGlue: boolean;
  mixGlueComplete: boolean;
  qipConfirm: boolean;
  mixGlueConfirm: boolean;
  mixGlueStep?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: string;
  page: string;
  pageSize: string;
  totalPage: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  data: PagedResult<T>;
  success: boolean;
  message: string;
}

const isLoadingLine = ref(true);
const lineDetails = ref<Partial<WorkOrderMaster>[]>([]);
const totalRecords = ref(0);
const currentPage = ref(1);
const rowsPerPage = ref(5);

const showConfirmColumn = computed(() =>
  isLoadingLine.value || lineDetails.value.some(row => shouldShowConfirmActions(row))
);

// const showActionColumn = computed(() =>
//   lineDetails.value.some((row) => row.mixGlueStep === '2' || row.mixGlueStep === '3')
// );

const onRowClick = (event: { data: Partial<WorkOrderMaster> }) => {
  const workOrderMasterId = event.data.workOrderMasterId;
  if (workOrderMasterId) {
    router.push({
      path: '/mix-glue-management',
      query: { workOrderMasterId: workOrderMasterId }
    });
  } else {
    console.warn('workOrderMasterId is missing in the clicked row data');
  }
};

// Hàm xử lý gửi API khi bấm nút
const handleConfirm = async (workOrderMasterId: string) => {
  await draftStore.ensureHydrated();
  const draftData = draftStore.getDraft(workOrderMasterId);

  if (!draftData) {
    toast.add({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('listMixGlue.toast.draftNotFound'), life: 3000 });
    return;
  }

  if (!(await requireOnline())) return;

  try {
    const payload = {
      factoryId: authStore.user?.factoryId,
      workOrderMasterId: workOrderMasterId,
      hourlyValidity: draftData.hourlyValidity
    }
    await mixGlueApi.postMGMConfirmComplete(payload);

    toast.add({ severity: 'success', summary: t('listMixGlue.toast.success'), detail: t('listMixGlue.toast.confirmSuccess'), life: 3000 });
    fetchWorkOrders(currentPage.value, rowsPerPage.value);
  } catch (error) {
    if (notifyOfflineFromError(error)) return;
    console.error(error);
    toast.add({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('listMixGlue.toast.confirmFailed'), life: 3000 });
  }
};

const buildPrintQueue = (respData: any, row: Partial<WorkOrderMaster>) =>
  parsePrintQueueFromBe(null, respData, row);

const createWriteFn = () =>
  (tspl: string) => bluetoothRef.value?.writeTspl?.(tspl) ?? Promise.resolve(false);

const showPrintResultToast = (printedCount: number, total: number, hasFailures: boolean) => {
  if (!hasFailures) {
    toast.add({
      severity: 'success',
      summary: t('listMixGlue.toast.success'),
      detail: t('listMixGlue.toast.printSuccess', { count: printedCount }),
      life: 6000,
    });
    return;
  }

  toast.add({
    severity: printedCount > 0 ? 'warn' : 'error',
    summary: t('listMixGlue.toast.warning'),
    detail: printedCount > 0
      ? t('listMixGlue.toast.printPartial', { printed: printedCount, total })
      : t('listMixGlue.toast.printFailed'),
    life: 6000,
  });
};

const openPendingPrintDialog = () => {
  if (hasPendingPrint.value) {
    showRetryDialog.value = true;
  }
};

const handlePrint = async (row: Partial<WorkOrderMaster>) => {
  if (!canPrintRow(row) || !row.workOrderMasterId) return;
  if (isRowProcessing(row.workOrderMasterId)) return;

  const factoryId = authStore.user?.factoryId;
  if (!factoryId) {
    toast.add({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('listMixGlue.toast.factoryNotFound'),
      life: 6000,
    });
    return;
  }

  if (!bluetoothRef.value?.isConnected?.()) {
    toast.add({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.printerNotConnected'),
      life: 6000,
    });
    return;
  }

  if (!(await requireOnline())) return;

  let employeeId: string;

  if (authStore.user?.isQip) {
    employeeId = authStore.user?.employeeId?.trim() || '';
    if (!employeeId) {
      toast.add({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: t('listMixGlue.toast.invalidEmployeeCard'),
        life: 6000,
      });
      return;
    }
  } else {
    const scannedEmployeeId = await scanOnce({
      title: t('login.scanOverlayTitle'),
      note: t('listMixGlue.scan.employeeNote'),
    });

    if (!scannedEmployeeId?.trim()) {
      toast.add({
        severity: 'warn',
        summary: t('listMixGlue.toast.warning'),
        detail: t('listMixGlue.toast.scanFailed'),
        life: 6000,
      });
      return;
    }

    employeeId = scannedEmployeeId.trim();

    try {
      const validateResponse = await employeeApi.postValidateQIP({
        factoryId,
        employeeId,
      });
      const validateData = validateResponse.data;

      if (validateData?.success !== true) {
        toast.add({
          severity: 'error',
          summary: t('listMixGlue.toast.error'),
          detail: t('listMixGlue.toast.invalidEmployeeCard'),
          life: 6000,
        });
        return;
      }
    } catch (error: any) {
      console.error(error);
      toast.add({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: t('listMixGlue.toast.invalidEmployeeCard'),
        life: 6000,
      });
      return;
    }
  }

  try {
    if (
      hasPendingPrint.value &&
      printJobContext.value?.workOrderMasterId &&
      printJobContext.value.workOrderMasterId !== row.workOrderMasterId
    ) {
      toast.add({
        severity: 'warn',
        summary: t('listMixGlue.toast.warning'),
        detail: t('listMixGlue.toast.pendingReplaced'),
        life: 6000,
      });
    }

    printingWorkOrderId.value = row.workOrderMasterId;
    showRetryDialog.value = false;
    await clearFailedItems();

    const { data: woResponse } = await workOrder.getWorkOrder(factoryId, row.workOrderMasterId, 2);
    if (!woResponse?.success || !woResponse?.data) {
      toast.add({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: woResponse?.message || t('listMixGlue.toast.loadOrderFailed'),
        life: 6000,
      });
      return;
    }

    const respData = woResponse.data;
    const mixGlueMasterId = respData.mixGlueMasterId;
    if (!mixGlueMasterId) {
      toast.add({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: t('listMixGlue.toast.mixGlueIdNotFound'),
        life: 6000,
      });
      return;
    }

    const queue = buildPrintQueue(respData, row);

    if (!queue.length) {
      toast.add({
        severity: 'warn',
        summary: t('listMixGlue.toast.warning'),
        detail: t('listMixGlue.toast.noLabels'),
        life: 6000,
      });
      return;
    }

    lastPrintTotal.value = queue.length;
    const result = await startPrint(queue, createWriteFn(), factoryId, {
      workOrderMasterId: row.workOrderMasterId,
      workOrderMasterName: row.workOrderMasterName,
      confirmBy: employeeId,
      lastPrintTotal: queue.length,
    });

    showPrintResultToast(result.printedCount, queue.length, result.failedItems.length > 0);

    if (result.failedItems.length > 0) {
      showRetryDialog.value = true;
      return;
    }

    await draftStore.clearDraft(row.workOrderMasterId);
    fetchWorkOrders(currentPage.value, rowsPerPage.value);
  } catch (error: any) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: error?.response?.data?.message || t('listMixGlue.toast.printFailed'),
      life: 6000,
    });
  } finally {
    printingWorkOrderId.value = null;
  }
};

const handleRetryPrint = async () => {
  const factoryId = authStore.user?.factoryId;
  if (!factoryId) return;

  if (!bluetoothRef.value?.isConnected?.()) {
    toast.add({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.printerNotConnected'),
      life: 6000,
    });
    return;
  }

  printingWorkOrderId.value = printJobContext.value?.workOrderMasterId ?? null;
  const workOrderMasterId = printJobContext.value?.workOrderMasterId;

  try {
    const result = await retryFailed(createWriteFn(), factoryId);
    const total = printJobContext.value?.lastPrintTotal ?? lastPrintTotal.value;
    showPrintResultToast(result.printedCount, total, result.failedItems.length > 0);

    if (result.failedItems.length === 0) {
      showRetryDialog.value = false;
      lastPrintTotal.value = 0;
      if (workOrderMasterId) {
        await draftStore.clearDraft(workOrderMasterId);
        fetchWorkOrders(currentPage.value, rowsPerPage.value);
      }
    } else {
      showRetryDialog.value = true;
    }
  } finally {
    printingWorkOrderId.value = null;
  }
};

const restorePendingPrintJob = async () => {
  const restored = await restorePendingFromStorage();
  if (!restored) return;

  lastPrintTotal.value = restored.lastPrintTotal;
  toast.add({
    severity: 'info',
    summary: t('listMixGlue.toast.warning'),
    detail: t('listMixGlue.toast.pendingRestored', { count: restored.failedItems.length }),
    life: 6000,
  });
};

const fetchWorkOrders = async (page: number, pageSize: number) => {
  isLoadingLine.value = true;
  lineDetails.value = Array.from({ length: pageSize }).map(() => ({}));

  try {
    const payload = {
      factoryId: authStore.user?.factoryId,
      mixGlueCheck: true,
      page: page,
      pageSize: pageSize
    };

    const response = await workOrder.postWorkOrderList(payload);
    const resData = response.data as ApiResponse<WorkOrderMaster>;

    if (resData && resData.success) {
      lineDetails.value = resData.data.items;
      totalRecords.value = Number(resData.data.totalCount) || 0;
    } else {
      console.error("Lấy dữ liệu thất bại:", resData?.message);
      lineDetails.value = [];
      totalRecords.value = 0;
    }
  } catch (error) {
    console.error("Lỗi gọi API getWorkOrderList:", error);
    lineDetails.value = [];
    totalRecords.value = 0;
  } finally {
    isLoadingLine.value = false;
  }
};

const onPageLine = (event: any) => {
  currentPage.value = event.page + 1;
  rowsPerPage.value = event.rows;
  fetchWorkOrders(currentPage.value, rowsPerPage.value);
};

const goBack = () => router.push('/app-menu');

onIonViewWillEnter(async () => {
  await restorePendingPrintJob();
  fetchWorkOrders(currentPage.value, rowsPerPage.value);
});

onIonViewDidEnter(async () => {
  await nextTick();
  await nextTick();
  bluetoothRef.value?.initBluetooth?.();
});

onIonViewDidLeave(() => {
  if (isScanning.value) {
    void cancelScan();
  }
  bluetoothRef.value?.pauseBluetooth?.();
});
</script>

<style scoped>
.text-wrap {
  word-break: break-word;
  white-space: normal;
}

.list-mix-glue-layer--hidden {
  visibility: hidden;
}
</style>

<style>
body.barcode-scanner-active,
html.barcode-scanner-active,
ion-app.barcode-scanner-active {
  visibility: hidden;
  background: transparent !important;
  --background: transparent;
  --ion-background-color: transparent;
}

body.barcode-scanner-active .scan-camera-overlay,
html.barcode-scanner-active .scan-camera-overlay,
ion-app.barcode-scanner-active .scan-camera-overlay {
  visibility: visible;
}

body.barcode-scanner-active ion-content,
body.barcode-scanner-active .ion-page,
body.barcode-scanner-active .list-mix-glue-content {
  --background: transparent;
  background: transparent !important;
}

.scan-camera-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  visibility: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.1);
  pointer-events: auto;
}

.scan-camera-content {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.scan-camera-title {
  margin: 0 0 8px;
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.scan-camera-note {
  margin: 0 0 24px;
  max-width: 360px;
  font-size: 1.2rem;
  line-height: 1.5;
  color: #fff;
}

.scan-camera-frame {
  position: relative;
  width: min(78vw, 600px);
  height: min(52vw, 280px);
  border: 2px solid rgba(255, 255, 255, 0.88);
  border-radius: 20px;
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55);
  overflow: hidden;
}

.scan-corner {
  position: absolute;
  width: 32px;
  height: 32px;
  border: 4px solid #38bdf8;
  z-index: 2;
}

.scan-corner--tl {
  top: -2px;
  left: -2px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 18px;
}

.scan-corner--tr {
  top: -2px;
  right: -2px;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 18px;
}

.scan-corner--bl {
  bottom: -2px;
  left: -2px;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 18px;
}

.scan-corner--br {
  bottom: -2px;
  right: -2px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 18px;
}

.scan-frame-line {
  position: absolute;
  left: 8%;
  right: 8%;
  top: 18%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #38bdf8, transparent);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.85);
  animation: list-mix-glue-scan-line 2.2s ease-in-out infinite;
}

.scan-camera-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 28px 0 20px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  font-size: 1.2rem;
  backdrop-filter: blur(4px);
}

.scan-cancel-btn {
  min-width: 180px;
  height: 60px;
  margin: 28px 0 20px;
}

.scan-cancel-btn .pi,
.scan-cancel-btn .p-button-label {
  font-size: 1.2rem !important;
  color: black;
}

@keyframes list-mix-glue-scan-line {
  0% {
    top: 18%;
    opacity: 0.35;
  }

  50% {
    top: 78%;
    opacity: 1;
  }

  100% {
    top: 18%;
    opacity: 0.35;
  }
}
</style>