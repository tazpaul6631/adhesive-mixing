<template>
  <ion-page :class="{ 'list-mix-glue--scanning': isScanning }">
    <div class="no-mix-icon-preload" aria-hidden="true">
      <BsPaintBucket />
      <BsBucket />
    </div>
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
      <div class="main-container max-w-full mx-auto list-mix-glue-page"
        :class="[pageClass, { 'list-mix-glue-layer--hidden': isScanning }]">
        <div class="surface-card p-0 shadow-1 border-round-xl list-mix-glue-card">
          <div
            class="surface-100 border-round-top-xl flex align-items-center justify-content-between list-mix-glue-card-head">
            <span class="list-mix-glue-section-title">
              <i class="pi pi-list mr-2"></i>{{ t('listMixGlue.sectionTitle') }}
            </span>
            <div class="flex align-items-center gap-2">
              <IconField class="list-mix-glue-filter">
                <InputIcon class="pi pi-search" />
                <InputText v-model="chemicalMasterNameFilter" type="search"
                  :placeholder="t('listMixGlue.filter.gluePlaceholder')"
                  :aria-label="t('listMixGlue.filter.gluePlaceholder')" fluid />
              </IconField>
              <Button v-if="hasPendingPrint" icon="pi pi-exclamation-triangle" severity="warn" outlined size="large"
                :badge="String(pendingCount)" badgeSeverity="danger"
                :title="t('listMixGlue.print.pendingButtonTitle', { count: pendingCount })"
                :aria-label="t('listMixGlue.print.pendingButtonTitle', { count: pendingCount })"
                @click="openPendingPrintDialog" />
              <BluetoothPrinterStatus ref="bluetoothRef" />
            </div>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl list-mix-glue-table-wrap">
            <DataTable :value="filteredLineDetails" lazy :totalRecords="totalRecords" @page="onPageLine" scrollable
              :scrollHeight="tableScrollHeight" stripedRows class="modern-table auto-columns-table"
              tableStyle="width: 100%; min-width: 0;" @row-click="onRowClick" :paginator="true" :rows="rowsPerPage"
              :rowsPerPageOptions="[10, 20, 50]"
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
              currentPageReportTemplate="Hiển thị {first} đến {last} /tổng {totalRecords}" selectionMode="single"
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

              <Column :header="t('listMixGlue.columns.glueConfirm')" :exportable="false"
                headerClass="dt-col-action-glue" bodyClass="dt-col-action-glue">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <div v-else-if="shouldShowConfirmActions(data)" class="flex justify-content-center">
                    <Button :disabled="data.mixGlueStep !== '2' || isRowProcessing(data.workOrderMasterId)"
                      icon="pi pi-check-circle" severity="success" class="button-lg"
                      :title="t('listMixGlue.columns.glueConfirm')" :aria-label="t('listMixGlue.columns.glueConfirm')"
                      @click.stop="handleConfirm(data.workOrderMasterId)" />
                  </div>
                </template>
              </Column>

              <Column :header="t('listMixGlue.columns.qipConfirm')" :exportable="false" headerClass="dt-col-action-qip"
                bodyClass="dt-col-action-qip">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <div v-else class="flex justify-content-center">
                    <Button :disabled="isPrintRowDisabled(data)" icon="pi pi-print"
                      :severity="getPrintButtonSeverity(data)" class="button-lg"
                      :title="t('listMixGlue.columns.qipConfirm')" :aria-label="t('listMixGlue.columns.qipConfirm')"
                      @click.stop="handlePrint(data)" />
                  </div>
                </template>
              </Column>

              <Column :header="t('listMixGlue.columns.noMixConfirm')" :exportable="false"
                headerClass="dt-col-action-glue" bodyClass="dt-col-action-glue">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <div v-else class="flex justify-content-center">
                    <Button :severity="getNoMixConfirmSeverity(data)"
                      :disabled="!canClickNoMixConfirmRow(data) || isRowProcessing(data.workOrderMasterId)"
                      class="button-lg no-mix-confirm-btn" :title="getNoMixConfirmTitle(data)"
                      :aria-label="getNoMixConfirmTitle(data)" @click.stop="handleNoMixConfirm(data)">
                      <template #icon>
                        <span class="no-mix-confirm-btn__icon">
                          <BsPaintBucket v-show="isNoMixConfirmGreen(data)" />
                          <BsBucket v-show="!isNoMixConfirmGreen(data)" />
                        </span>
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
import { useAppToast } from '@/composables/useAppToast';
import { useMixGlueDraftStore } from '@/store/mixGlueDraft';
import mixGlueApi from '@/api/mixGlue';
import employeeApi from '@/api/employee';
import BluetoothPrinterStatus from '@/components/BluetoothPrinterStatus.vue';
import BatchPrintProgressOverlay from '@/components/BatchPrintProgressOverlay.vue';
import BatchPrintRetryDialog from '@/components/BatchPrintRetryDialog.vue';
import { useTabletBarcodeScan } from '@/composables/useTabletBarcodeScan';
import { parsePrintQueueFromBe } from '@/services/mixGlueLabelPrint';
import { useMixGlueLabelBatchPrint } from '@/composables/useMixGlueLabelBatchPrint';
import { useSeparateLabelBatchPrint } from '@/composables/useSeparateLabelBatchPrint';
import LocaleSelect from '@/components/LocaleSelect.vue';
import { useListTableFetch } from '@/composables/useListTableFetch';
import { useAppLocale } from '@/composables/useAppLocale';
import { useRequireOnline } from '@/composables/useRequireOnline';
import { useTabletPageLayout } from '@/composables/useTabletPageLayout';
import { BsBucket, BsPaintBucket } from '@kalimahapps/vue-icons/bs';

