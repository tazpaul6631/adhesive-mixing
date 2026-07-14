<template>
  <ion-page :class="{ 'list-separate-mixed-glue--scanning': isScanning }">
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <div class="flex align-items-center justify-content-between">
          <ion-buttons slot="start">
            <ion-button @click="goBack">
              <i class="pi pi-angle-left text-xl mr-1"></i>
              <ion-title class="no-padding" style="line-height: 50px;">{{ t('listSeparateMixedGlue.pageTitle')
              }}</ion-title>
            </ion-button>
          </ion-buttons>
          <LocaleSelect device-scope="tablet" select-class="mr-4" />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding list-separate-mixed-glue-content" :scroll-events="true">
      <div class="main-container max-w-full mx-auto list-separate-page page-content-loading-host"
        :class="[pageClass, { 'list-separate-mixed-glue-layer--hidden': isScanning }]">
        <PageContentLoadingOverlay :visible="isViewEnterLoading" />
        <div class="surface-card p-0 shadow-1 border-round-xl list-separate-card">
          <div
            class="surface-100 border-round-top-xl flex align-items-center justify-content-between list-separate-card-head">
            <span class="list-separate-section-title">
              <i class="pi pi-list mr-2"></i>{{ t('listSeparateMixedGlue.sectionTitle') }}
            </span>
            <div class="flex align-items-center gap-2 list-separate-card-head-actions">
              <!-- <IconField class="list-separate-glue-filter">
                <InputIcon class="pi pi-search" />
                <InputText v-model="chemicalMasterNameFilter" type="search"
                  :placeholder="t('listSeparateMixedGlue.filter.gluePlaceholder')"
                  :aria-label="t('listSeparateMixedGlue.filter.gluePlaceholder')" fluid />
              </IconField> -->
              <div v-if="isPrinting" class="print-progress-chip">
                <i class="pi pi-spin pi-spinner" style="font-size:0.85rem"></i>
                <span>{{ progress.current }}/{{ progress.total }}</span>
              </div>
              <Button v-if="hasPendingPrint" icon="pi pi-exclamation-triangle" severity="warn" outlined size="large"
                :badge="String(pendingCount)" badgeSeverity="danger"
                :title="t('listSeparateMixedGlue.print.pendingButtonTitle', { count: pendingCount })"
                :aria-label="t('listSeparateMixedGlue.print.pendingButtonTitle', { count: pendingCount })"
                @click="openPendingPrintDialog" />
              <BluetoothPrinterStatus ref="bluetoothRef" />
            </div>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl list-separate-table-wrap">
            <DataTable :value="filteredLineDetails" lazy :totalRecords="totalRecords" :first="tableFirst"
              @page="onPageLine" scrollable :scrollHeight="tableScrollHeight"
              class="modern-table auto-columns-table" tableStyle="width: 100%; min-width: 0;" @row-click="onRowClick"
              :paginator="true" :rows="rowsPerPage" paginatorTemplate="PrevPageLink CurrentPageReport NextPageLink"
              currentPageReportTemplate="Hiển thị {first} đến {last}" selectionMode="single"
              v-model:selection="selectedItem" dataKey="workOrderMasterId">

              <template #empty>
                <div style="text-align: center; align-content: center;" :style="{ minHeight: emptyStateMinHeight }">
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

              <Column field="updaterId" :header="t('listMixGlue.columns.updater')" headerClass="dt-col-text"
                bodyClass="dt-col-text">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="70%" height="1rem" />
                  <span v-else>{{ data.updaterId }}</span>
                </template>
              </Column>

              <Column field="updateDate" :header="t('listMixGlue.columns.updateDate')" headerClass="dt-col-datetime"
                bodyClass="dt-col-datetime">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <span v-else><i class="pi pi-clock text-xs mr-1"></i>{{ data.updateDate ?
                    format.formatDate(data.updateDate) : '' }}</span>
                </template>
              </Column>

              <Column :header="t('listMixGlue.columns.qipConfirm')" :exportable="false" headerClass="dt-col-action-qip"
                bodyClass="dt-col-action-qip">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <div v-else class="flex gap-2 justify-content-center">
                    <Button severity="success" class="button-lg" :disabled="isRowPrintDisabled(data)"
                      :loading="isPrintRowLoading(data.workOrderMasterId)"
                      :title="isRowQueued(data.workOrderMasterId) ? t('listSeparateMixedGlue.print.queuedTitle') : undefined"
                      @click.stop="onPrintClick(data)">
                      <template v-if="isRowQueued(data.workOrderMasterId) && !isPrintRowLoading(data.workOrderMasterId)" #icon>
                        <i class="pi pi-clock" />
                      </template>
                      <template v-else-if="!isPrintRowLoading(data.workOrderMasterId)" #icon>
                        <i class="pi pi-print" />
                      </template>
                    </Button>
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

    <BatchPrintRetryDialog v-model:visible="showRetryDialog" :failed-items="failedItems" :loading="isPrinting"
      @retry="handleRetryPrint" />

    <Dialog v-model:visible="showPrintAuthDialog" modal :header="t('listSeparateMixedGlue.printAuthDialog.title')"
      :style="{ width: 'min(92vw, 420px)' }" :closable="false" @hide="closePrintAuthDialog">
      <div class="flex flex-column gap-3">
        <p class="m-0 text-600 line-height-3">
          {{ t('listSeparateMixedGlue.printAuthDialog.hint', { workOrderMasterName: pendingPrintRow?.workOrderMasterName ?? '' })
          }}
        </p>
        <div class="flex flex-column gap-2">
          <label for="printAuthPassword" class="font-semibold text-900">{{
            t('listSeparateMixedGlue.printAuthDialog.passwordLabel')
            }}</label>
          <div class="flex align-items-center gap-2">
            <IconField class="flex-1 w-full print-auth-password-field">
              <InputText id="printAuthPassword" v-model="printAuthPassword"
                :type="showPrintAuthPassword ? 'text' : 'password'" class="w-full"
                :placeholder="t('listSeparateMixedGlue.printAuthDialog.passwordPlaceholder')" autocomplete="off"
                :disabled="isPrintAuthSubmitting || isPrintAuthScanning" @keyup.enter="submitPrintAuthPassword" />
              <InputIcon class="password-toggle-icon pi" :class="[
                showPrintAuthPassword ? 'pi-eye-slash' : 'pi-eye',
                { 'password-toggle-icon--disabled': isPrintAuthSubmitting || isPrintAuthScanning }
              ]" @click="togglePrintAuthPassword" />
            </IconField>
            <Button icon="pi pi-qrcode" severity="success" outlined
              :title="t('listSeparateMixedGlue.printAuthDialog.scanButton')"
              :aria-label="t('listSeparateMixedGlue.printAuthDialog.scanButton')" size="large"
              :disabled="isPrintAuthSubmitting || isPrintAuthScanning" :loading="isPrintAuthScanning"
              @click="startPrintAuthScan" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" icon="pi pi-times" text severity="secondary" size="large"
          :disabled="isPrintAuthSubmitting || isPrintAuthScanning" @click="closePrintAuthDialog" />
        <Button :label="t('listSeparateMixedGlue.printAuthDialog.confirm')" icon="pi pi-check" severity="success"
          size="large" :disabled="!printAuthPassword.trim() || isPrintAuthScanning" :loading="isPrintAuthSubmitting"
          @click="submitPrintAuthPassword" />
      </template>
    </Dialog>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  onIonViewWillEnter, onIonViewDidEnter, onIonViewDidLeave, useBackButton
} from '@ionic/vue';
import { ref, computed, nextTick } from 'vue';
import { useAuthStore } from '@/store/auth';
import format from '@/mixins/format';
import workOrder from '@/api/workOrder';
import employeeApi from '@/api/employee';
import { useRouter } from 'vue-router';
import { useAppToast } from '@/composables/useAppToast';
import BluetoothPrinterStatus from '@/components/BluetoothPrinterStatus.vue';
import BatchPrintRetryDialog from '@/components/BatchPrintRetryDialog.vue';
import LocaleSelect from '@/components/LocaleSelect.vue';
import { computeLazyTableTotalRecords, parseCursorPagedMeta, useListTableFetch } from '@/composables/useListTableFetch';
import { useAppLocale } from '@/composables/useAppLocale';
import { useSeparateLabelBatchPrint } from '@/composables/useSeparateLabelBatchPrint';
import { usePrintQueue, type PrintQueueEntry, type PrintJobResult } from '@/composables/usePrintQueue';
import { useLabelPrintGapConfirm } from '@/composables/useLabelPrintGapConfirm';
import { ensureGapConfirmed, resetLabelPrintSession } from '@/services/labelPrintSession';
import { useTabletBarcodeScan } from '@/composables/useTabletBarcodeScan';
import { useMixGlueDraftStore } from '@/store/mixGlueDraft';
import { useRequireOnline } from '@/composables/useRequireOnline';
import { useTabletPageLayout } from '@/composables/useTabletPageLayout';
import { useRowActionLock } from '@/composables/useRowActionLock';
import { useViewEnterLoading } from '@/composables/useViewEnterLoading';
import PageContentLoadingOverlay from '@/components/PageContentLoadingOverlay.vue';

