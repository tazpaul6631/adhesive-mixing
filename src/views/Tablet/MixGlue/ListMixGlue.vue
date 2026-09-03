<template>
  <AppPage :page-class="{ 'list-mix-glue--scanning': isScanning }">
    <div class="no-mix-icon-preload" aria-hidden="true">
      <BsPaintBucket />
      <BsBucket />
    </div>
    <AppHeader no-border class="tablet-list-header">
      <template #start>
        <button type="button" class="header-back" @click="goBack">
          <i class="pi pi-angle-left text-xl mr-1"></i>
          <h1 class="header-title">{{ t('appMenu.features.mixGlue.title') }}</h1>
        </button>
      </template>
      <template #end>
        <div class="flex align-items-center gap-2 mr-2">
          <NetworkStatusIcon />
          <LocaleSelect device-scope="tablet" />
        </div>
      </template>
    </AppHeader>

    <AppContent class="list-mix-glue-content" :scroll="true" :padding="true">
      <div class="main-container max-w-full mx-auto list-mix-glue-page"
        :class="[pageClass, { 'list-mix-glue-layer--hidden': isScanning }]">
        <div class="surface-card p-0 shadow-1 border-round-xl list-mix-glue-card">
          <div
            class="surface-100 border-round-top-xl flex align-items-center justify-content-between list-mix-glue-card-head">
            <span class="list-mix-glue-section-title">
              <i class="pi pi-list mr-2"></i>{{ t('listMixGlue.sectionTitle') }}
            </span>
            <div class="flex align-items-center gap-2">
              <div v-if="isPrinting" class="print-progress-chip">
                <i class="pi pi-spin pi-spinner" style="font-size:0.85rem"></i>
                <span>{{ progress.current }}/{{ progress.total }}</span>
              </div>
              <div v-if="smallDeviceUsage.total > 0" class="mixing-device-usage-chip"
                :class="{ 'mixing-device-usage-chip--full': smallDeviceUsage.isFull }" :title="t('listMixGlue.deviceUsage.smallTitle', {
                  inUse: smallDeviceUsage.inUse,
                  total: smallDeviceUsage.total,
                })">
                <i class="pi pi-inbox" aria-hidden="true" />
                <span>{{ t('listMixGlue.deviceUsage.small') }}</span>
                <strong>{{ smallDeviceUsage.inUse }}/{{ smallDeviceUsage.total }}</strong>
              </div>
              <div v-if="largeDeviceUsage.total > 0" class="mixing-device-usage-chip"
                :class="{ 'mixing-device-usage-chip--full': largeDeviceUsage.isFull }" :title="t('listMixGlue.deviceUsage.largeTitle', {
                  inUse: largeDeviceUsage.inUse,
                  total: largeDeviceUsage.total,
                })">
                <i class="pi pi-inbox" aria-hidden="true" />
                <span>{{ t('listMixGlue.deviceUsage.large') }}</span>
                <strong>{{ largeDeviceUsage.inUse }}/{{ largeDeviceUsage.total }}</strong>
              </div>
              <Button v-if="hasPendingPrint" icon="pi pi-exclamation-triangle" severity="warn" outlined size="large"
                :badge="String(pendingCount)" badgeSeverity="danger"
                :title="t('listMixGlue.print.pendingButtonTitle', { count: pendingCount })"
                :aria-label="t('listMixGlue.print.pendingButtonTitle', { count: pendingCount })"
                @click="openPendingPrintDialog" />
              <BluetoothPrinterStatus v-if="showPrinterUi" ref="bluetoothRef" />
            </div>
          </div>

          <div ref="tableWrapperRef" class="overflow-x-auto border-round-bottom-xl list-mix-glue-table-wrap">
            <DataTable :value="filteredLineDetails" lazy :totalRecords="totalRecords" :first="tableFirst"
              @page="onPageLine" scrollable :scrollHeight="tableScrollHeight" class="modern-table auto-columns-table"
              tableStyle="width: 100%; min-width: 0;" @row-click="onRowClick" :paginator="true" :rows="rowsPerPage"
              paginatorTemplate="PrevPageLink CurrentPageReport NextPageLink"
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

              <Column field="requestOrderWeight" :header="t('listMixGlue.columns.totalWeight')"
                headerClass="dt-col-weight" bodyClass="dt-col-weight">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.requestOrderWeight }}</span>
                </template>
              </Column>

              <Column field="createrId" :header="t('listMixGlue.columns.updater')" headerClass="dt-col-text"
                bodyClass="dt-col-text">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="70%" height="1rem" />
                  <span v-else>{{ data.updaterId }}</span>
                </template>
              </Column>

              <Column field="requestTime" :header="t('listMixGlue.columns.requestTime')" headerClass="dt-col-datetime"
                bodyClass="dt-col-datetime">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <span v-else><i class="pi pi-clock text-xs mr-1"></i>{{ data.requestTime ?
                    format.formatDate(data.requestTime) : '' }}</span>
                </template>
              </Column>

              <Column :header="t('listMixGlue.columns.glueConfirm')" :exportable="false"
                headerClass="dt-col-action-glue" bodyClass="dt-col-action-glue">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <div v-else-if="shouldShowConfirmActions(data)"
                    class="flex justify-content-center align-items-center">
                    <i v-if="data.mixGlueComplete === true" class="pi pi-check-circle list-mix-glue-status-icon"
                      :title="t('listMixGlue.columns.glueConfirm')"
                      :aria-label="t('listMixGlue.columns.glueConfirm')" />
                    <div v-else class="glue-confirm-btn-wrap">
                      <Button :disabled="isConfirmButtonDisabled(data) || isRowProcessing(data.workOrderMasterId)"
                        :loading="isRowActionBusy(data.workOrderMasterId, 'confirm')"
                        :icon="data.mixStartComplete === true ? 'pi pi-check' : 'pi pi-play'" severity="success"
                        class="button-lg" :title="t('listMixGlue.columns.glueConfirm')"
                        :aria-label="t('listMixGlue.columns.glueConfirm')" @click.stop="onGlueConfirmClick(data)" />
                      <Transition name="glue-device-badge">
                        <span v-if="shouldShowDeviceBadge(data) && getDeviceBadgeName(data)"
                          :key="`${data.workOrderMasterId}-${getDeviceBadgeName(data)}-${data.mixStartComplete === true}`"
                          class="glue-confirm-device-chip" :class="data.mixStartComplete === true
                            ? 'glue-confirm-device-chip--success'
                            : 'glue-confirm-device-chip--pending'" :title="getDeviceBadgeName(data)">{{
                              getDeviceBadgeName(data) }}</span>
                      </Transition>
                    </div>
                  </div>
                </template>
              </Column>

              <Column :header="t('listMixGlue.columns.qipConfirm')" :exportable="false" headerClass="dt-col-action-qip"
                bodyClass="dt-col-action-qip">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <div v-else class="flex justify-content-center align-items-center">
                    <i v-if="isRowQipPrinted(data)" class="pi pi-print list-mix-glue-status-icon"
                      :title="t('listMixGlue.columns.qipConfirm')" :aria-label="t('listMixGlue.columns.qipConfirm')" />
                    <Button v-else :disabled="isPrintRowDisabled(data)"
                      :loading="isPrintRowLoading(data.workOrderMasterId)" severity="success" class="button-lg"
                      :title="isMixRowQueued(data.workOrderMasterId) ? t('listMixGlue.print.queuedTitle') : t('listMixGlue.columns.qipConfirm')"
                      :aria-label="t('listMixGlue.columns.qipConfirm')" @click.stop="onPrintClick(data)">
                      <template
                        v-if="isMixRowQueued(data.workOrderMasterId) && !isPrintRowLoading(data.workOrderMasterId)"
                        #icon>
                        <i class="pi pi-clock" />
                      </template>
                      <template v-else-if="!isPrintRowLoading(data.workOrderMasterId)" #icon>
                        <i class="pi pi-print" />
                      </template>
                    </Button>
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
                      :loading="isRowActionBusy(data.workOrderMasterId, 'noMix')" class="button-lg no-mix-confirm-btn"
                      :title="getNoMixConfirmTitle(data)" :aria-label="getNoMixConfirmTitle(data)"
                      @click.stop="handleNoMixConfirm(data)">
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
    </AppContent>

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

    <BatchPrintRetryDialog v-if="showPrinterUi" v-model:visible="showRetryDialog" locale-scope="listMixGlue"
      :failed-items="failedItems" :loading="isPrinting" @retry="handleRetryPrint" />

    <Dialog v-model:visible="showMlnsDialog" modal
      :header="t('listMixGlue.mlnsDialog.title') + ' ' + (pendingConfirmRow?.workOrderMasterName ?? '')"
      :style="{ width: 'min(92vw, 420px)' }" :closable="false" @hide="closeMlnsDialog">
      <div class="flex flex-column gap-3">
        <p class="m-0 text-600 line-height-3">{{ t('listMixGlue.mlnsDialog.hint') }}</p>
        <div class="flex flex-column gap-2">
          <label for="mlnsInput" class="font-semibold text-900">{{ t('listMixGlue.mlnsDialog.inputLabel') }}</label>
          <InputText id="mlnsInput" v-model="mlnsInput" class="w-full"
            :placeholder="t('listMixGlue.mlnsDialog.placeholder')" inputmode="numeric" autocomplete="off"
            :disabled="isMlnsSubmitting" @update:model-value="onMlnsInputUpdate" @keyup.enter="submitMlnsDialog" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" icon="pi pi-times" text severity="secondary" size="large"
          :disabled="isMlnsSubmitting" @click="closeMlnsDialog" />
        <Button :label="t('listMixGlue.mlnsDialog.confirm')" icon="pi pi-check" severity="success"
          :disabled="!mlnsInput.trim() || isMlnsSubmitting" :loading="isMlnsSubmitting" size="large"
          @click="submitMlnsDialog" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showPrintAuthDialog" modal :header="t('listMixGlue.printAuthDialog.title')"
      :style="{ width: 'min(92vw, 420px)' }" :closable="false" @hide="closePrintAuthDialog">
      <div class="flex flex-column gap-3">
        <p class="m-0 text-600 line-height-3">
          {{ t('listMixGlue.printAuthDialog.hint', { workOrderMasterName: pendingPrintRow?.workOrderMasterName ?? '' })
          }}
        </p>
        <div class="flex flex-column gap-2">
          <label for="printAuthPassword" class="font-semibold text-900">{{
            t('listMixGlue.printAuthDialog.passwordLabel')
          }}</label>
          <div class="flex align-items-center gap-2">
            <IconField class="flex-1 w-full print-auth-password-field">
              <InputText id="printAuthPassword" v-model="printAuthPassword"
                :type="showPrintAuthPassword ? 'text' : 'password'" class="w-full"
                :placeholder="t('listMixGlue.printAuthDialog.passwordPlaceholder')" autocomplete="off"
                :disabled="isPrintAuthBusy" @keyup.enter="submitPrintAuthPassword" />
              <InputIcon class="password-toggle-icon pi" :class="[
                showPrintAuthPassword ? 'pi-eye-slash' : 'pi-eye',
                { 'password-toggle-icon--disabled': isPrintAuthBusy }
              ]" @click="togglePrintAuthPassword" />
            </IconField>
            <Button icon="pi pi-qrcode" severity="success" outlined class="print-auth-scan-btn"
              :title="t('listMixGlue.printAuthDialog.scanButton')"
              :aria-label="t('listMixGlue.printAuthDialog.scanButton')" size="large" :disabled="isPrintAuthBusy"
              :loading="isPrintAuthScanning" @click="startPrintAuthScan" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" icon="pi pi-times" text severity="secondary" size="large"
          :disabled="isPrintAuthBusy" @click="closePrintAuthDialog" />
        <Button :label="t('listMixGlue.printAuthDialog.confirm')" icon="pi pi-check" severity="success" size="large"
          :disabled="!printAuthPassword.trim() || isPrintAuthBusy" :loading="isPrintAuthSubmitting"
          @click="submitPrintAuthPassword" />
      </template>
    </Dialog>
  </AppPage>