const router = useRouter();
const authStore = useAuthStore();
const { t } = useAppLocale(() => 'tablet');
const { requireOnline, notifyOfflineFromError } = useRequireOnline();

const {
  pageClass,
  tableScrollHeight,
  emptyStateMinHeight,
} = useTabletPageLayout({ listPage: true });

const selectedItem = ref<any>(null);
const { showToast } = useAppToast();
const draftStore = useMixGlueDraftStore();
const bluetoothRef = ref<any>(null);
const printingWorkOrderId = ref<string | null>(null);
const showRetryDialog = ref(false);
const lastPrintTotal = ref(0);
const printFlowKind = ref<'mix' | 'separate' | null>(null);
/** Giữ trạng thái đã in trong session — không phụ thuộc BE trả qipConfirm ngay sau in. */
const printedWorkOrderIds = ref<Set<string>>(new Set());
const { scanOnce, isScanning, cancelScan, scanTitle, scanNote } = useTabletBarcodeScan();

const {
  isPrinting: isMixPrinting,
  progress: mixProgress,
  failedItems: mixFailedItems,
  printJobContext: mixPrintJobContext,
  hasPendingPrint: hasMixPendingPrint,
  pendingCount: mixPendingCount,
  clearFailedItems: clearMixFailedItems,
  restorePendingFromStorage: restoreMixPendingFromStorage,
  startPrint: startMixPrint,
  retryFailed: retryMixFailed,
} = useMixGlueLabelBatchPrint();

const {
  isPrinting: isSeparatePrinting,
  progress: separateProgress,
  failedItems: separateFailedItems,
  printJobContext: separatePrintJobContext,
  hasPendingPrint: hasSeparatePendingPrint,
  pendingCount: separatePendingCount,
  clearFailedItems: clearSeparateFailedItems,
  restorePendingFromStorage: restoreSeparatePendingFromStorage,
  preparePrintBatch,
  startPrint: startSeparatePrint,
  retryFailed: retrySeparateFailed,
} = useSeparateLabelBatchPrint();

const isPrinting = computed(() => isMixPrinting.value || isSeparatePrinting.value);
const progress = computed(() =>
  printFlowKind.value === 'separate' ? separateProgress.value : mixProgress.value);