const router = useRouter();
const authStore = useAuthStore();
const { requireOnline, notifyOfflineFromError } = useRequireOnline();
useLabelPrintGapConfirm('listSeparateMixedGlue');
const { showToast } = useAppToast();
const draftStore = useMixGlueDraftStore();
const { t } = useAppLocale(() => 'tablet');

const {
  pageClass,
  tableScrollHeight,
  emptyStateMinHeight,
} = useTabletPageLayout({ listPage: true });

const bluetoothRef = ref<InstanceType<typeof BluetoothPrinterStatus> | null>(null);
const printingWorkOrderId = ref<string | null>(null);
const showRetryDialog = ref(false);
const lastPrintTotal = ref(0);

const { scanOnce, isScanning, cancelScan, scanTitle, scanNote } = useTabletBarcodeScan();
const { isRowActionBusy, isAnyRowBusy, lockRow, unlockRow } = useRowActionLock();
const { isViewEnterLoading, runWithViewEnterLoading } = useViewEnterLoading();

const {
  isPrinting,
  progress,
  failedItems,
  printJobContext,
  hasPendingPrint,
  pendingCount,
  clearFailedItems,
  restorePendingFromStorage,
  preparePrintBatch,
  startPrint,
  retryFailed,
} = useSeparateLabelBatchPrint();