</template>

<script setup lang="ts">
defineOptions({ name: 'ListMixGlue' });

import { ref, nextTick, computed, defineAsyncComponent } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useMixingDevicesStore, resolveRequiredDeviceType } from '@/store/mixingDevices';
import format from '@/mixins/format';
import workOrder from '@/api/workOrder';
import { useRouter } from 'vue-router';
import { useAppToast } from '@/composables/useAppToast';
import { useMixGlueDraftStore } from '@/store/mixGlueDraft';
import mixGlueApi from '@/api/mixGlue';
import employeeApi from '@/api/employee';
import { useTabletBarcodeScan } from '@/composables/useTabletBarcodeScan';
import { parsePrintQueueFromBe } from '@/services/mixGluePrintQueue';
import { useMixGlueLabelBatchPrint } from '@/composables/useMixGlueLabelBatchPrint';
import { useSeparateLabelBatchPrint } from '@/composables/useSeparateLabelBatchPrint';
import { usePrintQueue, type PrintQueueEntry, type PrintJobResult } from '@/composables/usePrintQueue';
import { useLabelPrintGapConfirm } from '@/composables/useLabelPrintGapConfirm';
import { ensureGapConfirmed, resetLabelPrintSession } from '@/services/labelPrintSession';
import LocaleSelect from '@/components/LocaleSelect.vue';
import { AppPage, AppHeader, AppContent } from '@/components/layout';
import { useAppBackButton } from '@/composables/useAppBackButton';
import { usePageLifecycle } from '@/composables/usePageLifecycle';
import NetworkStatusIcon from '@/views/Mobile/components/NetworkStatusIcon.vue';
import {
  computeLazyTableTotalRecords,
  createSkeletonRows,
  parseCursorPagedMeta,
  useListTableFetch,
} from '@/composables/useListTableFetch';
import { useAppLocale } from '@/composables/useAppLocale';
import { useRequireOnline } from '@/composables/useRequireOnline';
import { useTabletPageLayout } from '@/composables/useTabletPageLayout';
import { useRowActionLock } from '@/composables/useRowActionLock';
import { useScrollToSelectedTableRow } from '@/composables/useScrollToSelectedTableRow';
import { BsBucket, BsPaintBucket } from '@kalimahapps/vue-icons/bs';
import { resolveCatchErrorMessage } from '@/utils/catchErrorMessage';