const failedItems = computed(() =>
  printFlowKind.value === 'separate' ? separateFailedItems.value : mixFailedItems.value);
const printJobContext = computed(() =>
  printFlowKind.value === 'separate' ? separatePrintJobContext.value : mixPrintJobContext.value);
const hasPendingPrint = computed(() => hasMixPendingPrint.value || hasSeparatePendingPrint.value);
const pendingCount = computed(() => {
  if (printFlowKind.value === 'separate' || hasSeparatePendingPrint.value) {
    return separatePendingCount.value;
  }
  return mixPendingCount.value;
});

const canPrintRow = (row: Partial<WorkOrderMaster>) =>
  row.mixGlueComplete === true && row.mixGlueConfirm === true;

const resolveIsSeparateGlue = (row: Partial<WorkOrderMaster>) => {
  if (row.isSeparateGlue === true) return true;
  if (row.isSeparateGlue === false) return false;
  return true;
};

/** isSeparateGlue = true → xanh (chiết); false → đỏ (không chiết). */
const isNoMixConfirmGreen = (row: Partial<WorkOrderMaster>) => resolveIsSeparateGlue(row);

const mapWorkOrderListItem = (item: Record<string, unknown>): Partial<WorkOrderMaster> => {
  const raw = item.isSeparateGlue ?? item.IsSeparateGlue;
  let isSeparateGlue: boolean | undefined;
  if (raw === true || raw === 'true') isSeparateGlue = true;
  else if (raw === false || raw === 'false') isSeparateGlue = false;
  else isSeparateGlue = true;

  const rawQipConfirm = item.qipConfirm ?? item.QipConfirm;
  const qipConfirm = rawQipConfirm === true || rawQipConfirm === 'true';

  return {
    ...(item as Partial<WorkOrderMaster>),
    isSeparateGlue,
    qipConfirm,
  };
};

const canClickNoMixConfirmRow = (row: Partial<WorkOrderMaster>) => row.mixGlueStep === '3';

const getNoMixConfirmSeverity = (row: Partial<WorkOrderMaster>) =>
  isNoMixConfirmGreen(row) ? 'success' : 'danger';

const getNoMixConfirmTitle = (row: Partial<WorkOrderMaster>) =>
  isNoMixConfirmGreen(row)
    ? t('listMixGlue.columns.separateConfirm')
    : t('listMixGlue.columns.noSeparateConfirm');

const isPrintRowDisabled = (row: Partial<WorkOrderMaster>) => {
  if (isRowPrintProcessing(row.workOrderMasterId)) {
    return true;
  }
  if (isRowQipPrinted(row)) {
    return false;
  }
  if (row.mixGlueStep !== '3' || !canPrintRow(row)) {
    return true;
  }
  if (row.isNoMixGlue === true && isNoMixConfirmGreen(row)) {
    return true;
  }
  return false;
};

const isRowQipPrinted = (row: Partial<WorkOrderMaster>) =>
  row.qipConfirm === true ||
  Boolean(row.workOrderMasterId && printedWorkOrderIds.value.has(row.workOrderMasterId));

/** qipConfirm = false → xanh; true → vàng. */
const getPrintButtonSeverity = (row: Partial<WorkOrderMaster>) =>
  row.qipConfirm === true ? 'warn' : 'success';

const rememberPrintedWorkOrder = (workOrderMasterId: string) => {
  const next = new Set(printedWorkOrderIds.value);
  next.add(workOrderMasterId);
  printedWorkOrderIds.value = next;
};

const markRowQipPrinted = (workOrderMasterId: string) => {
  rememberPrintedWorkOrder(workOrderMasterId);
  const index = lineDetails.value.findIndex((item) => item.workOrderMasterId === workOrderMasterId);
  if (index < 0) return;
  lineDetails.value[index] = {
    ...lineDetails.value[index],
    qipConfirm: true,
  };
};