const {
  queue: separatePrintJobQueue,
  isQueued: isRowQueued,
  isActive: isRowPrintActive,
  enqueue: enqueuePrintRow,
  clearQueue: clearPrintQueue,
  runNext: runNextPrintJob,
  continueAfterRetry: continueQueueAfterRetry,
} = usePrintQueue<Partial<WorkOrderMaster>>();

const separatePrintQueueCount = computed(() =>
  separatePrintJobQueue.value.length + (isPrinting.value ? 1 : 0)
);

const selectedItem = ref<any>(null);

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
  separateGlueComplete?: boolean;
  /** Dùng nội bộ khi đưa vào print queue — không đến từ BE. */
  _resolvedEmployeeId?: string;
  separateGlueConfirm?: boolean;
  separateGlues?: Array<{
    factoryId: string;
    separateGlueId: number;
    glueId?: number;
    bucketId: number;
    recordStatus: string;
    seq?: number;
  }>;
  noSeparateGlues?: Array<{
    factoryId: string;
    noSeparateGlueId: number;
    workOrderMasterId?: number;
    bucketId: number;
    materialCode?: number;
    recordStatus: string;
    seq?: number;
  }>;
}

export interface PagedResult<T> {
  items: T[];
  page: string;
  pageSize: string;
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
const rowsPerPage = ref(50);
const hasNextPage = ref(false);
const chemicalMasterNameFilter = ref('');
const tableFirst = computed(() => (currentPage.value - 1) * rowsPerPage.value);
const { startRequest, isStaleRequest, shouldSkipDuplicatePageLoad } = useListTableFetch();

const hasLoadedWorkOrderRows = () =>
  lineDetails.value.some((row) => row.workOrderMasterId != null && row.workOrderMasterId !== '');

/** BE xóa dòng sau in — gỡ khỏi bảng local, không fetch lại cả list. */
const printedWorkOrderIds = ref<Set<string>>(new Set());

const isRowPrintedLocally = (workOrderMasterId?: string) =>
  Boolean(workOrderMasterId && printedWorkOrderIds.value.has(String(workOrderMasterId)));

const rememberPrintedWorkOrder = (workOrderMasterId: string) => {
  const next = new Set(printedWorkOrderIds.value);
  next.add(String(workOrderMasterId));
  printedWorkOrderIds.value = next;
};

const showAlreadyPrintedToast = (row: Partial<WorkOrderMaster>) => {
  showToast({
    severity: 'warn',
    summary: t('listSeparateMixedGlue.toast.warning'),
    detail: t('listMixGlue.toast.alreadyPrinted', { name: row.chemicalMasterName ?? '' }),
    life: 6000,
  });
};

const removePrintedRowFromList = (workOrderMasterId: string) => {
  const key = String(workOrderMasterId);
  const hadRow = lineDetails.value.some((item) => String(item.workOrderMasterId) === key);
  if (!hadRow) return;

  lineDetails.value = lineDetails.value.filter((item) => String(item.workOrderMasterId) !== key);
  if (String(selectedItem.value?.workOrderMasterId) === key) {
    selectedItem.value = null;
  }

  if (lineDetails.value.length === 0) {
    void fetchWorkOrders(currentPage.value, rowsPerPage.value);
    return;
  }

  totalRecords.value = computeLazyTableTotalRecords(
    currentPage.value,
    rowsPerPage.value,
    lineDetails.value.length,
    hasNextPage.value
  );
};

const finishSeparatePrintSuccess = async (workOrderMasterId: string) => {
  rememberPrintedWorkOrder(workOrderMasterId);
  await draftStore.clearDraft(workOrderMasterId);
  removePrintedRowFromList(workOrderMasterId);
};

const filteredLineDetails = computed(() => {
  if (isLoadingLine.value) {
    return lineDetails.value;
  }

  const query = chemicalMasterNameFilter.value.trim().toLowerCase();
  if (!query) {
    return lineDetails.value;
  }

  return lineDetails.value.filter((row) =>
    String(row.chemicalMasterName ?? '').toLowerCase().includes(query)
  );
});

useBackButton(10, (processNextHandler) => {
  if (isScanning.value) {
    void cancelScan();
    return;
  }
  if (separatePrintQueueCount.value > 0) {
    showToast({
      severity: 'warn',
      summary: t('listSeparateMixedGlue.toast.warning'),
      detail: t('listSeparateMixedGlue.toast.printQueueBackBlocked', { count: separatePrintQueueCount.value }),
      life: 6000,
    });
    return;
  }
  processNextHandler();
});

const onRowClick = (event: { data: Partial<WorkOrderMaster> }) => {
  const workOrderMasterId = event.data.workOrderMasterId;
  if (workOrderMasterId) {
    router.push({
      path: '/separate-mixed-glue-management',
      query: {
        workOrderMasterId: String(workOrderMasterId),
        ...(event.data.separateGlueComplete ? { separateGlueComplete: 'true' } : {}),
      },
    });
  } else {
    console.warn('workOrderMasterId is missing in the clicked row data');
  }
};

const fetchWorkOrders = async (page: number, pageSize: number) => {
  const requestId = startRequest();
  isLoadingLine.value = true;
  lineDetails.value = Array.from({ length: pageSize }).map(() => ({}));

  try {
    const payload = {
      factoryId: authStore.user?.factoryId,
      departmentId: authStore.user?.departmentId,
      separateGlueCheck: true,
      page: page,
      pageSize: pageSize,
    };

    const response = await workOrder.postWorkOrderList(payload);
    if (isStaleRequest(requestId)) return;

    const resData = response.data as ApiResponse<WorkOrderMaster>;

    if (resData && resData.success) {
      printedWorkOrderIds.value = new Set();
      const items = resData.data.items;
      const meta = parseCursorPagedMeta(resData.data, page, pageSize);
      lineDetails.value = items;
      currentPage.value = meta.page;
      rowsPerPage.value = meta.pageSize;
      hasNextPage.value = meta.hasNextPage;
      totalRecords.value = computeLazyTableTotalRecords(
        meta.page,
        meta.pageSize,
        items.length,
        meta.hasNextPage
      );
    } else {
      console.error("Lấy dữ liệu thất bại:", resData?.message);
      lineDetails.value = [];
      totalRecords.value = 0;
    }
  } catch (error) {
    if (isStaleRequest(requestId)) return;
    console.error("Lỗi gọi API getWorkOrderList:", error);
    lineDetails.value = [];
    totalRecords.value = 0;
  } finally {
    if (!isStaleRequest(requestId)) {
      isLoadingLine.value = false;
    }
  }
};

const onPageLine = (event: { page: number; rows: number }) => {
  if (shouldSkipDuplicatePageLoad({
    eventPage: event.page,
    eventRows: event.rows,
    currentPage: currentPage.value,
    rowsPerPage: rowsPerPage.value,
    isLoading: isLoadingLine.value,
    hasData: hasLoadedWorkOrderRows(),
  })) {
    return;
  }

  currentPage.value = event.page + 1;
  rowsPerPage.value = event.rows;
  void fetchWorkOrders(currentPage.value, rowsPerPage.value);
};

const goBack = () => {
  if (separatePrintQueueCount.value > 0) {
    showToast({
      severity: 'warn',
      summary: t('listSeparateMixedGlue.toast.warning'),
      detail: t('listSeparateMixedGlue.toast.printQueueBackBlocked', { count: separatePrintQueueCount.value }),
      life: 6000,
    });
    return;
  }
  router.push('/app-menu');
};

const isPrintRowLoading = (workOrderMasterId?: string) =>
  isRowActionBusy(workOrderMasterId, 'print') ||
  Boolean(workOrderMasterId && printingWorkOrderId.value === workOrderMasterId && isPrinting.value);

const isRowPrintProcessing = (workOrderMasterId?: string) =>
  isRowActionBusy(workOrderMasterId, 'print') ||
  (workOrderMasterId != null && printingWorkOrderId.value === workOrderMasterId);

const isRowProcessing = (workOrderMasterId?: string) =>
  isScanning.value ||
  isRowPrintProcessing(workOrderMasterId) ||
  isAnyRowBusy();

const isRowPrintDisabled = (row: Partial<WorkOrderMaster>): boolean => {
  if (row.separateGlueComplete === false && row.isNoMixGlue === true) return true;
  if (row.separateGlueComplete === false && row.isNoMixGlue === false) return true;
  if (isRowProcessing(row.workOrderMasterId)) return true;
  if (isRowQueued(row.workOrderMasterId)) return true;
  return false;
};

const createWriteFn = () =>
  (tspl: string) => bluetoothRef.value?.writeTspl?.(tspl) ?? Promise.resolve(false);

const createPrintRuntimeOptions = () => ({
  isConnected: () => bluetoothRef.value?.isConnected?.() ?? false,
});

const ensurePrinterReady = async () => {
  if (await bluetoothRef.value?.verifyHardwareConnected?.()) {
    return true;
  }
  await bluetoothRef.value?.connectForPrint?.();
  return (await bluetoothRef.value?.verifyHardwareConnected?.()) === true;
};

const hasPrintFailures = (
  result: { ok: boolean; printedCount: number; failedItems: unknown[] },
  total: number
) => !result.ok || result.failedItems.length > 0 || result.printedCount < total;

const showPrintResultToast = (printedCount: number, total: number, hasFailures: boolean) => {
  if (!hasFailures) {
    showToast({
      severity: 'success',
      summary: t('listSeparateMixedGlue.toast.success'),
      detail: t('listSeparateMixedGlue.toast.printSuccess', { count: printedCount }),
      life: 3000,
    });
    return;
  }

  showToast({
    severity: printedCount > 0 ? 'warn' : 'error',
    summary: t('listSeparateMixedGlue.toast.warning'),
    detail: printedCount > 0
      ? t('listSeparateMixedGlue.toast.printPartial', { printed: printedCount, total })
      : t('listSeparateMixedGlue.toast.printFailed'),
    life: 6000,
  });
};

const openPendingPrintDialog = () => {
  if (hasPendingPrint.value) {
    showRetryDialog.value = true;
  }
};

const showPrintAuthDialog = ref(false);
const printAuthPassword = ref('');
const showPrintAuthPassword = ref(false);
const pendingPrintRow = ref<Partial<WorkOrderMaster> | null>(null);
const isPrintAuthSubmitting = ref(false);
const isPrintAuthScanning = ref(false);

const togglePrintAuthPassword = () => {
  if (isPrintAuthSubmitting.value || isPrintAuthScanning.value) return;
  showPrintAuthPassword.value = !showPrintAuthPassword.value;
};

const closePrintAuthDialog = () => {
  if (isPrintAuthSubmitting.value || isPrintAuthScanning.value) return;
  showPrintAuthDialog.value = false;
  pendingPrintRow.value = null;
  printAuthPassword.value = '';
  showPrintAuthPassword.value = false;
};

const onPrintClick = (row: Partial<WorkOrderMaster>) => {
  if (!row.workOrderMasterId) return;
  if (isRowPrintDisabled(row)) return;
  if (isRowPrintedLocally(row.workOrderMasterId)) {
    showAlreadyPrintedToast(row);
    return;
  }

  if (hasPendingPrint.value) {
    showToast({
      severity: 'warn',
      summary: t('listSeparateMixedGlue.toast.warning'),
      detail: t('listSeparateMixedGlue.toast.pendingExists'),
      life: 5000,
    });
    return;
  }

  pendingPrintRow.value = row;
  printAuthPassword.value = '';
  showPrintAuthPassword.value = false;
  showPrintAuthDialog.value = true;
};

const enqueuePrintWithEmployee = async (row: Partial<WorkOrderMaster>, employeeId: string) => {
  if (!row.workOrderMasterId || !employeeId) return;

  if (!lockRow(row.workOrderMasterId, 'print')) return;
  printingWorkOrderId.value = row.workOrderMasterId;

  let enqueued = false;
  try {
    const factoryId = authStore.user?.factoryId;
    if (!factoryId) {
      showToast({
        severity: 'error',
        summary: t('listSeparateMixedGlue.toast.error'),
        detail: t('listSeparateMixedGlue.toast.factoryNotFound'),
        life: 6000,
      });
      return;
    }

    if (!(await ensurePrinterReady())) {
      showToast({
        severity: 'warn',
        summary: t('listSeparateMixedGlue.toast.warning'),
        detail: t('listSeparateMixedGlue.toast.printerNotConnected'),
        life: 6000,
      });
      return;
    }

    if (!(await requireOnline())) return;

    const rowWithEmployee = { ...row, _resolvedEmployeeId: employeeId };

    const isFirstJob = !isPrinting.value && !isRowPrintActive(row.workOrderMasterId);
    enqueuePrintRow(rowWithEmployee as Partial<WorkOrderMaster>);
    enqueued = true;

    if (isFirstJob) {
      void runNextPrintJob(executePrintJob);
    }
  } finally {
    unlockRow();
    if (!enqueued) {
      printingWorkOrderId.value = null;
    }
  }
};

const proceedPrintAfterAuth = async (employeeId: string) => {
  const row = pendingPrintRow.value;
  showPrintAuthDialog.value = false;
  pendingPrintRow.value = null;
  printAuthPassword.value = '';
  showPrintAuthPassword.value = false;
  if (!row) return;
  await enqueuePrintWithEmployee(row, employeeId);
};

const submitPrintAuthPassword = async () => {
  const row = pendingPrintRow.value;
  const password = printAuthPassword.value.trim();
  if (!row || !password || isPrintAuthSubmitting.value) return;

  const factoryId = authStore.user?.factoryId;
  if (!factoryId) {
    showToast({
      severity: 'error',
      summary: t('listSeparateMixedGlue.toast.error'),
      detail: t('listSeparateMixedGlue.toast.factoryNotFound'),
      life: 6000,
    });
    return;
  }

  if (!(await requireOnline())) return;

  isPrintAuthSubmitting.value = true;
  try {
    const { data } = await employeeApi.postValidatePasswordQIP({
      factoryId,
      password,
    });

    if (data?.success !== true) {
      showToast({
        severity: 'error',
        summary: t('listSeparateMixedGlue.toast.error'),
        detail: data?.message || t('listSeparateMixedGlue.toast.invalidEmployeeCard'),
        life: 6000,
      });
      return;
    }

    const employeeId = String(data?.data ?? '').trim();
    if (!employeeId) {
      showToast({
        severity: 'error',
        summary: t('listSeparateMixedGlue.toast.error'),
        detail: data?.message || t('listSeparateMixedGlue.toast.invalidEmployeeCard'),
        life: 6000,
      });
      return;
    }

    await proceedPrintAfterAuth(employeeId);
  } catch (error: any) {
    console.error(error);
    showToast({
      severity: 'error',
      summary: t('listSeparateMixedGlue.toast.error'),
      detail: error?.response?.data?.message || t('listSeparateMixedGlue.toast.invalidEmployeeCard'),
      life: 6000,
    });
  } finally {
    isPrintAuthSubmitting.value = false;
  }
};

const startPrintAuthScan = async () => {
  const row = pendingPrintRow.value;
  if (!row || isPrintAuthScanning.value || isPrintAuthSubmitting.value) return;

  const factoryId = authStore.user?.factoryId;
  if (!factoryId) {
    showToast({
      severity: 'error',
      summary: t('listSeparateMixedGlue.toast.error'),
      detail: t('listSeparateMixedGlue.toast.factoryNotFound'),
      life: 6000,
    });
    return;
  }

  if (!(await requireOnline())) return;

  isPrintAuthScanning.value = true;
  showPrintAuthDialog.value = false;

  try {
    const scannedEmployeeId = await scanOnce({
      title: t('login.scanOverlayTitle'),
      note: t('listSeparateMixedGlue.scan.employeeNote'),
    });

    if (!scannedEmployeeId?.trim()) {
      showToast({
        severity: 'warn',
        summary: t('listSeparateMixedGlue.toast.warning'),
        detail: t('listSeparateMixedGlue.toast.scanFailed'),
        life: 6000,
      });
      showPrintAuthDialog.value = true;
      return;
    }

    const employeeId = scannedEmployeeId.trim();
    const { data } = await employeeApi.postValidateQIP({
      factoryId,
      employeeId,
    });

    if (data?.success !== true) {
      showToast({
        severity: 'error',
        summary: t('listSeparateMixedGlue.toast.error'),
        detail: data?.message || t('listSeparateMixedGlue.toast.invalidEmployeeCard'),
        life: 6000,
      });
      showPrintAuthDialog.value = true;
      return;
    }

    const resolvedId = String(data?.data ?? employeeId).trim() || employeeId;
    await proceedPrintAfterAuth(resolvedId);
  } catch (error: any) {
    console.error(error);
    showToast({
      severity: 'error',
      summary: t('listSeparateMixedGlue.toast.error'),
      detail: error?.response?.data?.message || t('listSeparateMixedGlue.toast.invalidEmployeeCard'),
      life: 6000,
    });
    showPrintAuthDialog.value = true;
  } finally {
    isPrintAuthScanning.value = false;
  }
};

/**
 * Thực sự chạy 1 job in: gọi API fetch tem → in tuần tự.
 * Trả PrintJobResult { success, labelCount } để queue tính delay giữa 2 đơn.
 */
const executePrintJob = async (entry: PrintQueueEntry<Partial<WorkOrderMaster>>): Promise<PrintJobResult> => {
  const row = entry.row;
  const factoryId = authStore.user?.factoryId;
  if (!factoryId || !row.workOrderMasterId) return { success: false };

  const isNoMixGlue = row.isNoMixGlue === true;
  const employeeId = row._resolvedEmployeeId as string;

  printingWorkOrderId.value = row.workOrderMasterId;
  showRetryDialog.value = false;
  await clearFailedItems();

  try {
    const printQueue = await preparePrintBatch({
      workOrderMasterId: row.workOrderMasterId,
      isNoMixGlue,
      confirmBy: employeeId,
      factoryId,
      workOrderMasterName: row.workOrderMasterName,
      chemicalMasterName: row.chemicalMasterName,
      separateGlues: row.separateGlues,
      noSeparateGlues: row.noSeparateGlues,
      allowPagedQueryFallback: false,
    });

    if (!printQueue.length) {
      showToast({ severity: 'warn', summary: t('listSeparateMixedGlue.toast.warning'), detail: t('listSeparateMixedGlue.toast.noLabels'), life: 6000 });
      printingWorkOrderId.value = null;
      return { success: true, labelCount: 0 };
    }

    lastPrintTotal.value = printQueue.length;
    const result = await startPrint(printQueue, createWriteFn(), factoryId, {
      workOrderMasterId: row.workOrderMasterId,
      workOrderMasterName: row.workOrderMasterName,
      confirmBy: employeeId,
      isNoMixGlue,
      lastPrintTotal: printQueue.length,
    }, createPrintRuntimeOptions());

    const printFailed = hasPrintFailures(result, printQueue.length);
    showPrintResultToast(result.printedCount, printQueue.length, printFailed);

    if (printFailed) {
      await ensureGapConfirmed();
      showRetryDialog.value = true;
      printingWorkOrderId.value = null;
      return { success: false, labelCount: printQueue.length };
    }

    await finishSeparatePrintSuccess(row.workOrderMasterId);
    printingWorkOrderId.value = null;
    return { success: true, labelCount: printQueue.length };
  } catch (error: any) {
    console.error(error);
    showToast({ severity: 'error', summary: t('listSeparateMixedGlue.toast.error'), detail: error?.response?.data?.message || error?.message || t('listSeparateMixedGlue.toast.printFailed'), life: 6000 });
    printingWorkOrderId.value = null;
    return { success: false };
  }
};

const handleRetryPrint = async () => {
  const factoryId = authStore.user?.factoryId;
  if (!factoryId) return;

  if (!(await ensureGapConfirmed())) return;

  if (!(await ensurePrinterReady())) {
    showToast({ severity: 'warn', summary: t('listSeparateMixedGlue.toast.warning'), detail: t('listSeparateMixedGlue.toast.printerNotConnected'), life: 6000 });
    return;
  }

  printingWorkOrderId.value = printJobContext.value?.workOrderMasterId ?? null;
  const workOrderMasterId = printJobContext.value?.workOrderMasterId;

  try {
    const result = await retryFailed(createWriteFn(), factoryId, createPrintRuntimeOptions());
    const total = printJobContext.value?.lastPrintTotal ?? lastPrintTotal.value;
    const printFailed = hasPrintFailures(result, total);
    showPrintResultToast(result.printedCount, total, printFailed);

    if (!printFailed) {
      showRetryDialog.value = false;
      lastPrintTotal.value = 0;
      if (workOrderMasterId) {
        await finishSeparatePrintSuccess(workOrderMasterId);
      }
      // Tiếp tục queue còn lại sau retry thành công
      continueQueueAfterRetry(executePrintJob);
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
  showRetryDialog.value = true;
  showToast({
    severity: 'info',
    summary: t('listSeparateMixedGlue.toast.warning'),
    detail: t('listSeparateMixedGlue.toast.pendingRestored', { count: restored.failedItems.length }),
    life: 6000,
  });
};

onIonViewWillEnter(() => {
  currentPage.value = 1;
  resetLabelPrintSession();
  clearPrintQueue();
  void runWithViewEnterLoading(async () => {
    await restorePendingPrintJob();
    await fetchWorkOrders(1, rowsPerPage.value);
  });
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

.page-content-loading-host {
  position: relative;
  min-height: 12rem;
}

.list-separate-page {
  width: 100%;
}

.list-separate-section-title {
  font-weight: 700;
  color: var(--text-color-secondary);
  font-size: 1.2rem;
}

.list-separate-table-wrap {
  width: 100%;
  max-width: 100%;
}

/* 8.7" — layout trang (DataTable dùng theme/datatable.css) */
.tablet-page--inch87.list-separate-page {
  padding: 0.5rem 0.625rem;
}

.tablet-page--inch87 .list-separate-card-head {
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.list-separate-card-head-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.print-progress-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.print-auth-password-field {
  width: 100%;
}

.password-toggle-icon {
  cursor: pointer;
  color: #64748b;
  transition: color 0.2s ease;
}

.password-toggle-icon:hover {
  color: #317af0;
}

.password-toggle-icon--disabled {
  cursor: not-allowed;
  opacity: 0.45;
  pointer-events: none;
}

.list-separate-glue-filter {
  min-width: 10rem;
  max-width: 14rem;
}

.tablet-page--inch11 .list-separate-glue-filter {
  min-width: 12rem;
  max-width: 18rem;
}

/* 11.0" — layout trang */
.tablet-page--inch11.list-separate-page {
  padding: 0.875rem 1.125rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.tablet-page--inch11 .list-separate-card-head {
  padding: 0.875rem 1rem;
  gap: 0.75rem;
}

.list-separate-mixed-glue-layer--hidden {
  visibility: hidden;
}

.p-button .p-badge {
  height: 0 !important;
  min-width: none !important;
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
body.barcode-scanner-active .list-separate-mixed-glue-content {
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
  animation: list-separate-mixed-glue-scan-line 2.2s ease-in-out infinite;
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

@keyframes list-separate-mixed-glue-scan-line {
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