const BluetoothPrinterStatus = defineAsyncComponent(
  () => import('@/components/BluetoothPrinterStatus.vue'),
);
const BatchPrintRetryDialog = defineAsyncComponent(
  () => import('@/components/BatchPrintRetryDialog.vue'),
);
const router = useRouter();
const authStore = useAuthStore();
const mixingDevicesStore = useMixingDevicesStore();
const { t } = useAppLocale(() => 'tablet');

const ensureMixingDevicesHydrated = () => {
  const loginDevices = authStore.user?.mixingDevices;
  if (!Array.isArray(loginDevices)) return;

  // Login rỗng → clear pool cũ (persist); store rỗng → hydrate từ login.
  if (loginDevices.length === 0) {
    if (mixingDevicesStore.devices.length > 0) {
      mixingDevicesStore.setFromLogin([]);
    }
    return;
  }

  if (mixingDevicesStore.devices.length === 0) {
    mixingDevicesStore.setFromLogin(loginDevices);
  }
};

ensureMixingDevicesHydrated();

const smallDeviceUsage = computed(() => mixingDevicesStore.smallDeviceUsage);
const largeDeviceUsage = computed(() => mixingDevicesStore.largeDeviceUsage);
const hasMixingDevices = computed(() => mixingDevicesStore.devices.length > 0);

const shouldShowDeviceBadge = (row: Partial<WorkOrderMaster>) =>
  hasMixingDevices.value && mixingDevicesStore.shouldShowBadge(row);

const getDeviceBadgeName = (row: Partial<WorkOrderMaster>) =>
  mixingDevicesStore.resolveBadgeName(row);

const { requireOnline, notifyOfflineFromError } = useRequireOnline();
useLabelPrintGapConfirm('listMixGlue');

const {
  pageClass,
  tableScrollHeight,
  emptyStateMinHeight,
} = useTabletPageLayout({ listPage: true });

const selectedItem = ref<any>(null);
const tableWrapperRef = ref<HTMLElement | null>(null);
const { scrollToRowByDataKey } = useScrollToSelectedTableRow(tableWrapperRef);
const { showToast } = useAppToast();
const draftStore = useMixGlueDraftStore();
const bluetoothRef = ref<any>(null);
/** Mount bluetooth/print UI sau khi list đã bắt đầu fetch — vào trang nhanh hơn. */
const showPrinterUi = ref(false);
const printingWorkOrderId = ref<string | null>(null);
const showRetryDialog = ref(false);
const lastPrintTotal = ref(0);
const printFlowKind = ref<'mix' | 'separate' | null>(null);
/** Giữ trạng thái đã in trong session — không phụ thuộc BE trả qipConfirm ngay sau in. */
const printedWorkOrderIds = ref<Set<string>>(new Set());
const { scanOnce, isScanning, cancelScan, scanTitle, scanNote } = useTabletBarcodeScan();
const { isRowActionBusy, isAnyRowBusy, lockRow, unlockRow } = useRowActionLock();
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

const parseQipConfirm = (value: unknown): boolean => {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
};

const normalizeMlnsList = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => String(v ?? '').trim()).filter((v) => v !== '');
};

/** Có ít nhất một giá trị khác "0" → cần nhập xác minh trước khi confirm. */
const requiresMlnsVerification = (row: Partial<WorkOrderMaster>): boolean =>
  normalizeMlnsList(row.mlns).some((v) => v !== '0');

/** Các mã cần khớp khi nhập (bỏ "0"). */
const getExpectedMlnsCodes = (row: Partial<WorkOrderMaster>): string[] =>
  normalizeMlnsList(row.mlns).filter((v) => v !== '0');

const showMlnsDialog = ref(false);
const mlnsInput = ref('');
const pendingConfirmRow = ref<Partial<WorkOrderMaster> | null>(null);
const isMlnsSubmitting = ref(false);

const closeMlnsDialog = () => {
  if (isMlnsSubmitting.value) return;
  showMlnsDialog.value = false;
  pendingConfirmRow.value = null;
  mlnsInput.value = '';
};

/** Chỉ cho phép số và dấu phẩy. */
const onMlnsInputUpdate = (value: string | undefined) => {
  mlnsInput.value = String(value ?? '').replace(/[^\d,]/g, '');
};

const parseMlnsInput = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');

const isMlnsMatch = (entered: string[], expected: string[]): boolean => {
  if (entered.length !== expected.length) return false;
  const a = [...entered].sort();
  const b = [...expected].sort();
  return a.every((v, i) => v === b[i]);
};

const mapWorkOrderListItem = (item: Record<string, unknown>): Partial<WorkOrderMaster> => {
  const raw = item.isSeparateGlue ?? item.IsSeparateGlue;
  let isSeparateGlue: boolean | undefined;
  if (raw === true || raw === 'true') isSeparateGlue = true;
  else if (raw === false || raw === 'false') isSeparateGlue = false;
  else isSeparateGlue = true;

  const qipConfirm = parseQipConfirm(
    item.qipConfirm ?? item.QipConfirm ?? item.qipconfirm
  );

  // BE trả mixGlueStep là number — chuẩn hóa thành string để so sánh === '2', '3'
  const mixGlueStep = item.mixGlueStep != null ? String(item.mixGlueStep) : undefined;

  const rawDeviceId = item.departmentMixingDeviceId ?? item.DepartmentMixingDeviceId;
  const rawDeviceIdText = rawDeviceId === null || rawDeviceId === undefined
    ? ''
    : String(rawDeviceId).trim();
  // BE: "0" = chưa gán máy
  const departmentMixingDeviceId =
    !rawDeviceIdText || rawDeviceIdText === '0'
      ? null
      : rawDeviceIdText;

  const rawAgent = item.isProcessingAgent ?? item.IsProcessingAgent;
  const isProcessingAgent =
    rawAgent === true || rawAgent === 'true' || rawAgent === 1 || rawAgent === '1';

  return {
    ...(item as Partial<WorkOrderMaster>),
    isSeparateGlue,
    qipConfirm,
    mixGlueStep,
    departmentMixingDeviceId,
    isProcessingAgent,
    mlns: normalizeMlnsList(item.mlns ?? item.MLNS ?? item.Mlns),
  };
};