const applyPrintedStateToListItem = (item: Partial<WorkOrderMaster>): Partial<WorkOrderMaster> => {
  if (!item.workOrderMasterId) return item;
  if (item.qipConfirm === true) {
    rememberPrintedWorkOrder(item.workOrderMasterId);
  }
  if (printedWorkOrderIds.value.has(item.workOrderMasterId)) {
    return { ...item, qipConfirm: true };
  }
  return item;
};

const showAlreadyPrintedToast = (row: Partial<WorkOrderMaster>) => {
  showToast({
    severity: 'warn',
    summary: t('listMixGlue.toast.warning'),
    detail: t('listMixGlue.toast.alreadyPrinted', { name: row.chemicalMasterName }),
    life: 6000,
  });
};

const shouldShowConfirmActions = (row: Partial<WorkOrderMaster>) => row.isNoMixGlue !== true;

const isRowPrintProcessing = (workOrderMasterId?: string) =>
  isMixPrinting.value ||
  isSeparatePrinting.value ||
  (workOrderMasterId != null && printingWorkOrderId.value === workOrderMasterId);

const isRowProcessing = (workOrderMasterId?: string) =>
  isScanning.value || isRowPrintProcessing(workOrderMasterId);

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
  isSeparateGlue?: boolean;
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
const rowsPerPage = ref(10);
const chemicalMasterNameFilter = ref('');
const { startRequest, isStaleRequest, shouldSkipDuplicatePageLoad } = useListTableFetch();

const hasLoadedWorkOrderRows = () =>
  lineDetails.value.some((row) => row.workOrderMasterId != null && row.workOrderMasterId !== '');

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
    showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('listMixGlue.toast.draftNotFound'), life: 6000 });
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

    showToast({ severity: 'success', summary: t('listMixGlue.toast.success'), detail: t('listMixGlue.toast.confirmSuccess'), life: 3000 });
    fetchWorkOrders(currentPage.value, rowsPerPage.value);
  } catch (error) {
    if (notifyOfflineFromError(error)) return;
    console.error(error);
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('listMixGlue.toast.confirmFailed'), life: 6000 });
  }
};

const toggleNoMixConfirmRowState = (workOrderMasterId: string) => {
  const index = lineDetails.value.findIndex((item) => item.workOrderMasterId === workOrderMasterId);
  if (index < 0) return;
  const current = lineDetails.value[index];
  lineDetails.value[index] = {
    ...current,
    isSeparateGlue: !resolveIsSeparateGlue(current),
  };
};

const handleNoMixConfirm = async (row: Partial<WorkOrderMaster>) => {
  const workOrderMasterId = row.workOrderMasterId;
  if (!workOrderMasterId || !canClickNoMixConfirmRow(row)) return;

  const factoryId = authStore.user?.factoryId;
  const updaterId = authStore.user?.employeeId?.trim() || '';

  if (!factoryId) {
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('listMixGlue.toast.factoryNotFound'),
    });
    return;
  }

  if (!updaterId) {
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('listMixGlue.toast.scanFailed'),
    });
    return;
  }

  if (!(await requireOnline())) return;

  const wasGreen = isNoMixConfirmGreen(row);

  try {
    const payload = {
      factoryId,
      workOrderMasterId,
      updaterId,
    };
    const { data } = await workOrder.postConfirmNoSeparate(payload);

    if (data?.success === false) {
      throw new Error(data?.message || t('listMixGlue.toast.noMixConfirmFailed'));
    }

    toggleNoMixConfirmRowState(workOrderMasterId);
    showToast({
      severity: 'success',
      summary: t('listMixGlue.toast.success'),
      detail: wasGreen
        ? t('listMixGlue.toast.noMixConfirmSuccess')
        : t('listMixGlue.toast.separateConfirmSuccess'),
    });
  } catch (error) {
    if (notifyOfflineFromError(error)) return;
    console.error(error);
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('listMixGlue.toast.noMixConfirmFailed'),
    });
  }
};

const buildPrintQueue = (respData: any, row: Partial<WorkOrderMaster>) =>
  parsePrintQueueFromBe(null, respData, row);