const selectListRow = (row: Partial<WorkOrderMaster>) => {
  selectedItem.value = row;
};

const onGlueConfirmClick = (row: Partial<WorkOrderMaster>) => {
  selectListRow(row);
  // Chỉ xác minh MLN khi còn mã khác "0" và chưa hoàn tất MixStart
  if (requiresMlnsVerification(row) && row.mixStartComplete === false) {
    pendingConfirmRow.value = row;
    mlnsInput.value = '';
    showMlnsDialog.value = true;
    return;
  }
  void handleConfirm(row);
};

const submitMlnsDialog = async () => {
  const row = pendingConfirmRow.value;
  if (!row || isMlnsSubmitting.value) return;

  const entered = parseMlnsInput(mlnsInput.value);
  const expected = getExpectedMlnsCodes(row);

  if (!entered.length) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.mlnsEmpty'),
      life: 3000,
    });
    return;
  }

  if (!isMlnsMatch(entered, expected)) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.mlnsMismatch'),
      life: 3000,
    });
    return;
  }

  isMlnsSubmitting.value = true;
  try {
    await handleConfirm(row);
    showMlnsDialog.value = false;
    pendingConfirmRow.value = null;
    mlnsInput.value = '';
  } finally {
    isMlnsSubmitting.value = false;
  }
};

const canClickNoMixConfirmRow = (row: Partial<WorkOrderMaster>) => row.mixGlueStep === '3';

const getNoMixConfirmSeverity = (row: Partial<WorkOrderMaster>) =>
  isNoMixConfirmGreen(row) ? 'success' : 'danger';

const getNoMixConfirmTitle = (row: Partial<WorkOrderMaster>) =>
  isNoMixConfirmGreen(row)
    ? t('listMixGlue.columns.separateConfirm')
    : t('listMixGlue.columns.noSeparateConfirm');

const isPrintRowDisabled = (row: Partial<WorkOrderMaster>) => {
  // Cho phép enqueue WO khác khi đang in; chỉ khóa lúc đang auth modal/scan.
  if (isPrintAuthBlocking.value) return true;
  if (isRowPrintProcessing(row.workOrderMasterId)) return true;
  if (isMixRowQueued(row.workOrderMasterId)) return true;
  if (isRowQipPrinted(row)) return true;
  if (row.mixGlueStep !== '3' || !canPrintRow(row)) return true;
  return false;
};

const isRowQipPrinted = (row: Partial<WorkOrderMaster>) => {
  if (row.qipConfirm === true) return true;
  const id = row.workOrderMasterId;
  if (!id) return false;
  return printedWorkOrderIds.value.has(id) || printedWorkOrderIds.value.has(String(id));
};

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

const forgetPrintedWorkOrder = (workOrderMasterId: string) => {
  const next = new Set(printedWorkOrderIds.value);
  next.delete(workOrderMasterId);
  next.delete(String(workOrderMasterId));
  printedWorkOrderIds.value = next;
};

const applyPrintedStateToListItem = (item: Partial<WorkOrderMaster>): Partial<WorkOrderMaster> => {
  if (!item.workOrderMasterId) return item;

  if (item.qipConfirm === true) {
    rememberPrintedWorkOrder(item.workOrderMasterId);
    return item;
  }

  // BE qipconfirm=false — bỏ session cũ, không ép nút vàng/disabled.
  forgetPrintedWorkOrder(item.workOrderMasterId);
  return { ...item, qipConfirm: false };
};

const showAlreadyPrintedToast = (row: Partial<WorkOrderMaster>) => {
  showToast({
    severity: 'warn',
    summary: t('listMixGlue.toast.warning'),
    detail: t('listMixGlue.toast.alreadyPrinted', { name: row.chemicalMasterName }),
    life: 3000,
  });
};

const shouldShowConfirmActions = (row: Partial<WorkOrderMaster>) => row.isNoMixGlue !== true;

/** Step 2 + mixGlueConfirm=true → MixStart; Step 3 + mixStartComplete=true → MixComplete. */
const resolveConfirmType = (row: Partial<WorkOrderMaster>): string | null => {
  if (row.mixGlueStep === '2' && row.mixGlueConfirm === true && row.mixStartComplete === false) return 'MixStart';
  if (row.mixGlueStep === '2' && row.mixGlueConfirm === true && row.mixStartComplete === true) return 'MixComplete';
  return null;
};

const isConfirmButtonDisabled = (row: Partial<WorkOrderMaster>): boolean => {
  return resolveConfirmType(row) === null;
};

const {
  queue: mixPrintJobQueue,
  isQueued: isMixRowQueued,
  isActive: isMixRowPrintActive,
  isRunning: isMixPrintQueueRunning,
  enqueue: enqueueMixPrintRow,
  clearQueue: clearMixPrintQueue,
  runNext: runNextMixPrintJob,
  continueAfterRetry: continueQueueAfterMixRetry,
} = usePrintQueue<Partial<WorkOrderMaster>>();

const mixPrintQueueCount = computed(() =>
  mixPrintJobQueue.value.length + (isPrinting.value ? 1 : 0)
);

const isRowPrintProcessing = (workOrderMasterId?: string) =>
  isRowActionBusy(workOrderMasterId, 'print') ||
  (workOrderMasterId != null && printingWorkOrderId.value === workOrderMasterId);

const isPrintRowLoading = (workOrderMasterId?: string) =>
  isRowActionBusy(workOrderMasterId, 'print') ||
  Boolean(workOrderMasterId && isMixRowPrintActive(workOrderMasterId) && isPrinting.value);

const isRowProcessing = (workOrderMasterId?: string) =>
  isScanning.value || isRowPrintProcessing(workOrderMasterId) || isAnyRowBusy();

useAppBackButton(10, (processNextHandler) => {
  if (isScanning.value) {
    void cancelScan();
    return;
  }
  if (mixPrintQueueCount.value > 0) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.printQueueBackBlocked', { count: mixPrintQueueCount.value }),
      life: 3000,
    });
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
  requestTime: string;
  chemicalMasterName: string;
  hourlyValidity: string;
  requestOrderWeight: string;
  isMixGlue: boolean;
  isNoMixGlue: boolean;
  mixGlueComplete: boolean;
  qipConfirm: boolean;
  mixGlueConfirm: boolean;
  mixGlueStep?: string;
  isSeparateGlue?: boolean;
  mixStartComplete?: boolean;
  receiveComplete?: boolean;
  separateGlueConfirm?: boolean;
  /** true → có thể dùng máy nhỏ (type 1) khi weight < 3. */
  isProcessingAgent?: boolean;
  /** Danh sách mã MLN từ BE — ví dụ ["4","5"] hoặc ["0"]. */
  mlns?: string[];
  /** Máy trộn đang gắn đơn (BE bổ sung) — dùng badge + MixComplete sau crash. */
  departmentMixingDeviceId?: string | number | null;
  /** Dùng nội bộ khi đưa vào print queue — không đến từ BE. */
  _resolvedEmployeeId?: string;
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
const totalRecords = ref(0);
const currentPage = ref(1);
const rowsPerPage = ref(100);
const lineDetails = ref<Partial<WorkOrderMaster>[]>(createSkeletonRows(rowsPerPage.value));
const tableFirst = computed(() => (currentPage.value - 1) * rowsPerPage.value);
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

const scrollToSelectedRow = () => {
  const id = selectedItem.value?.workOrderMasterId;
  if (id == null || id === '') return;
  const match = filteredLineDetails.value.find(
    (row) => String(row.workOrderMasterId ?? '') === String(id)
  );
  if (match) {
    selectedItem.value = match;
  }
  void scrollToRowByDataKey(filteredLineDetails.value, id);
};

const onRowClick = (event: { data: Partial<WorkOrderMaster> }) => {
  const workOrderMasterId = event.data.workOrderMasterId;
  if (workOrderMasterId) {
    // Tablet/touch: click lại row đang chọn có thể unselect — ép giữ selection để highlight/scroll khi quay lại.
    selectedItem.value = event.data;
    void nextTick(() => {
      selectedItem.value = event.data;
    });
    router.push({
      path: '/mix-glue-management',
      query: { workOrderMasterId: workOrderMasterId }
    });
  } else {
    console.warn('workOrderMasterId is missing in the clicked row data');
  }
};

// Hàm xử lý gửi API khi bấm nút
const handleConfirm = async (row: Partial<WorkOrderMaster>) => {
  const workOrderMasterId = row.workOrderMasterId;
  if (!workOrderMasterId) return;

  const type = resolveConfirmType(row);
  if (!type) return;

  if (!lockRow(workOrderMasterId, 'confirm')) return;

  await draftStore.ensureHydrated();
  const draftData = draftStore.getDraft(workOrderMasterId);

  if (!draftData) {
    showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('listMixGlue.toast.draftNotFound'), life: 3000 });
    unlockRow();
    return;
  }

  if (!(await requireOnline())) {
    unlockRow();
    return;
  }

  ensureMixingDevicesHydrated();

  const useMixingDevices = mixingDevicesStore.devices.length > 0;
  let departmentMixingDeviceId = useMixingDevices ? '' : '0';
  let recordStatus = '';

  if (type === 'MixStart') {
    if (useMixingDevices) {
      const rawExistingId =
        mixingDevicesStore.getAssignedDeviceId(workOrderMasterId)
        || String(row.departmentMixingDeviceId ?? '').trim();
      const existingId = !rawExistingId || rawExistingId === '0' ? '' : rawExistingId;
      const requiredDeviceType = resolveRequiredDeviceType(row);
      const device = existingId
        ? mixingDevicesStore.getDeviceById(existingId)
        : mixingDevicesStore.pickAvailableDevice(requiredDeviceType);

      if (!device) {
        showToast({
          severity: 'warn',
          summary: t('listMixGlue.toast.warning'),
          detail: requiredDeviceType === '1'
            ? t('listMixGlue.toast.noSmallMixingDeviceAvailable')
            : t('listMixGlue.toast.noLargeMixingDeviceAvailable'),
          life: 3000,
        });
        unlockRow();
        return;
      }

      departmentMixingDeviceId = String(device.departmentMixingDeviceId);
    }

    recordStatus = '2';
  } else if (type === 'MixComplete') {
    if (useMixingDevices) {
      const rawDeviceId =
        mixingDevicesStore.getAssignedDeviceId(workOrderMasterId)
        || String(row.departmentMixingDeviceId ?? '').trim();
      departmentMixingDeviceId = !rawDeviceId || rawDeviceId === '0' ? '' : rawDeviceId;

      if (!departmentMixingDeviceId) {
        showToast({
          severity: 'warn',
          summary: t('listMixGlue.toast.warning'),
          detail: t('listMixGlue.toast.mixingDeviceAssignmentMissing'),
          life: 3000,
        });
        unlockRow();
        return;
      }
    }

    recordStatus = '1';
  }

  try {
    const payload = {
      factoryId: authStore.user?.factoryId,
      workOrderMasterId: workOrderMasterId,
      hourlyValidity: draftData.hourlyValidity,
      type,
      departmentMixingDeviceId,
      recordStatus,
    };
    const response = await mixGlueApi.postMGMConfirmComplete(payload);
    const responseData = response.data as any;

    if (responseData?.success === false) {
      throw new Error(responseData?.message || 'DATA_NOT_FOUND');
    }

    if (type === 'MixStart') {
      if (useMixingDevices && departmentMixingDeviceId) {
        mixingDevicesStore.markInUse(workOrderMasterId, departmentMixingDeviceId);
        const rowIndex = lineDetails.value.findIndex(
          (item) => item.workOrderMasterId === workOrderMasterId
        );
        if (rowIndex >= 0) {
          lineDetails.value[rowIndex] = {
            ...lineDetails.value[rowIndex],
            departmentMixingDeviceId,
          };
        }
      }
    } else if (type === 'MixComplete') {
      if (useMixingDevices) {
        mixingDevicesStore.markFree(workOrderMasterId);
      }
    }

    showToast({
      severity: 'success',
      summary: t('listMixGlue.toast.success'),
      detail: resolveCatchErrorMessage(
        t,
        responseData?.message || 'CONFIRM_SUCCESS',
        t('catchError.CONFIRM_SUCCESS'),
      ),
      life: 3000,
    });
    fetchWorkOrders(currentPage.value, rowsPerPage.value);
  } catch (error) {
    if (notifyOfflineFromError(error)) return;
    console.error(error);
    const rawMessage =
      (error as any)?.response?.data?.message
      || (error instanceof Error ? error.message : '');
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: resolveCatchErrorMessage(
        t,
        rawMessage,
        t('listMixGlue.toast.confirmFailed'),
      ),
      life: 6000,
    });
  } finally {
    unlockRow();
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

  selectListRow(row);

  if (!lockRow(workOrderMasterId, 'noMix')) return;

  const factoryId = authStore.user?.factoryId;
  const updaterId = authStore.user?.employeeId?.trim() || '';

  if (!factoryId) {
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('listMixGlue.toast.factoryNotFound'),
      life: 6000,
    });
    unlockRow();
    return;
  }

  if (!updaterId) {
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('listMixGlue.toast.scanFailed'),
      life: 6000,
    });
    unlockRow();
    return;
  }

  if (!(await requireOnline())) {
    unlockRow();
    return;
  }

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
      life: 3000,
    });
  } catch (error) {
    if (notifyOfflineFromError(error)) return;
    console.error(error);
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('listMixGlue.toast.noMixConfirmFailed'),
      life: 6000,
    });
  } finally {
    unlockRow();
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

const showPrintAuthDialog = ref(false);
const printAuthPassword = ref('');
const showPrintAuthPassword = ref(false);
const pendingPrintRow = ref<Partial<WorkOrderMaster> | null>(null);
const isPrintAuthSubmitting = ref(false);
const isPrintAuthScanning = ref(false);
const isPrintAuthBusy = computed(
  () => isPrintAuthSubmitting.value || isPrintAuthScanning.value
);

/**
 * Chỉ chặn mở modal khi đang xác thực QIP (tránh ghi đè pendingPrintRow).
 * Cho phép bấm in WO khác khi đang in / còn queue → xếp hàng liên tục.
 */
const isPrintAuthBlocking = computed(
  () => isPrintAuthBusy.value || showPrintAuthDialog.value
);

const reopenPrintAuthDialogWithToast = async (toastOptions: {
  severity: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';
  summary: string;
  detail: string;
  life?: number;
}) => {
  showPrintAuthDialog.value = true;
  await nextTick();
  showToast(toastOptions);
};

const togglePrintAuthPassword = () => {
  if (isPrintAuthBusy.value) return;
  showPrintAuthPassword.value = !showPrintAuthPassword.value;
};

const closePrintAuthDialog = () => {
  if (isPrintAuthBusy.value) return;
  showPrintAuthDialog.value = false;
  pendingPrintRow.value = null;
  printAuthPassword.value = '';
  showPrintAuthPassword.value = false;
};

const onPrintClick = (row: Partial<WorkOrderMaster>) => {
  if (!row.workOrderMasterId) return;
  selectListRow(row);
  if (isPrintAuthBlocking.value) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.print.busyPrintingToast'),
      life: 3000,
    });
    return;
  }
  if (hasPendingPrint.value) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.print.busyPendingToast'),
      life: 3000,
    });
    return;
  }
  if (isPrintRowDisabled(row)) return;
  if (isRowQipPrinted(row)) {
    showAlreadyPrintedToast(row);
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

  try {
    const factoryId = authStore.user?.factoryId;
    if (!factoryId) {
      showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('listMixGlue.toast.factoryNotFound'), life: 6000 });
      return;
    }

    if (!(await ensurePrinterReady())) {
      showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('listMixGlue.toast.printerNotConnected'), life: 3000 });
      return;
    }

    if (!(await requireOnline())) return;

    const rowWithEmployee = { ...row, _resolvedEmployeeId: employeeId };
    // Chỉ start runner khi chưa có job nào đang chạy; job sau chỉ enqueue.
    const shouldStartQueue = !isPrinting.value && !isMixPrintQueueRunning.value;
    const enqueued = enqueueMixPrintRow(rowWithEmployee as Partial<WorkOrderMaster>);

    if (enqueued && shouldStartQueue) {
      void runNextMixPrintJob(executeMixPrintJob);
    }
  } finally {
    unlockRow();
  }
};