const createWriteFn = () =>
  (tspl: string) => bluetoothRef.value?.writeTspl?.(tspl) ?? Promise.resolve(false);

const createPrintRuntimeOptions = () => ({
  isConnected: () => bluetoothRef.value?.isConnected?.() ?? false,
});

const hasPrintFailures = (
  result: { ok: boolean; printedCount: number; failedItems: unknown[] },
  total: number
) => !result.ok || result.failedItems.length > 0 || result.printedCount < total;

const ensurePrinterReady = async () => {
  if (await bluetoothRef.value?.verifyHardwareConnected?.()) {
    return true;
  }
  await bluetoothRef.value?.connectForPrint?.();
  return (await bluetoothRef.value?.verifyHardwareConnected?.()) === true;
};

const showPrintResultToast = (printedCount: number, total: number, hasFailures: boolean) => {
  if (!hasFailures) {
    showToast({
      severity: 'success',
      summary: t('listMixGlue.toast.success'),
      detail: t('listMixGlue.toast.printSuccess', { count: printedCount }),
      life: 3000,
    });
    return;
  }

  showToast({
    severity: printedCount > 0 ? 'warn' : 'error',
    summary: t('listMixGlue.toast.warning'),
    detail: printedCount > 0
      ? t('listMixGlue.toast.printPartial', { printed: printedCount, total })
      : t('listMixGlue.toast.printFailed'),
    life: 6000,
  });
};

const openPendingPrintDialog = () => {
  if (hasSeparatePendingPrint.value) {
    printFlowKind.value = 'separate';
  } else if (hasMixPendingPrint.value) {
    printFlowKind.value = 'mix';
  }
  if (hasPendingPrint.value) {
    showRetryDialog.value = true;
  }
};

const resolvePrintEmployeeId = async (factoryId: string): Promise<string | null> => {
  if (authStore.user?.isQip) {
    const employeeId = authStore.user?.employeeId?.trim() || '';
    if (!employeeId) {
      showToast({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: t('listMixGlue.toast.invalidEmployeeCard'),
        life: 6000,
      });
      return null;
    }
    return employeeId;
  }

  const scannedEmployeeId = await scanOnce({
    title: t('login.scanOverlayTitle'),
    note: t('listMixGlue.scan.employeeNote'),
  });

  if (!scannedEmployeeId?.trim()) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.scanFailed'),
      life: 6000,
    });
    return null;
  }

  const employeeId = scannedEmployeeId.trim();

  try {
    const validateResponse = await employeeApi.postValidateQIP({
      factoryId,
      employeeId,
    });
    const validateData = validateResponse.data;

    if (validateData?.success !== true) {
      showToast({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: t('listMixGlue.toast.invalidEmployeeCard'),
        life: 6000,
      });
      return null;
    }
  } catch (error: any) {
    console.error(error);
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('listMixGlue.toast.invalidEmployeeCard'),
      life: 6000,
    });
    return null;
  }

  return employeeId;
};

const warnPendingPrintReplaced = (workOrderMasterId: string) => {
  const activeContext = separatePrintJobContext.value ?? mixPrintJobContext.value;
  if (
    hasPendingPrint.value &&
    activeContext?.workOrderMasterId &&
    activeContext.workOrderMasterId !== workOrderMasterId
  ) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.pendingReplaced'),
      life: 6000,
    });
  }
};