const proceedPrintAfterAuth = async (
  row: Partial<WorkOrderMaster>,
  employeeId: string
) => {
  showPrintAuthDialog.value = false;
  pendingPrintRow.value = null;
  printAuthPassword.value = '';
  showPrintAuthPassword.value = false;
  if (!row.workOrderMasterId) return;
  await enqueuePrintWithEmployee(row, employeeId);
};

const submitPrintAuthPassword = async () => {
  const row = pendingPrintRow.value;
  const password = printAuthPassword.value.trim();
  if (!row || !password || isPrintAuthBusy.value) return;

  const factoryId = authStore.user?.factoryId;
  if (!factoryId) {
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('listMixGlue.toast.factoryNotFound'), life: 6000 });
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
        summary: t('listMixGlue.toast.error'),
        detail: resolveCatchErrorMessage(t, data?.message, t('listMixGlue.toast.invalidEmployeeCard')),
        life: 6000,
      });
      return;
    }

    const employeeId = String(data?.data ?? '').trim();
    if (!employeeId) {
      showToast({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: resolveCatchErrorMessage(t, data?.message, t('listMixGlue.toast.invalidEmployeeCard')),
        life: 6000,
      });
      return;
    }

    await proceedPrintAfterAuth(row, employeeId);
  } catch (error: any) {
    console.error(error);
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: resolveCatchErrorMessage(
        t,
        error?.response?.data?.message,
        t('listMixGlue.toast.invalidEmployeeCard'),
      ),
      life: 6000,
    });
  } finally {
    isPrintAuthSubmitting.value = false;
  }
};

const startPrintAuthScan = async () => {
  const row = pendingPrintRow.value;
  if (!row || isPrintAuthBusy.value) return;

  const factoryId = authStore.user?.factoryId;
  if (!factoryId) {
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('listMixGlue.toast.factoryNotFound'), life: 6000 });
    return;
  }

  if (!(await requireOnline())) return;

  isPrintAuthScanning.value = true;
  showPrintAuthDialog.value = false;

  try {
    const scannedEmployeeId = await scanOnce({
      title: t('login.scanOverlayTitle'),
      note: t('listMixGlue.scan.employeeNote'),
    });

    if (!scannedEmployeeId?.trim()) {
      await reopenPrintAuthDialogWithToast({
        severity: 'warn',
        summary: t('listMixGlue.toast.warning'),
        detail: t('listMixGlue.toast.scanFailed'),
        life: 3000,
      });
      return;
    }

    const employeeId = scannedEmployeeId.trim();
    const { data } = await employeeApi.postValidateQIP({
      factoryId,
      employeeId,
    });

    if (data?.success !== true) {
      await reopenPrintAuthDialogWithToast({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: resolveCatchErrorMessage(t, data?.message, t('listMixGlue.toast.invalidEmployeeCard')),
        life: 6000,
      });
      return;
    }

    const resolvedId = String(data?.data ?? employeeId).trim() || employeeId;
    await proceedPrintAfterAuth(row, resolvedId);
  } catch (error: any) {
    console.error(error);
    await reopenPrintAuthDialogWithToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: resolveCatchErrorMessage(
        t,
        error?.response?.data?.message,
        t('listMixGlue.toast.invalidEmployeeCard'),
      ),
      life: 6000,
    });
  } finally {
    isPrintAuthScanning.value = false;
  }
};

/** Execute 1 print job trong queue — gọi API và in. Trả PrintJobResult để queue tính delay giữa 2 đơn. */
const executeMixPrintJob = async (entry: PrintQueueEntry<Partial<WorkOrderMaster>>): Promise<PrintJobResult> => {
  const row = entry.row;
  const factoryId = authStore.user?.factoryId;
  if (!factoryId || !row.workOrderMasterId) return { success: false };

  const employeeId = row._resolvedEmployeeId as string;
  printingWorkOrderId.value = row.workOrderMasterId;
  showRetryDialog.value = false;

  try {
    if (row.isNoMixGlue === true) {
      // --- No-mix in QIP list ---
      printFlowKind.value = 'separate';
      await clearSeparateFailedItems();

      const separateQueue = await preparePrintBatch({
        workOrderMasterId: row.workOrderMasterId,
        isNoMixGlue: true,
        confirmBy: employeeId,
        factoryId,
        workOrderMasterName: row.workOrderMasterName,
        chemicalMasterName: row.chemicalMasterName,
        allowPagedQueryFallback: true,
        workOrderDetailStep: 2,
      });

      if (!separateQueue.length) {
        showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('listMixGlue.toast.noLabels'), life: 3000 });
        printingWorkOrderId.value = null;
        return { success: true, labelCount: 0 };
      }

      lastPrintTotal.value = separateQueue.length;
      const sepResult = await startSeparatePrint(separateQueue, createWriteFn(), factoryId, {
        workOrderMasterId: row.workOrderMasterId,
        workOrderMasterName: row.workOrderMasterName,
        confirmBy: employeeId,
        isNoMixGlue: true,
        lastPrintTotal: separateQueue.length,
      }, createPrintRuntimeOptions());

      const sepFailed = hasPrintFailures(sepResult, separateQueue.length);
      showPrintResultToast(sepResult.printedCount, separateQueue.length, sepFailed);
      if (sepFailed) {
        await ensureGapConfirmed();
        showRetryDialog.value = true;
        printingWorkOrderId.value = null;
        return { success: false, labelCount: separateQueue.length };
      }
      markRowQipPrinted(row.workOrderMasterId);
      printingWorkOrderId.value = null;
      return { success: true, labelCount: separateQueue.length };
    } else {
      // --- Mix glue ---
      printFlowKind.value = 'mix';
      await clearMixFailedItems();

      const { data: woResponse } = await workOrder.getWorkOrder(factoryId, row.workOrderMasterId, 2);
      if (!woResponse?.success || !woResponse?.data) {
        showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: woResponse?.message || t('listMixGlue.toast.loadOrderFailed'), life: 6000 });
        printingWorkOrderId.value = null;
        return { success: false };
      }
      const respData = woResponse.data;
      if (!respData.mixGlueMasterId) {
        showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('listMixGlue.toast.mixGlueIdNotFound'), life: 6000 });
        printingWorkOrderId.value = null;
        return { success: false };
      }

      const mixQueue = buildPrintQueue(respData, row);
      if (!mixQueue.length) {
        showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('listMixGlue.toast.noLabels'), life: 3000 });
        printingWorkOrderId.value = null;
        return { success: true, labelCount: 0 };
      }

      lastPrintTotal.value = mixQueue.length;
      const mixResult = await startMixPrint(mixQueue, createWriteFn(), factoryId, {
        workOrderMasterId: row.workOrderMasterId,
        workOrderMasterName: row.workOrderMasterName,
        confirmBy: employeeId,
        lastPrintTotal: mixQueue.length,
      }, createPrintRuntimeOptions());

      const mixFailed = hasPrintFailures(mixResult, mixQueue.length);
      showPrintResultToast(mixResult.printedCount, mixQueue.length, mixFailed);
      if (mixFailed) {
        await ensureGapConfirmed();
        showRetryDialog.value = true;
        printingWorkOrderId.value = null;
        return { success: false, labelCount: mixQueue.length };
      }
      markRowQipPrinted(row.workOrderMasterId);
      printingWorkOrderId.value = null;
      return { success: true, labelCount: mixQueue.length };
    }
  } catch (error: any) {
    console.error(error);
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: error?.response?.data?.message || error?.message || t('listMixGlue.toast.printFailed'), life: 6000 });
    printingWorkOrderId.value = null;
    return { success: false };
  }
};

const handleRetryPrint = async () => {
  const factoryId = authStore.user?.factoryId;
  if (!factoryId) return;

  if (!(await ensureGapConfirmed())) return;

  if (!(await ensurePrinterReady())) {
    showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('listMixGlue.toast.printerNotConnected'), life: 3000 });
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
      // Tiếp tục queue còn lại
      continueQueueAfterMixRetry(executeMixPrintJob);
    } else {
      showRetryDialog.value = true;
    }
  } finally {
    printingWorkOrderId.value = null;
  }
};

const restorePendingPrintJob = async () => {
  const isAlreadyPrintedOnList = (workOrderMasterId: string) => {
    const row = lineDetails.value.find((item) => item.workOrderMasterId === workOrderMasterId);
    return row ? isRowQipPrinted(row) : false;
  };

  const mixRestored = await restoreMixPendingFromStorage();
  if (mixRestored) {
    if (isAlreadyPrintedOnList(mixRestored.workOrderMasterId)) {
      await clearMixFailedItems();
      return;
    }
    printFlowKind.value = 'mix';
    lastPrintTotal.value = mixRestored.lastPrintTotal;
    showRetryDialog.value = true;
    showToast({
      severity: 'info',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.pendingRestored', { count: mixRestored.failedItems.length }),
      life: 3000,
    });
    return;
  }

  const separateRestored = await restoreSeparatePendingFromStorage();
  if (!separateRestored) return;

  if (isAlreadyPrintedOnList(separateRestored.workOrderMasterId)) {
    await clearSeparateFailedItems();
    return;
  }

  printFlowKind.value = 'separate';
  lastPrintTotal.value = separateRestored.lastPrintTotal;
  showRetryDialog.value = true;
  showToast({
    severity: 'info',
    summary: t('listMixGlue.toast.warning'),
    detail: t('listMixGlue.toast.pendingRestored', { count: separateRestored.failedItems.length }),
    life: 3000,
  });
};