const handleSeparateNoMixPrint = async (
  row: Partial<WorkOrderMaster>,
  factoryId: string,
  employeeId: string
) => {
  printFlowKind.value = 'separate';
  warnPendingPrintReplaced(row.workOrderMasterId!);
  printingWorkOrderId.value = row.workOrderMasterId!;
  showRetryDialog.value = false;
  await clearSeparateFailedItems();

  const queue = await preparePrintBatch({
    workOrderMasterId: row.workOrderMasterId!,
    isNoMixGlue: true,
    confirmBy: employeeId,
    factoryId,
    workOrderMasterName: row.workOrderMasterName,
    chemicalMasterName: row.chemicalMasterName,
  });

  if (!queue.length) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.noLabels'),
      life: 6000,
    });
    return;
  }

  lastPrintTotal.value = queue.length;
  const result = await startSeparatePrint(queue, createWriteFn(), factoryId, {
    workOrderMasterId: row.workOrderMasterId!,
    workOrderMasterName: row.workOrderMasterName,
    confirmBy: employeeId,
    isNoMixGlue: true,
    lastPrintTotal: queue.length,
  }, createPrintRuntimeOptions());

  const printFailed = hasPrintFailures(result, queue.length);
  showPrintResultToast(result.printedCount, queue.length, printFailed);

  if (printFailed) {
    showRetryDialog.value = true;
    return;
  }

  markRowQipPrinted(row.workOrderMasterId!);
};

const handleMixGluePrint = async (
  row: Partial<WorkOrderMaster>,
  factoryId: string,
  employeeId: string
) => {
  printFlowKind.value = 'mix';
  warnPendingPrintReplaced(row.workOrderMasterId!);
  printingWorkOrderId.value = row.workOrderMasterId!;
  showRetryDialog.value = false;
  await clearMixFailedItems();

  const { data: woResponse } = await workOrder.getWorkOrder(factoryId, row.workOrderMasterId!, 2);
  if (!woResponse?.success || !woResponse?.data) {
    showToast({
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
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('listMixGlue.toast.mixGlueIdNotFound'),
      life: 6000,
    });
    return;
  }

  const queue = buildPrintQueue(respData, row);

  if (!queue.length) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.noLabels'),
      life: 6000,
    });
    return;
  }

  lastPrintTotal.value = queue.length;
  const result = await startMixPrint(queue, createWriteFn(), factoryId, {
    workOrderMasterId: row.workOrderMasterId!,
    workOrderMasterName: row.workOrderMasterName,
    confirmBy: employeeId,
    lastPrintTotal: queue.length,
  }, createPrintRuntimeOptions());

  const printFailed = hasPrintFailures(result, queue.length);
  showPrintResultToast(result.printedCount, queue.length, printFailed);

  if (printFailed) {
    showRetryDialog.value = true;
    return;
  }

  markRowQipPrinted(row.workOrderMasterId!);
};

const handlePrint = async (row: Partial<WorkOrderMaster>) => {
  if (!row.workOrderMasterId) return;
  if (isRowQipPrinted(row)) {
    showAlreadyPrintedToast(row);
    return;
  }
  if (!canPrintRow(row)) return;
  if (isRowPrintProcessing(row.workOrderMasterId)) return;

  const factoryId = authStore.user?.factoryId;
  if (!factoryId) {
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('listMixGlue.toast.factoryNotFound'),
      life: 6000,
    });
    return;
  }

  if (!(await ensurePrinterReady())) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.printerNotConnected'),
      life: 6000,
    });
    return;
  }

  if (!(await requireOnline())) return;

  const employeeId = await resolvePrintEmployeeId(factoryId);
  if (!employeeId) return;

  try {
    if (row.isNoMixGlue === true) {
      await handleSeparateNoMixPrint(row, factoryId, employeeId);
    } else {
      await handleMixGluePrint(row, factoryId, employeeId);
    }
  } catch (error: any) {
    console.error(error);
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: error?.response?.data?.message || error?.message || t('listMixGlue.toast.printFailed'),
      life: 6000,
    });
  } finally {
    printingWorkOrderId.value = null;
  }
};