const fetchWorkOrders = async (page: number, pageSize: number) => {
  const requestId = startRequest();
  isLoadingLine.value = true;
  // keep-alive re-enter: giữ rows cũ, tránh flash skeleton.
  if (lineDetails.value.length === 0) {
    lineDetails.value = createSkeletonRows(pageSize);
  }

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
      const items = resData.data.items
        .map((item) => mapWorkOrderListItem(item as unknown as Record<string, unknown>))
        .map((item) => applyPrintedStateToListItem(item));
      const meta = parseCursorPagedMeta(resData.data, page, pageSize);
      lineDetails.value = items;
      ensureMixingDevicesHydrated();
      mixingDevicesStore.syncAssignmentsFromRows(items);
      currentPage.value = meta.page;
      rowsPerPage.value = meta.pageSize;
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
      scrollToSelectedRow();
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
  if (mixPrintQueueCount.value > 0) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('listMixGlue.toast.printQueueBackBlocked', { count: mixPrintQueueCount.value }),
      life: 3000,
    });
    return;
  }
  router.push('/app-menu');
};

/**
 * Thả hàng list khỏi heap khi rời page (menu / detail).
 * Giữ: printedWorkOrderIds, pending print (memory + storage), selectedItem, filter.
 * Không clear khi đang in / đang scan.
 */
const releaseListTableMemory = () => {
  if (isPrinting.value || isScanning.value) return;
  lineDetails.value = [];
};

usePageLifecycle({
  onEnter: () => {
    currentPage.value = 1;
    showPrinterUi.value = false;

    // Kick API trước mọi việc nặng (BT/print UI) — giảm khoảng trống ~7s trước request.
    const fetchPromise = fetchWorkOrders(1, rowsPerPage.value);

    resetLabelPrintSession();
    clearMixPrintQueue();

    // Hoãn mount BT/dialog sau khi fetch đã schedule + frame paint.
    void nextTick(() => {
      requestAnimationFrame(() => {
        showPrinterUi.value = true;
      });
    });

    // Restore pending sau fetch — không chặn onEnter/onAfterEnter.
    void fetchPromise.then(() => restorePendingPrintJob());
  },
  onAfterEnter: () => {
    // BluetoothPrinterStatus tự init onMounted; gọi lại khi ref đã có (re-enter keep-alive).
    void nextTick(() => {
      bluetoothRef.value?.initBluetooth?.();
    });
    // Warm management ngoài critical path — tránh tranh CPU lúc vào list.
    window.setTimeout(() => {
      void import('@/views/Tablet/MixGlue/MixGlueManagement.vue');
      void import('@/components/ElectronicScale.vue');
      void import('@/components/ScaleDevicePicker.vue');
    }, 2000);
  },
  onLeave: () => {
    if (isScanning.value) {
      void cancelScan();
    }
    bluetoothRef.value?.pauseBluetooth?.();
    showPrinterUi.value = false;
    // keep-alive: không clear table — lần vào lại hiện data cũ trong lúc refetch.
  },
});
</script>

<style scoped>
.tablet-list-header :deep(.app-header__toolbar) {
  min-height: 50px;
  padding-inline: 4px 8px;
}

.header-back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 4px 4px 4px 6px;
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
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 50px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-wrap {
  word-break: break-word;
  white-space: normal;
}

.print-auth-password-field {
  width: 100%;
}

.print-auth-scan-btn {
  width: 4.5rem;
  height: 4.5rem;
  flex-shrink: 0;
}

.print-auth-scan-btn :deep(.p-button-icon) {
  font-size: 2.5rem;
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

.mixing-device-usage-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.mixing-device-usage-chip strong {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.mixing-device-usage-chip--full {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}
</style>

<style>
body.barcode-scanner-active,
html.barcode-scanner-active,
.app-shell.barcode-scanner-active {
  visibility: hidden;
  background: transparent !important;
  --background: transparent;
}

body.barcode-scanner-active .scan-camera-overlay,
html.barcode-scanner-active .scan-camera-overlay,
.app-shell.barcode-scanner-active .scan-camera-overlay {
  visibility: visible;
}

body.barcode-scanner-active .app-page,
body.barcode-scanner-active .app-content,
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

.list-mix-glue-status-icon {
  font-size: 1.5rem;
  color: #22c55e;
  line-height: 1;
}

.glue-confirm-btn-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.glue-confirm-device-chip {
  position: absolute;
  top: -0.40rem;
  right: -0.95rem;
  z-index: 0;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.8rem;
  text-align: center;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.5);
  pointer-events: none;
  transition:
    transform 0.25s ease,
    background-color 0.25s ease,
    opacity 0.25s ease,
    box-shadow 0.35s ease,
    border-color 0.35s ease;
}

.glue-confirm-device-chip--pending {
  background: #9ca3af;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.22);
  animation: none;
}

.glue-confirm-device-chip--success {
  background: #86e35b;
  box-shadow:
    0 0 0 0 rgba(41, 231, 28, 0.4),
    0 1px 3px rgba(15, 23, 42, 0.22);
  animation: glue-device-chip-glow-success 2s ease-in-out infinite;
}

@keyframes glue-device-chip-glow-success {

  0%,
  100% {
    box-shadow:
      0 0 0 0 rgba(41, 231, 28, 0.35),
      0 0 6px 0 rgba(41, 231, 28, 0.25),
      0 1px 3px rgba(15, 23, 42, 0.22);
    border-color: rgba(255, 255, 255, 0.5);
  }

  50% {
    box-shadow:
      0 0 0 3px rgba(41, 231, 28, 0),
      0 0 10px 5px rgba(41, 231, 28, 0.35),
      0 1px 3px rgba(15, 23, 42, 0.22);
    border-color: rgba(186, 248, 180, 0.9);
  }
}

.glue-device-badge-enter-active,
.glue-device-badge-leave-active {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease,
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.glue-device-badge-enter-from,
.glue-device-badge-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

.glue-confirm-device-chip--pending.glue-device-badge-enter-to {
  background: #9ca3af;
  transform: scale(1.06);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.22);
}

.glue-confirm-device-chip--success.glue-device-badge-enter-to {
  background: #86e35b;
  transform: scale(1.06);
  box-shadow:
    0 0 0 3px rgba(41, 231, 28, 0),
    0 0 8px 2px rgba(41, 231, 28, 0.4),
    0 1px 3px rgba(15, 23, 42, 0.22);
}
</style>