const handleRetryPrint = async () => {
  const factoryId = authStore.user?.factoryId;
  if (!factoryId) return;

  if (!(await ensurePrinterReady())) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.printerNotConnected'),
      life: 6000,
    });
    return;
  }

  const flow = printFlowKind.value ?? (hasSeparatePendingPrint.value ? 'separate' : 'mix');
  const activeContext = flow === 'separate' ? separatePrintJobContext.value : mixPrintJobContext.value;

  printingWorkOrderId.value = activeContext?.workOrderMasterId ?? null;
  const workOrderMasterId = activeContext?.workOrderMasterId;

  try {
    const result = flow === 'separate'
      ? await retrySeparateFailed(createWriteFn(), factoryId, createPrintRuntimeOptions())
      : await retryMixFailed(createWriteFn(), factoryId, createPrintRuntimeOptions());
    const total = activeContext?.lastPrintTotal ?? lastPrintTotal.value;
    const printFailed = hasPrintFailures(result, total);
    showPrintResultToast(result.printedCount, total, printFailed);

    if (!printFailed) {
      showRetryDialog.value = false;
      lastPrintTotal.value = 0;
      if (workOrderMasterId) {
        markRowQipPrinted(workOrderMasterId);
      }
    } else {
      showRetryDialog.value = true;
    }
  } finally {
    printingWorkOrderId.value = null;
  }
};

const restorePendingPrintJob = async () => {
  const mixRestored = await restoreMixPendingFromStorage();
  if (mixRestored) {
    printFlowKind.value = 'mix';
    lastPrintTotal.value = mixRestored.lastPrintTotal;
    showRetryDialog.value = true;
    showToast({
      severity: 'info',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.pendingRestored', { count: mixRestored.failedItems.length }),
      life: 6000,
    });
    return;
  }

  const separateRestored = await restoreSeparatePendingFromStorage();
  if (!separateRestored) return;

  printFlowKind.value = 'separate';
  lastPrintTotal.value = separateRestored.lastPrintTotal;
  showRetryDialog.value = true;
  showToast({
    severity: 'info',
    summary: t('listMixGlue.toast.warning'),
    detail: t('listMixGlue.toast.pendingRestored', { count: separateRestored.failedItems.length }),
    life: 6000,
  });
};

const fetchWorkOrders = async (page: number, pageSize: number) => {
  const requestId = startRequest();
  isLoadingLine.value = true;
  lineDetails.value = Array.from({ length: pageSize }).map(() => ({}));

  try {
    const payload = {
      factoryId: authStore.user?.factoryId,
      departmentId: authStore.user?.departmentId,
      mixGlueCheck: true,
      page: page,
      pageSize: pageSize
    };

    const response = await workOrder.postWorkOrderList(payload);
    if (isStaleRequest(requestId)) return;

    const resData = response.data as ApiResponse<WorkOrderMaster>;

    if (resData && resData.success) {
      lineDetails.value = resData.data.items
        .map((item) => mapWorkOrderListItem(item as unknown as Record<string, unknown>))
        .map((item) => applyPrintedStateToListItem(item));
      totalRecords.value = Number(resData.data.totalCount) || 0;
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

const goBack = () => router.push('/app-menu');

onIonViewWillEnter(() => {
  void restorePendingPrintJob();
  void fetchWorkOrders(currentPage.value, rowsPerPage.value);
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

.list-mix-glue-page {
  width: 100%;
}

.list-mix-glue-section-title {
  font-weight: 700;
  color: var(--text-color-secondary);
  font-size: 1.2rem;
}

.list-mix-glue-table-wrap {
  width: 100%;
  max-width: 100%;
}

.tablet-page--inch87.list-mix-glue-page {
  padding: 0.5rem 0.625rem;
}

.tablet-page--inch87 .list-mix-glue-card-head {
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.list-mix-glue-filter {
  min-width: 10rem;
  max-width: 14rem;
}

.tablet-page--inch11 .list-mix-glue-filter {
  min-width: 12rem;
  max-width: 18rem;
}

.tablet-page--inch11.list-mix-glue-page {
  padding: 0.875rem 1.125rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.tablet-page--inch11 .list-mix-glue-card-head {
  padding: 0.875rem 1rem;
  gap: 0.75rem;
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

.button-lg {
  width: 60px;
  height: 60px;
}

.button-lg .pi {
  font-size: 1.5rem;
}

.no-mix-icon-preload {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.no-mix-confirm-btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  font-size: 2rem;
}

.no-mix-confirm-btn :deep(svg) {
  width: 1.85rem;
  height: 1.85rem;
}
</style>