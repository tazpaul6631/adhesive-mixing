<template>
  <AppPage>
    <AppHeader no-border class="tablet-list-header">
      <template #start>
        <button type="button" class="header-back" @click="goBack">
          <i class="pi pi-angle-left text-xl mr-1"></i>
          <h1 class="header-title">{{ t('mixGlueManagement.pageTitle') }}</h1>
        </button>
      </template>
      <template #end>
        <div class="flex align-items-center gap-2 mr-2">
          <NetworkStatusIcon />
          <LocaleSelect device-scope="tablet" />
        </div>
      </template>
    </AppHeader>

    <AppContent class="mix-glue-management-content" :scroll="false" :padding="true">
      <div class="mix-glue-layout main-container">
        <!-- Thông tin header — cố định, không scroll -->
        <div class="mix-glue-header-card surface-card p-2 shadow-1 border-round-xl">
          <div class="mix-glue-header-fields">
            <div class="mix-glue-header-field mix-glue-header-field--order">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.workOrder') }}</label>
              <InputText v-model="headerInfo.orderNo" readonly
                class="font-bold text-blue-600 mix-glue-header-input mix-glue-header-input--fit"
                :style="{ width: headerFieldWidthFit(headerInfo.orderNo, 10) }" />
            </div>
            <div class="mix-glue-header-field mix-glue-header-field--glue">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.glue') }}</label>
              <InputText v-model="headerInfo.glue" readonly
                class="font-bold text-blue-600 mix-glue-header-input mix-glue-header-input--truncate"
                :style="{ width: headerFieldWidth(headerInfo.glue, 6, 18) }" :title="headerInfo.glue" />
            </div>
            <div class="mix-glue-header-field mix-glue-header-field--weight">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.totalWeight') }}</label>
              <InputText v-model="headerInfo.totalWeight" readonly class="font-bold text-blue-600 mix-glue-header-input"
                :style="{ width: headerFieldWidth(headerInfo.totalWeight, 5, 10) }" />
            </div>
            <div class="mix-glue-header-field mix-glue-header-field--weight">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.totalWeightActual')
              }}</label>
              <InputText :model-value="totalWeightActualDisplay" readonly
                class="font-bold text-blue-600 mix-glue-header-input"
                :style="{ width: headerFieldWidth(totalWeightActualDisplay, 5, 10) }" />
            </div>
            <div class="mix-glue-header-actions">
              <Button icon="pi pi-list" outlined class="button-lg" :title="t('mixGlueManagement.sections.lineDetails')"
                :aria-label="t('mixGlueManagement.sections.lineDetails')" @click="showLineDetailsDialog = true" />
              <Button
                :disabled="mixGlueConfirm || hasWorkOrderDataErrors || isCompleting || isChietPending || isNavigatingAway || isPageDataLoading"
                :loading="isCompleting || isChietPending" icon="pi pi-check-circle" severity="success" class="button-lg"
                @click="handleComplete" />
            </div>
          </div>
        </div>

        <!-- Vùng bảng — scroll khi nội dung dài -->
        <div class="mix-glue-scroll-body">
          <!-- BẢNG 2: Keo trộn -->
          <transition name="slide-fade">
            <div v-if="canShowTable2Content" class="surface-card p-0 shadow-1 border-round-xl mix-glue-section-card">
              <div
                class="surface-100 p-2 border-round-top-xl flex align-items-center justify-content-between gap-3 flex-wrap mix-glue-section-head">
                <span class="font-bold text-700 text-lg">
                  <i class="pi pi-box mr-2"></i>{{ t('mixGlueManagement.sections.mixingComponents') }}
                </span>
                <div class="flex align-items-center gap-2">
                  <div v-if="isPrinting" class="print-progress-chip">
                    <i class="pi pi-spin pi-spinner" style="font-size:0.85rem"></i>
                    <span>{{ progress.current }}/{{ progress.total }}</span>
                  </div>
                  <Button v-if="hasPendingPrint" icon="pi pi-exclamation-triangle" severity="warn" outlined size="large"
                    :badge="String(pendingCount)" badgeSeverity="danger"
                    :title="t('listMixGlue.print.pendingButtonTitle', { count: pendingCount })"
                    :aria-label="t('listMixGlue.print.pendingButtonTitle', { count: pendingCount })"
                    @click="openPendingPrintDialog" />
                  <BluetoothPrinterStatus v-if="showDeviceUi" ref="bluetoothRef" />
                  <span class="mx-2">|</span>
                  <ScaleDevicePicker v-if="showDeviceUi && hasMixChemicals" :session-id="mixGlueScaleSessionId" />
                </div>
              </div>

              <div v-if="isLoadingComponent" class="border-round-bottom-xl mix-glue-table-slot">
                <MixingComponentsTable :is-loading="true" :components="[]" :header-total-weight="headerInfo.totalWeight"
                  v-model:selectedItem="selectedItem" :disabled="true" :scroll-height="mixTableScrollHeight" />
              </div>

              <template v-else-if="hasMixChemicals">
                <div class="md:p-2 surface-50 border-bottom-1 surface-border mix-glue-scale-bar">
                  <div class="grid formgrid align-items-end">
                    <div class="col-12 sm:col-5 lg:col-5 lg:mb-0">
                      <label class="text-800 font-medium mb-2 block">{{ t('mixGlueManagement.fields.componentCode')
                      }}</label>
                      <InputText v-model="mixingProcess.component" readonly
                        class="font-bold text-primary border-blue-200" style="width: 350px;" />
                    </div>

                    <ElectronicScale v-if="showDeviceUi" :scale-session-id="mixGlueScaleSessionId" hide-scale-picker
                      :weight-unit="activeComponent?.weightUnit" :target-weight="mixTargetWeight"
                      :lower-tolerance="activeComponent?.lowerTolerance ?? ''"
                      :upper-tolerance="activeComponent?.upperTolerance ?? ''"
                      :lower-tolerance-unit="activeComponent?.lowerToleranceUnit"
                      :upper-tolerance-unit="activeComponent?.upperToleranceUnit"
                      :enforce-tolerance="mixTargetWeight > 0"
                      :locked-weight="activeComponent?.weighingTime ? (activeComponent?.actualWeight ?? '') : ''"
                      :disable-confirm="!!activeComponent?.weighingTime" @update:weight="handleWeightChange"
                      @confirm-weight="handleConfirmWeight" />
                  </div>
                </div>

                <div class="border-round-bottom-xl mix-glue-table-slot">
                  <div ref="table2Ref" class="table-wrapper">
                    <MixingComponentsTable :is-loading="isLoadingComponent" :components="componentDetailsFull"
                      :header-total-weight="headerInfo.totalWeight" v-model:selectedItem="selectedItem"
                      :disabled="mixGlueConfirm" :is-printing="isPrintingComponent"
                      :printing-material-code="printingMaterialCode" :scroll-height="mixTableScrollHeight"
                      @row-click="onRowClick" @open-new="openMixComponentDialog" @delete-row="handleDeleteComponent"
                      @print-row="handlePrintComponent" />
                  </div>

                  <!-- MODAL THÊM THÀNH PHẦN -->
                  <AddComponentDialog v-if="showDeviceUi" v-model:visible="productDialog"
                    :materials-list="materialsList" :is-loading-materials="isLoadingMaterials"
                    @fetch-materials="fetchMaterials" @save="handleSaveNewComponent" />
                </div>
              </template>
            </div>
          </transition>

          <!-- BẢNG 3: Keo không trộn -->
          <transition name="slide-fade">
            <div v-if="canShowTable3Content" class="surface-card p-0 shadow-1 border-round-xl mix-glue-section-card">
              <div
                class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between gap-3 flex-wrap mix-glue-section-head">
                <span class="font-bold text-700 text-lg">
                  <i class="pi pi-box mr-2"></i>{{ t('mixGlueManagement.sections.noMixComponents') }}
                </span>
                <ScaleDevicePicker v-if="showDeviceUi && hasNoMixChemicals" :session-id="mixGlueScaleSessionId"
                  :auto-connect="false" />
              </div>

              <div v-if="isLoadingComponent" class="overflow-x-auto border-round-bottom-xl mix-glue-table-slot">
                <NoSeparateGlue :is-loading="true" :no-mix-chemicals="[]" :header-total-weight="headerInfo.totalWeight"
                  :disabled="true" v-model:selectedItem="selectedItemNoMix" :scroll-height="noMixTableScrollHeight" />
              </div>

              <template v-else-if="hasNoMixChemicals">
                <div class="md:p-2 surface-50 border-bottom-1 surface-border mix-glue-scale-bar">
                  <div class="grid formgrid align-items-end">
                    <div class="col-12 sm:col-5 lg:col-5 lg:mb-0">
                      <label class="text-800 font-medium mb-2 block">{{ t('mixGlueManagement.fields.componentCode')
                      }}</label>
                      <InputText v-model="noMixMixingProcess.component" readonly
                        class="font-bold text-primary border-blue-200" style="width: 350px;" />
                    </div>

                    <ElectronicScale v-if="showDeviceUi" :scale-session-id="mixGlueScaleSessionId" hide-scale-picker
                      :weight-unit="activeNoMixComponent?.weightUnit" :target-weight="noMixTargetWeight"
                      :lower-tolerance="noMixScaleTolerance.lower" :upper-tolerance="noMixScaleTolerance.upper"
                      :enforce-tolerance="!!activeNoMixComponent && noMixTargetWeight > 0"
                      :locked-weight="activeNoMixComponent?.weighingTime ? (activeNoMixComponent?.actualWeight ?? '') : ''"
                      :disable-confirm="!!activeNoMixComponent?.weighingTime" @update:weight="handleNoMixWeightChange"
                      @confirm-weight="handleConfirmNoMixWeight" />
                  </div>
                </div>

                <div class="overflow-x-auto border-round-bottom-xl mix-glue-table-slot">
                  <div class="table-wrapper">
                    <NoSeparateGlue :is-loading="isLoadingComponent" :no-mix-chemicals="noMixComponents"
                      :header-total-weight="headerInfo.totalWeight" :disabled="mixGlueConfirm"
                      :is-submitting="isCompleting || isChietPending" v-model:selectedItem="selectedItemNoMix"
                      :scroll-height="noMixTableScrollHeight" @row-click="onNoMixRowClick"
                      @delete-row="handleDeleteNoMixComponent" @chiet-row="handleChietRow" />
                  </div>
                </div>
              </template>
            </div>
          </transition>

          <div v-if="firstDataValidationError" class="mix-glue-consolidated-validation">
            <MixGlueDataValidationAlert :type="firstDataValidationError" />
          </div>
        </div>
      </div>
    </AppContent>

    <BatchPrintRetryDialog v-if="showDeviceUi" v-model:visible="showRetryDialog" locale-scope="listMixGlue"
      :failed-items="failedItems" :loading="isPrinting" @retry="handleRetryPrint" />

    <Dialog v-model:visible="showLineDetailsDialog" modal class="line-details-dialog"
      :header="t('mixGlueManagement.sections.lineDetails')" :style="{ width: 'min(96vw, 960px)' }"
      :breakpoints="{ '960px': '96vw' }" :contentStyle="{
        maxHeight: 'min(70vh, 560px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '1rem',
      }">
      <LineDetailsTable :is-loading="isLoadingLine" :line-details="lineDetails" />
    </Dialog>

    <Dialog v-model:visible="showExitDialog" modal :header="t('mixGlueManagement.exitAlert.header')"
      :style="{ width: 'min(92vw, 420px)' }" :closable="false" @hide="onExitDialogHide">
      <p class="m-0 text-600 line-height-3">{{ t('mixGlueManagement.exitAlert.message') }}</p>
      <template #footer>
        <Button :label="t('mixGlueManagement.exitAlert.stay')" icon="pi pi-times" text severity="secondary" size="large"
          :disabled="isExitConfirming" @click="onExitStay" />
        <Button :label="t('mixGlueManagement.exitAlert.exit')" icon="pi pi-sign-out" severity="danger" size="large"
          :loading="isExitConfirming" @click="onExitConfirm" />
      </template>
    </Dialog>
  </AppPage>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed, defineAsyncComponent } from 'vue';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import { AppPage, AppHeader, AppContent } from '@/components/layout';
import { useAppToast } from '@/composables/useAppToast';
import { useAppBackButton } from '@/composables/useAppBackButton';
import { usePageLifecycle } from '@/composables/usePageLifecycle';
import UI from '@/mixins/present';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore, isMixGlueDraftRestorable } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import materialApi from '@/api/material';
import mixGlueApi from '@/api/mixGlue';
import separateGlue from '@/api/separate';
import { buildSeparateGlueCommandPayload } from '@/views/Tablet/Separate/separateMixedGlue.payload';
import type { PayloadBuildContext } from '@/views/Tablet/Separate/separateMixedGlue.types';

import LineDetailsTable from '@/views/Tablet/MixGlue/components/LineDetailsTable.vue';
import MixGlueDataValidationAlert from '@/views/Tablet/MixGlue/components/MixGlueDataValidationAlert.vue';
import MixingComponentsTable from '@/views/Tablet/MixGlue/components/MixingComponentsTable.vue';
import NoSeparateGlue from '@/views/Tablet/Separate/components/NoSeparateGlue.vue';
import { useMixGlueNoMixChiet } from '@/views/Tablet/MixGlue/useMixGlueNoMixChiet';
import LocaleSelect from '@/components/LocaleSelect.vue';
import NetworkStatusIcon from '@/views/Mobile/components/NetworkStatusIcon.vue';
import { useAppLocale } from '@/composables/useAppLocale';
import { useRequireOnline } from '@/composables/useRequireOnline';
import { useTabletPageLayout } from '@/composables/useTabletPageLayout';
import { useMixGlueLabelBatchPrint } from '@/composables/useMixGlueLabelBatchPrint';
import { buildComponentWeightLabelTspl } from '@/services/componentWeightLabelPrint';
import { useLabelPrintGapConfirm } from '@/composables/useLabelPrintGapConfirm';
import { ensureGapConfirmed, notifyPrintInterrupted } from '@/services/labelPrintSession';
import { normalizeWeightUnit, toKilograms } from '@/utils/weightUnit';
import format from '@/mixins/format';

/** Lazy UI only — không đổi composable/service print-BT-scale. */
const ElectronicScale = defineAsyncComponent(() => import('@/components/ElectronicScale.vue'));
const ScaleDevicePicker = defineAsyncComponent(() => import('@/components/ScaleDevicePicker.vue'));
const BluetoothPrinterStatus = defineAsyncComponent(() => import('@/components/BluetoothPrinterStatus.vue'));
const BatchPrintRetryDialog = defineAsyncComponent(() => import('@/components/BatchPrintRetryDialog.vue'));
const AddComponentDialog = defineAsyncComponent(
  () => import('@/views/Tablet/MixGlue/components/AddComponentDialog.vue'),
);

dayjs.extend(customParseFormat);

const MIX_GLUE_SCALE_SESSION = 'mix-glue-scale-session';

const mixGlueScaleSessionId = MIX_GLUE_SCALE_SESSION;
const { t } = useAppLocale(() => 'tablet');
const { requireOnline, notifyOfflineFromError } = useRequireOnline();
useLabelPrintGapConfirm('listMixGlue');

// ============================================================================
// BLUETOOTH PRINTER
// ============================================================================
const bluetoothRef = ref<{
  initBluetooth?: () => void;
  pauseBluetooth?: () => void;
  writeTspl?: (tspl: string) => Promise<boolean>;
  isConnected?: () => boolean;
  verifyHardwareConnected?: () => Promise<boolean>;
  connectForPrint?: () => Promise<void>;
} | null>(null);
/** Mount BT/scale/print UI sau nextTick — song song fetch, không đổi logic. */
const showDeviceUi = ref(false);
const showRetryDialog = ref(false);
const lastPrintTotal = ref(0);

const {
  isPrinting,
  progress,
  failedItems,
  printJobContext,
  hasPendingPrint,
  pendingCount,
  clearFailedItems,
  restorePendingFromStorage,
  retryFailed,
} = useMixGlueLabelBatchPrint();

const createWriteFn = () =>
  (tspl: string) => bluetoothRef.value?.writeTspl?.(tspl) ?? Promise.resolve(false);

const createPrintRuntimeOptions = () => ({
  isConnected: () => bluetoothRef.value?.isConnected?.() ?? false,
});

const openPendingPrintDialog = () => {
  if (hasPendingPrint.value) showRetryDialog.value = true;
};

const handleRetryPrint = async () => {
  const factoryId = authStore.user?.factoryId;
  if (!factoryId) return;

  if (!(await ensureGapConfirmed())) return;

  if (!(await bluetoothRef.value?.verifyHardwareConnected?.())) {
    showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('listMixGlue.toast.printerNotConnected'), life: 3000 });
    return;
  }

  const workOrderMasterId = printJobContext.value?.workOrderMasterId;
  try {
    const result = await retryFailed(createWriteFn(), factoryId, createPrintRuntimeOptions());
    const total = printJobContext.value?.lastPrintTotal ?? lastPrintTotal.value;
    const printFailed = !result.ok || result.failedItems.length > 0 || result.printedCount < total;

    if (!printFailed) {
      showRetryDialog.value = false;
      lastPrintTotal.value = 0;
      if (workOrderMasterId) {
        showToast({ severity: 'success', summary: t('listMixGlue.toast.success'), detail: t('listMixGlue.toast.printSuccess', { count: result.printedCount }), life: 3000 });
      }
    } else {
      showRetryDialog.value = true;
    }
  } catch (error) {
    console.error(error);
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('listMixGlue.toast.printFailed'), life: 6000 });
  }
};

// ============================================================================
// IN TEM THÀNH PHẦN (component weight label)
// ============================================================================
const isPrintingComponent = ref(false);
const printingMaterialCode = ref<string | null>(null);

const ensurePrinterReady = async (): Promise<boolean> => {
  if (await bluetoothRef.value?.verifyHardwareConnected?.()) return true;
  await bluetoothRef.value?.connectForPrint?.();
  return (await bluetoothRef.value?.verifyHardwareConnected?.()) === true;
};

const buildPrintMixGlueLabelPayload = (row: any) => {
  const factoryId = authStore.user?.factoryId || '';
  const employeeId = authStore.user?.employeeId || '';
  const recordStatus = '0';

  return {
    factoryId,
    mgm: {
      factoryId,
      workOrderMasterId: currentWorkOrderId.value,
      recordStatus,
      createrId: employeeId,
      updaterId: employeeId,
      mixGlues: [
        {
          factoryId,
          materialCode: row.materialCode || 0,
          mixGlueWeight: Number(row.actualWeight) || 0,
          mixGlueWeightUnit: normalizeWeightUnit(row.weightUnit),
          weightCompleteDate: row.weighingTime ?? '',
          glueExtra: row.glueExtra || false,
          recordStatus,
          createrId: row.operatorId || employeeId,
          updaterId: row.operatorId || employeeId,
        },
      ],
    },
  };
};

const handlePrintComponent = async (row: any) => {
  if (!row.weighingTime) {
    showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('listMixGlue.toast.componentLabel.notConfirmed'), life: 3000 });
    return;
  }
  if (isPrintingComponent.value) return;

  // Khóa UI sớm — tránh spam trong lúc connect / gap / check mạng
  isPrintingComponent.value = true;
  printingMaterialCode.value = row.materialCode ?? null;

  try {
    // Chỉ kết nối lại khi chưa connected — tránh verify gây re-render BluetoothPrinterStatus
    if (!bluetoothRef.value?.isConnected?.()) {
      const ready = await ensurePrinterReady();
      if (!ready) {
        showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('listMixGlue.toast.componentLabel.printerNotConnected'), life: 3000 });
        return;
      }
    }

    if (!(await ensureGapConfirmed())) return;
    if (!(await requireOnline())) return;

    const { data: apiRes } = await mixGlueApi.postPrintMixGlueLabel(buildPrintMixGlueLabelPayload(row));
    if (!apiRes?.success) {
      showToast({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: apiRes?.message || t('listMixGlue.toast.componentLabel.printFailed'),
        life: 6000,
      });
      return;
    }

    const labelCode = String(apiRes.data ?? '');
    if (!labelCode) {
      showToast({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: t('listMixGlue.toast.componentLabel.printFailed'),
        life: 6000,
      });
      return;
    }

    const tspl = buildComponentWeightLabelTspl({
      workOrderMasterName: headerInfo.value.orderNo,
      requestTime: lineDetails.value[0]?.requestTime,
      glueName: headerInfo.value.glue,
      materialName: row.materialName ?? '',
      actualWeight: row.actualWeight ?? '',
      weightUnit: normalizeWeightUnit(row.weightUnit),
      weighingTime: row.weighingTime ?? '',
      labelCode,
    });

    const ok = await (bluetoothRef.value?.writeTspl?.(tspl) ?? Promise.resolve(false));

    if (!ok) {
      notifyPrintInterrupted();
      await ensureGapConfirmed();
    }

    showToast({
      severity: ok ? 'success' : 'error',
      summary: ok ? t('listMixGlue.toast.success') : t('listMixGlue.toast.error'),
      detail: ok ? t('listMixGlue.toast.componentLabel.printSuccess') : t('listMixGlue.toast.componentLabel.printFailed'),
      life: ok ? 3000 : 6000,
    });
  } catch (error) {
    if (notifyOfflineFromError(error)) return;
    console.error(error);
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('listMixGlue.toast.componentLabel.printFailed'), life: 6000 });
  } finally {
    isPrintingComponent.value = false;
    printingMaterialCode.value = null;
  }
};

const restorePendingPrintJob = async () => {
  const restored = await restorePendingFromStorage();
  if (!restored) return;

  lastPrintTotal.value = restored.lastPrintTotal;
  showRetryDialog.value = true;
  showToast({
    severity: 'info',
    summary: t('listMixGlue.toast.warning'),
    detail: t('listMixGlue.toast.pendingRestored', { count: restored.failedItems.length }),
    life: 3000,
  });
};
// ============================================================================
// 1. INTERFACES & TYPES (Updated to match the new JSON structure)
// ============================================================================
interface LineDetail {
  factoryId?: string;
  workOrderDetailId?: string;
  workOrderMasterId?: string;
  workOrderMasterName?: string;
  requestDetailId?: string;
  requestDetailName?: string;
  chemicalMasterId?: string;
  workOrderWeight?: string;
  workOrderWeightUnit?: string;
  requestTime?: string;
  styleId?: string;
  styleName?: string;
  productLineId?: string;
  productLineName?: string;
}

interface ComponentDetail {
  glueExtra?: boolean;
  mixGlue?: boolean;
  noMixGlue?: boolean;
  recordStatus?: string;
  bucketId?: number | string;
  confirmDate?: string;
  factoryId?: string;
  styleChemicalId?: string;
  chemicalId?: string;
  styleId?: string;
  styleName?: string;
  chemicalMasterId?: string;
  chemicalCompositionId?: string;
  mixingRatio?: string;
  lowerTolerance?: string;
  upperTolerance?: string;
  lowerToleranceUnit?: string;
  upperToleranceUnit?: string;
  materialCode?: string;
  materialName?: string;
  weightUnit?: string;
  requiredWeight?: string;
  actualWeight?: string;
  operator?: string;
  operatorId?: string;
  weighingTime?: string;
  isNoMixGlue?: boolean;
  glueWeight?: string;
}

const selectedItem = ref<ComponentDetail | null>(null);
const selectedItemNoMix = ref<ComponentDetail | null>(null);
const mixingProcess = ref({ component: '', weight: '' });
const noMixMixingProcess = ref({ component: '', weight: '' });
const activeComponent = ref<ComponentDetail | null>(null);
const activeNoMixComponent = ref<ComponentDetail | null>(null);

// ============================================================================
// 2. GLOBAL SETUP & REFS CHUNG
// ============================================================================
const { showToast } = useAppToast();
const authStore = useAuthStore();
const draftStore = useMixGlueDraftStore();
const route = useRoute();
const router = useRouter();

const currentWorkOrderId = ref('');
const isDirty = ref(false);

// ============================================================================
// 3. LOGIC LẤY & LƯU DỮ LIỆU ĐƠN HÀNG (WORK ORDER)
// ============================================================================
const headerInfo = ref({ orderNo: '', glue: '', totalWeight: '' });
const lineDetails = ref<LineDetail[]>([]);
const componentDetailsFull = ref<ComponentDetail[]>([]);
const noMixComponents = ref<ComponentDetail[]>([]);
const isLoadingLine = ref(true);
const isLoadingComponent = ref(true);
const isPageDataLoading = computed(() => isLoadingLine.value || isLoadingComponent.value);
const hourlyValidity = ref<string>('0');
const showLineDetailsDialog = ref(false);
const mixGlueConfirm = ref(false);
const isCompleting = ref(false);
const isNavigatingAway = ref(false);
const isNoMixGlue = ref(false);
const startDate = ref('');
const endDate = ref('');

watch(componentDetailsFull, () => {
  if (!isLoadingComponent.value) isDirty.value = true;
}, { deep: true });

watch(noMixComponents, () => {
  if (!isLoadingComponent.value) isDirty.value = true;
}, { deep: true });

const hasMixChemicals = computed(() => componentDetailsFull.value.length > 0);
const hasNoMixChemicals = computed(() => noMixComponents.value.length > 0);

type DataValidationErrorType = 'orderDetails' | 'mixChemicals' | 'noMixChemicals';

/** BE trả theo thứ tự orderDetails → mixChemicals → noMixChemicals; lỗi đầu tiên thì dừng. */
const resolveFirstDataValidationError = (): DataValidationErrorType | null => {
  if (isLoadingLine.value || isLoadingComponent.value) return null;
  if (lineDetails.value.length === 0) return 'orderDetails';
  if (!isNoMixGlue.value && componentDetailsFull.value.length === 0) return 'mixChemicals';
  if (isNoMixGlue.value && noMixComponents.value.length === 0) return 'noMixChemicals';
  return null;
};

const firstDataValidationError = computed(() => resolveFirstDataValidationError());

const canShowTable2Content = computed(
  () =>
    !isNoMixGlue.value &&
    firstDataValidationError.value !== 'orderDetails' &&
    firstDataValidationError.value !== 'mixChemicals' &&
    (hasMixChemicals.value || isLoadingComponent.value)
);
const canShowTable3Content = computed(
  () =>
    isNoMixGlue.value &&
    firstDataValidationError.value !== 'orderDetails' &&
    firstDataValidationError.value !== 'mixChemicals' &&
    firstDataValidationError.value !== 'noMixChemicals' &&
    (hasNoMixChemicals.value || isLoadingComponent.value)
);

/** Số bảng hiện trên màn — chia chiều cao scroll theo máy tablet. */
const stackedManagementTables = computed(() => {
  let n = 0;
  if (canShowTable2Content.value) n += 1;
  if (canShowTable3Content.value) n += 1;
  return Math.max(1, n);
});

/** Chrome: app header + WO card + section title + scale bar. */
const { tableScrollHeight: managementTableScrollHeight } = useTabletPageLayout({
  stackedTables: stackedManagementTables,
  pageChromeOffset: 460,
});

/** Có data mới dùng chiều cao full (scroll trong bảng); empty/loading giữ thấp, ít scroll giả. */
const COMPACT_TABLE_SCROLL = '140px';

const mixTableScrollHeight = computed(() =>
  hasMixChemicals.value && !isLoadingComponent.value
    ? managementTableScrollHeight.value
    : COMPACT_TABLE_SCROLL
);

const noMixTableScrollHeight = computed(() =>
  hasNoMixChemicals.value && !isLoadingComponent.value
    ? managementTableScrollHeight.value
    : COMPACT_TABLE_SCROLL
);

const hasWorkOrderDataErrors = computed(() => firstDataValidationError.value != null);

const toKg = (weight: number, unit?: string) => toKilograms(weight, unit);

const sumActualWeightsKg = (rows: ComponentDetail[]) =>
  rows.reduce((sum, row) => {
    const weight = Number(row.actualWeight);
    if (!Number.isFinite(weight) || weight <= 0) return sum;
    return sum + toKg(weight, row.weightUnit);
  }, 0);

const totalWeightActualDisplay = computed(() => {
  const total =
    sumActualWeightsKg(componentDetailsFull.value) +
    sumActualWeightsKg(noMixComponents.value);
  return total.toFixed(3);
});

/** Width theo đủ độ dài value (không cắt …). */
const headerFieldWidthFit = (value: string | number | null | undefined, minCh: number) => {
  const len = String(value ?? '').length;
  const ch = Math.max(minCh, len + 2);
  return `${ch}ch`;
};

/** Width input cân — kẹp max, ổn định trên tablet. */
const headerFieldWidth = (value: string | number | null | undefined, minCh: number, maxCh: number) => {
  const len = String(value ?? '').length;
  const ch = Math.min(maxCh, Math.max(minCh, len + 2));
  return `${ch}ch`;
};

const mixTargetWeight = computed(() => {
  const row = activeComponent.value;
  if (!row) return 0;
  const weight = row.glueWeight ?? row.requiredWeight ?? '';
  return Number(weight) || 0;
});

/** Keo không trộn: dùng lower/upperTolerance từ BE; thiếu thì mặc định ±10g. Keo trộn: dùng BE. */
const NO_MIX_SCALE_TOLERANCE_GRAMS = 10;

const noMixTargetWeight = computed(() => {
  const row = activeNoMixComponent.value;
  if (!row) return 0;

  const direct = Number(row.glueWeight ?? row.requiredWeight ?? 0);
  if (direct > 0) return direct;

  if (!row.glueExtra && headerInfo.value.totalWeight) {
    return Number(headerInfo.value.totalWeight) || 0;
  }

  return 0;
});

const noMixScaleTolerance = computed(() => {
  const row = activeNoMixComponent.value;
  const defaultTol = NO_MIX_SCALE_TOLERANCE_GRAMS;

  if (!row) {
    return { lower: '', upper: '' };
  }

  const lower = Number(row.lowerTolerance);
  const upper = Number(row.upperTolerance);
  const hasLower = Number.isFinite(lower) && lower > 0;
  const hasUpper = Number.isFinite(upper) && upper > 0;

  return {
    lower: String(hasLower ? lower : defaultTol),
    upper: String(hasUpper ? upper : defaultTol),
  };
});

const mapMixChemicals = (items: any[] = []): ComponentDetail[] =>
  items.map((item: any) => ({
    ...item,
    materialCode: item.materialCode || '0',
    weightUnit: normalizeWeightUnit(item.weightUnit),
    glueWeight: item.glueWeight ?? item.requiredWeight ?? '',
    requiredWeight: item.requiredWeight || item.glueWeight || '',
    actualWeight: item.actualWeight || '',
    lowerTolerance: item.lowerTolerance || '0',
    upperTolerance: item.upperTolerance || '0',
    lowerToleranceUnit: item.lowerToleranceUnit || '',
    upperToleranceUnit: item.upperToleranceUnit || '',
    mixingRatio: item.mixingRatio || '100',
    glueExtra: item.glueExtra || false,
  }));

const applyWorkOrderMeta = (respData: any) => {
  mixGlueConfirm.value = respData.mixGlueConfirm;
  hourlyValidity.value = respData.hourlyValidity || '0';
  lineDetails.value = respData.orderDetails || [];
  isNoMixGlue.value = respData.isNoMixGlue === true;
  startDate.value = respData.startDate || new Date().toISOString();
  endDate.value = respData.endDate || new Date().toISOString();
};

const selectFirstMixComponent = () => {
  if (!componentDetailsFull.value.length) {
    activeComponent.value = null;
    selectedItem.value = null;
    mixingProcess.value.component = '';
    return;
  }

  const first = componentDetailsFull.value[0];
  if (!first.glueWeight && !first.glueExtra) {
    first.glueWeight = first.requiredWeight || headerInfo.value.totalWeight;
  }
  activeComponent.value = { ...first };
  mixingProcess.value.component = first.materialName || '';
  selectedItem.value = first;
};

const selectFirstNoMixComponent = () => {
  if (!noMixComponents.value.length) {
    activeNoMixComponent.value = null;
    selectedItemNoMix.value = null;
    noMixMixingProcess.value.component = '';
    return;
  }

  const first = noMixComponents.value[0];
  if (!first.glueWeight && !first.glueExtra) {
    first.glueWeight = first.requiredWeight || headerInfo.value.totalWeight;
  }
  activeNoMixComponent.value = { ...first };
  noMixMixingProcess.value.component = first.materialName || '';
  selectedItemNoMix.value = first;
};

let saveDraftSnapshot: () => Promise<void> = async () => { };
let completeNoMixGlue: () => Promise<void> = async () => { };

const {
  requestDetails,
  mixGlueMasterId,
  applyNoMixFromWorkOrder,
  restoreNoMixDraft,
  getNoMixDraftExtras,
  resetNoMixSection,
  onNoMixRowClick,
  handleDeleteNoMixComponent,
  handleChietRow,
  handleConfirmNoMixWeight,
  isRowWeighed,
  isChietPending,
} = useMixGlueNoMixChiet({
  headerInfo,
  mixGlueConfirm,
  isLoadingComponent,
  isNoMixGlue,
  currentWorkOrderId,
  noMixComponents,
  activeNoMixComponent,
  selectedItemNoMix,
  noMixMixingProcess,
  isCompleting,
  isNavigatingAway,
  saveDraftSnapshot: () => saveDraftSnapshot(),
  completeNoMixGlue: () => completeNoMixGlue(),
});

saveDraftSnapshot = async () => {
  await draftStore.saveDraft(currentWorkOrderId.value, {
    headerInfo: headerInfo.value,
    componentDetailsFull: componentDetailsFull.value,
    noMixComponents: noMixComponents.value,
    hourlyValidity: hourlyValidity.value,
    totalWeightActual: totalWeightActualDisplay.value,
    ...getNoMixDraftExtras(),
  });
};

const applyMixAndNoMixFromApi = (respData: any) => {
  componentDetailsFull.value = mapMixChemicals(respData.mixChemicals || []);
  applyNoMixFromWorkOrder(respData);
  selectFirstMixComponent();
  selectFirstNoMixComponent();
};

const fetchWorkOrderDetail = async (id: string) => {
  resetState();
  isLoadingLine.value = true;
  isLoadingComponent.value = true;
  currentWorkOrderId.value = id;
  const factoryId = authStore.user?.factoryId || '';

  try {
    await draftStore.ensureHydrated();
    const existingDraft = draftStore.getDraft(id);

    if (isMixGlueDraftRestorable(existingDraft)) {
      headerInfo.value = existingDraft!.headerInfo as typeof headerInfo.value;
      hourlyValidity.value = String(existingDraft!.hourlyValidity ?? '0');
      componentDetailsFull.value = Array.isArray(existingDraft!.componentDetailsFull)
        ? (existingDraft!.componentDetailsFull as ComponentDetail[])
        : [];
      restoreNoMixDraft(existingDraft!);

      const firstUnconfirmed = componentDetailsFull.value.find(item => !item.weighingTime) || componentDetailsFull.value[0];
      if (firstUnconfirmed) {
        selectedItem.value = firstUnconfirmed;
        activeComponent.value = { ...firstUnconfirmed };
        mixingProcess.value.component = firstUnconfirmed.materialName || '';
        await scrollToActiveRow('mix');
      }

      const firstUnconfirmedNoMix = noMixComponents.value.find(item => !item.weighingTime) || noMixComponents.value[0];
      if (firstUnconfirmedNoMix) {
        selectedItemNoMix.value = firstUnconfirmedNoMix;
        activeNoMixComponent.value = { ...firstUnconfirmedNoMix };
        noMixMixingProcess.value.component = firstUnconfirmedNoMix.materialName || '';
      }

      const { data } = await workOrder.getWorkOrder(factoryId, id, 1);
      if (data?.success) {
        const respData = data.data;
        applyWorkOrderMeta(respData);

        if (componentDetailsFull.value.length === 0) {
          componentDetailsFull.value = mapMixChemicals(respData.mixChemicals || []);
          selectFirstMixComponent();
        }

        if (noMixComponents.value.length === 0) {
          applyNoMixFromWorkOrder(respData, existingDraft!);
          selectFirstNoMixComponent();
        } else {
          applyNoMixFromWorkOrder(respData, existingDraft!);
        }
      }

      showToast({
        severity: 'info',
        summary: t('mixGlueManagement.toast.restore'),
        detail: t('mixGlueManagement.toast.restoreDetail'),
        life: 6000
      });
    } else {
      // 3. NẾU KHÔNG CÓ DRAFT: Chạy logic lấy API như cũ
      const { data } = await workOrder.getWorkOrder(factoryId, id, 1);
      if (data?.success) {
        const respData = data.data;

        headerInfo.value = {
          orderNo: respData.workOrderMasterName || '',
          glue: respData.chemicalMasterName || '',
          totalWeight: respData.workOrderWeight?.toString() || '',
        };

        applyWorkOrderMeta(respData);
        applyMixAndNoMixFromApi(respData);
      }
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu chi tiết:', error);
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.loadFailed'), life: 6000 });
  } finally {
    await finalizeLoading();
  }
};

const finalizeLoading = async () => {
  isLoadingLine.value = false;
  isLoadingComponent.value = false;
  await nextTick();
  isDirty.value = false;
};

type BuildPayloadOpts = { onlyProgressLines?: boolean };

const buildPayload = (recordStatus: string, opts?: BuildPayloadOpts) => {
  const factoryId = authStore.user?.factoryId || '';
  const employeeId = authStore.user?.employeeId || '';

  let rows = componentDetailsFull.value;
  if (opts?.onlyProgressLines) {
    rows = rows.filter(item => !!item.weighingTime || Number(item.actualWeight) > 0);
  }

  return {
    factoryId: factoryId,
    workOrderMasterId: currentWorkOrderId.value,
    recordStatus: recordStatus,
    hourlyValidity: Number(hourlyValidity.value),
    createrId: employeeId,
    updaterId: employeeId,
    mixGlues: rows.map(item => ({
      factoryId: factoryId,
      materialCode: item.materialCode || 0,
      mixGlueWeight: Number(item.actualWeight) || 0,
      mixGlueWeightUnit: normalizeWeightUnit(item.weightUnit),
      glueExtra: item.glueExtra || false,
      recordStatus: recordStatus,
      createrId: item.operatorId || employeeId,
      updaterId: item.operatorId || employeeId,
      weightCompleteDate: item.weighingTime ? dayjs(item.weighingTime).format('YYYY-MM-DDTHH:mm:ss.SSS') : null
    }))
  };
};

const getSeparatePayloadContext = (): PayloadBuildContext => ({
  factoryId: authStore.user?.factoryId || '',
  employeeId: authStore.user?.employeeId || '',
  workOrderMasterId: currentWorkOrderId.value,
  startDate: startDate.value,
  endDate: endDate.value,
  mixGlueMasterId: mixGlueMasterId.value,
  mixChemicals: [],
  noMixChemicals: [],
  separateGlueDetails: [],
  noMixSeparateGlueDetails: [],
  noMixComponents: noMixComponents.value,
});

const validateBeforeNoMixComplete = async (): Promise<string | null> => {
  const unweighed = noMixComponents.value.find((item) => !isRowWeighed(item));
  if (unweighed) {
    return t('separateMixedGlue.toast.noMixWeighFirst', { name: unweighed.materialName });
  }

  return null;
};

const handleCompleteNoMixGlue = async (source: 'complete-button' | 'chiet-row' = 'complete-button') => {
  if (isCompleting.value || isNavigatingAway.value || isPageDataLoading.value) return;

  isCompleting.value = true;
  try {
    if (!(await requireOnline())) return;

    const validationError = await validateBeforeNoMixComplete();
    if (validationError) {
      showToast({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.incomplete'),
        detail: validationError,
        life: 3000,
      });
      return;
    }

    const payload = source === 'chiet-row'
      ? buildSeparateGlueCommandPayload(getSeparatePayloadContext(), '1', {
        forComplete: true,
        forceAllRecordStatus: '1',
      })
      : buildSeparateGlueCommandPayload(getSeparatePayloadContext(), '1', { forComplete: true });
    await separateGlue.postSeparateGlueCommand(payload);

    mixGlueConfirm.value = true;
    isNavigatingAway.value = true;
    isDirty.value = false;
    showToast({
      severity: 'success',
      summary: t('separateMixedGlue.toast.completeSuccess'),
      detail: t('separateMixedGlue.toast.completeSuccessDetail'),
      life: 3000,
    });
    if (source === 'chiet-row') {
      await router.replace({
        path: '/separate-mixed-glue-management',
        query: { workOrderMasterId: currentWorkOrderId.value },
      });
    } else {
      await router.push('/list-mix-glue');
    }
  } catch (error) {
    if (notifyOfflineFromError(error)) {
      return;
    }
    console.error(error);
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('separateMixedGlue.toast.completeFailed'),
      life: 6000,
    });
  } finally {
    if (!isNavigatingAway.value) {
      isCompleting.value = false;
    }
  }
};

completeNoMixGlue = () => handleCompleteNoMixGlue('chiet-row');

const handleCompleteMixGlue = async () => {
  if (isCompleting.value || isNavigatingAway.value) return;

  isCompleting.value = true;
  try {
    const hasIncompleteRows = (rows: ComponentDetail[]) =>
      rows.some(item => !item.actualWeight || Number(item.actualWeight) <= 0);

    if (hasMixChemicals.value && hasIncompleteRows(componentDetailsFull.value)) {
      showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('mixGlueManagement.toast.incompleteWeighing'), life: 3000 });
      return;
    }

    if (hasNoMixChemicals.value && hasIncompleteRows(noMixComponents.value)) {
      showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('mixGlueManagement.toast.incompleteNoMixWeighing'), life: 3000 });
      return;
    }

    if (!(await requireOnline())) return;

    const payloadToSubmit = buildPayload('1');
    await mixGlueApi.postMixGlueCommand(payloadToSubmit);
    await saveDraftSnapshot();

    mixGlueConfirm.value = true;
    isNavigatingAway.value = true;
    isDirty.value = false;
    showToast({
      severity: 'success',
      summary: t('mixGlueManagement.toast.saveSuccess'),
      detail: t('mixGlueManagement.toast.saveSuccessDetail'),
      life: 3000,
    });

    await router.push('/list-mix-glue');
  } catch (error) {
    if (notifyOfflineFromError(error)) {
      return;
    }
    console.error(error);
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.saveFailed'), life: 6000 });
  } finally {
    if (!isNavigatingAway.value) {
      isCompleting.value = false;
    }
  }
};

const handleComplete = async () => {
  if (isCompleting.value || isChietPending.value || isNavigatingAway.value || isPageDataLoading.value) return;
  if (isNoMixGlue.value) {
    await handleCompleteNoMixGlue();
    return;
  }
  await handleCompleteMixGlue();
};

// ============================================================================
// 4. LOGIC CÂN & TÍNH TOÁN TỶ LỆ TRỘN
// ============================================================================
const onRowClick = (event: { data: ComponentDetail }) => {
  if (isLoadingComponent.value || !event.data?.materialName) return;

  mixingProcess.value.component = event.data.materialName;
  activeComponent.value = { ...event.data };
  selectedItem.value = event.data;
};

const handleWeightChange = (newWeight: string) => {
  mixingProcess.value.weight = newWeight;
};

const handleNoMixWeightChange = (newWeight: string) => {
  noMixMixingProcess.value.weight = newWeight;
};

const scrollToActiveRow = async (context: 'mix' | 'noMix' = 'mix') => {
  if (context !== 'mix') return;

  setTimeout(() => {
    const tableRef = table2Ref.value;
    const rows = componentDetailsFull.value;
    const activeRowData = activeComponent.value;

    if (!tableRef || !activeRowData) return;

    const index = rows.findIndex(item => item.materialName === activeRowData.materialName);

    if (index !== -1) {
      const tbody = tableRef.querySelector('.p-datatable-tbody');

      if (tbody) {
        const tableRows = tbody.querySelectorAll('tr');

        if (tableRows && tableRows[index]) {
          tableRows[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, 100);
};

const confirmWeightForRows = async (
  rows: ComponentDetail[],
  activeRow: ComponentDetail | null,
  context: 'mix' | 'noMix',
  actualWeight: string,
  setActiveRow: (item: ComponentDetail) => void,
  setSelectedItem: (item: ComponentDetail) => void,
  setComponentLabel: (name: string) => void
) => {
  if (!activeRow) return;

  const index = rows.findIndex(item => item.materialName === activeRow.materialName);
  if (index === -1) return;

  rows[index].actualWeight = actualWeight;
  rows[index].operator = authStore.user?.name || authStore.user?.employeeName || authStore.user?.employeeId || t('mixGlueManagement.unknownOperator');
  rows[index].operatorId = authStore.user?.employeeId || '';
  rows[index].weighingTime = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');

  const nextIndex = rows.findIndex(item => !item.weighingTime);

  if (nextIndex !== -1) {
    const nextItem = rows[nextIndex];
    setSelectedItem(nextItem);
    setActiveRow({ ...nextItem });
    setComponentLabel(nextItem.materialName || '');

    await scrollToActiveRow(context);
  } else {
    setActiveRow({ ...rows[index] });
  }

  await saveDraftSnapshot();
};

const handleConfirmWeight = async (actualWeight: string) => {
  await confirmWeightForRows(
    componentDetailsFull.value,
    activeComponent.value,
    'mix',
    actualWeight,
    (item) => { activeComponent.value = item; },
    (item) => { selectedItem.value = item; },
    (name) => { mixingProcess.value.component = name; }
  );
};

// ============================================================================
// 5. LOGIC MODAL THÊM THÀNH PHẦN
// ============================================================================
const productDialog = ref(false);
const materialsList = ref<any[]>([]);
const isLoadingMaterials = ref(false);

const isMixRowWeighed = (row: ComponentDetail) =>
  !!row.actualWeight && Number(row.actualWeight) > 0;

const openMixComponentDialog = () => {
  const unweighed = componentDetailsFull.value.find((item) => !isMixRowWeighed(item));
  if (unweighed) {
    showToast({
      severity: 'warn',
      summary: t('listMixGlue.toast.warning'),
      detail: t('separateMixedGlue.toast.weighBeforeAdd', { name: unweighed.materialName }),
      life: 3000,
    });
    return;
  }
  productDialog.value = true;
};

const buildExtraComponent = (
  newComponentData: {
    name: string;
    percentage: number | string;
    materialCode: string;
    weightUnit: string;
    toleranceGrams: number;
  },
  flags: { mixGlue: boolean; noMixGlue: boolean }
): ComponentDetail => {
  const enteredWeight = Number(newComponentData.percentage ?? 0);
  const weightUnit = normalizeWeightUnit(newComponentData.weightUnit);
  const weightStr = format.formatDisplayWeight(enteredWeight) || '0';
  // Cũ: sai số = 5% trọng lượng — const toleranceGrams = calcToleranceGrams(enteredWeight, weightUnit);
  const deviationGrams = Number(newComponentData.toleranceGrams);
  const toleranceStr = String(deviationGrams);

  return {
    materialName: newComponentData.name,
    materialCode: newComponentData.materialCode,
    weightUnit,
    glueWeight: weightStr,
    requiredWeight: weightStr,
    actualWeight: '',
    operator: '',
    operatorId: '',
    weighingTime: '',
    lowerTolerance: toleranceStr,
    upperTolerance: toleranceStr,
    lowerToleranceUnit: 'g',
    upperToleranceUnit: 'g',
    mixingRatio: '',
    glueExtra: true,
    mixGlue: flags.mixGlue,
    noMixGlue: flags.noMixGlue,
    factoryId: authStore.user?.factoryId || '',
  };
};

const handleSaveNewComponent = async (newComponentData: {
  name: string;
  percentage: number | string;
  materialCode: string;
  weightUnit: string;
  toleranceGrams: number;
}) => {
  if (!componentDetailsFull.value.length) {
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.baseNotFound'), life: 6000 });
    return;
  }

  const newComponent = buildExtraComponent(newComponentData, { mixGlue: true, noMixGlue: false });
  componentDetailsFull.value.push(newComponent);
  selectedItem.value = newComponent;
  activeComponent.value = { ...newComponent };
  mixingProcess.value.component = newComponent.materialName || '';
  mixingProcess.value.weight = '0.000';

  await saveDraftSnapshot();

  showToast({ severity: 'success', summary: t('mixGlueManagement.toast.addSuccess'), detail: t('mixGlueManagement.toast.addSuccessDetail'), life: 3000 });
};

const handleDeleteComponent = async (rowToDelete: ComponentDetail) => {
  await UI.Confirm(
    t('mixGlueManagement.confirmDelete.title'),
    t('mixGlueManagement.confirmDelete.componentLabel', { name: rowToDelete.materialName ?? '' }),
    t('mixGlueManagement.confirmDelete.message'),
    () => {
      // 1. Xóa khỏi UI
      componentDetailsFull.value = componentDetailsFull.value.filter(
        item => item !== rowToDelete
      );

      void saveDraftSnapshot();

      showToast({
        severity: 'success',
        summary: t('mixGlueManagement.toast.deleteSuccess'),
        detail: t('mixGlueManagement.toast.deleteSuccessDetail', { name: rowToDelete.materialName ?? '' }),
        life: 3000
      });
    },
    undefined,
    'custom-error-alert'
  );
};

const fetchMaterialsForRows = async (
  rows: ComponentDetail[],
  targetList: typeof materialsList,
  loadingFlag: typeof isLoadingMaterials
) => {
  loadingFlag.value = true;
  try {
    const { data } = await materialApi.postMaterial({ factoryId: authStore.user?.factoryId || '' });

    if (data?.success) {
      const existingCodes = rows.map(item => String(item.materialCode));

      targetList.value = (data.data || [])
        .filter((item: any) => !existingCodes.includes(String(item.materialCode)))
        .map((item: any) => ({
          ...item,
          weightUnit: normalizeWeightUnit(item.weightUnit),
        }));
    }
  } catch (error) {
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.loadMaterialsFailed'), life: 6000 });
  } finally {
    loadingFlag.value = false;
  }
};

const fetchMaterials = async () => {
  await fetchMaterialsForRows(componentDetailsFull.value, materialsList, isLoadingMaterials);
};

// ============================================================================
// 6. UI CHUNKS
// ============================================================================
const table2Ref = ref<HTMLDivElement | null>(null);

// ============================================================================
// 7. NAVIGATION & GUARDS (CHẶN THOÁT)
// ============================================================================
const isPrintBusy = computed(() => isPrintingComponent.value || isPrinting.value);

const blockBackIfPrinting = (): boolean => {
  if (!isPrintBusy.value) return false;
  showToast({
    severity: 'warn',
    summary: t('listMixGlue.toast.warning'),
    detail: t('mixGlueManagement.toast.printBackBlocked'),
    life: 3000,
  });
  return true;
};

const goBack = async () => {
  if (blockBackIfPrinting()) return;
  if (isDirty.value) {
    const ok = await alertExitPage();
    if (ok) router.back();
  } else {
    router.back();
  }
};

/** Thoát có đồng bộ server: recordStatus C, chỉ gửi dòng đã cân; bảng chưa làm gì → mixGlues []. Không xóa draft. */
const showExitDialog = ref(false);
const isExitConfirming = ref(false);
let exitResolve: ((ok: boolean) => void) | null = null;

const alertExitPage = (): Promise<boolean> =>
  new Promise(resolve => {
    exitResolve = resolve;
    showExitDialog.value = true;
  });

const settleExitDialog = (ok: boolean) => {
  showExitDialog.value = false;
  isExitConfirming.value = false;
  const resolve = exitResolve;
  exitResolve = null;
  resolve?.(ok);
};

const onExitStay = () => {
  settleExitDialog(false);
};

const onExitConfirm = async () => {
  if (isExitConfirming.value) return;
  isExitConfirming.value = true;

  if (!(await requireOnline())) {
    settleExitDialog(false);
    return;
  }

  // Navigate ngay, không chờ API — tránh delay
  isDirty.value = false;
  settleExitDialog(true);

  try {
    const payload = buildPayload('C', { onlyProgressLines: true });
    await mixGlueApi.postMixGlueCommand(payload);
    await saveDraftSnapshot();
  } catch (error) {
    console.error(error);
  }
};

const onExitDialogHide = () => {
  if (exitResolve) {
    settleExitDialog(false);
  }
};

useAppBackButton(10, processNextHandler => {
  if (blockBackIfPrinting()) return;
  if (!isDirty.value) {
    processNextHandler();
    return;
  }
  void alertExitPage().then(ok => {
    if (ok) processNextHandler();
  });
});

onBeforeRouteLeave(async () => {
  if (isPrintBusy.value) return false;
  if (!isDirty.value) return true;
  return await alertExitPage();
});

// ============================================================================
// 8. LIFECYCLE HOOKS
// ============================================================================
const resetState = () => {
  headerInfo.value = { orderNo: '', glue: '', totalWeight: '' };
  lineDetails.value = [];
  componentDetailsFull.value = [];
  noMixComponents.value = [];
  activeComponent.value = null;
  activeNoMixComponent.value = null;
  selectedItem.value = null;
  selectedItemNoMix.value = null;
  mixingProcess.value = { component: '', weight: '' };
  noMixMixingProcess.value = { component: '', weight: '' };
  isDirty.value = false;
  mixGlueConfirm.value = false;
  isCompleting.value = false;
  isNavigatingAway.value = false;
  isNoMixGlue.value = false;
  startDate.value = '';
  endDate.value = '';
  resetNoMixSection();
};

usePageLifecycle({
  onEnter: async () => {
    showDeviceUi.value = false;

    // Giữ thứ tự logic cũ: restore pending print trước, rồi fetch WO.
    await restorePendingPrintJob();

    const workOrderMasterId = route.query.workOrderMasterId as string;
    const fetchPromise = workOrderMasterId
      ? fetchWorkOrderDetail(workOrderMasterId)
      : Promise.resolve().then(() => {
        isLoadingLine.value = false;
        isLoadingComponent.value = false;
      });

    await nextTick();
    showDeviceUi.value = true;

    await fetchPromise;
  },
  onAfterEnter: () => {
    if (table2Ref.value) {
      table2Ref.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    bluetoothRef.value?.initBluetooth?.();
  },
  onLeave: async () => {
    bluetoothRef.value?.pauseBluetooth?.();
    showDeviceUi.value = false;
    if (isNavigatingAway.value) return;
    if (currentWorkOrderId.value && isDirty.value) {
      await saveDraftSnapshot();
    }
    await draftStore.flushPersist();
  },
});

// Đổi work order trên cùng route (query) khi instance được giữ lại.
watch(
  () => route.query.workOrderMasterId as string | undefined,
  (workOrderMasterId, prev) => {
    if (!workOrderMasterId || workOrderMasterId === prev) return;
    void fetchWorkOrderDetail(workOrderMasterId);
  },
);
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

.mix-glue-management-content {
  display: flex;
  flex-direction: column;
}

.mix-glue-layout {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.mix-glue-header-card {
  flex-shrink: 0;
}

.mix-glue-header-fields {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 0.5rem 0.75rem;
  min-width: 0;
  width: 100%;
  overflow-x: auto;
}

.mix-glue-header-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mix-glue-header-field--order {
  flex: 0 0 auto;
  min-width: auto;
  max-width: none;
}

.mix-glue-header-field--glue {
  flex: 0 0 auto;
  max-width: 20rem;
  min-width: 0;
}

.mix-glue-header-field--weight {
  flex: 0 0 auto;
}

.mix-glue-header-input {
  box-sizing: border-box;
}

.mix-glue-header-input--fit {
  max-width: none;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.mix-glue-header-input--truncate {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mix-glue-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.mix-glue-scroll-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
}

.mix-glue-section-card {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mix-glue-section-head,
.mix-glue-scale-bar {
  flex-shrink: 0;
}

.mix-glue-table-slot {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mix-glue-table-slot .table-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

/* Thanh scroll luôn thấy — báo còn data phía dưới (Android hay ẩn overlay). */
.mix-glue-table-slot :deep(.p-datatable-table-container),
.mix-glue-table-slot :deep(.p-datatable-wrapper),
.mix-glue-table-slot :deep(.p-datatable-scrollable-body) {
  overflow-y: scroll !important;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: #64748b #e2e8f0;
  -webkit-overflow-scrolling: touch;
}

.mix-glue-table-slot :deep(.p-datatable-table-container::-webkit-scrollbar),
.mix-glue-table-slot :deep(.p-datatable-wrapper::-webkit-scrollbar),
.mix-glue-table-slot :deep(.p-datatable-scrollable-body::-webkit-scrollbar) {
  width: 10px;
}

.mix-glue-table-slot :deep(.p-datatable-table-container::-webkit-scrollbar-track),
.mix-glue-table-slot :deep(.p-datatable-wrapper::-webkit-scrollbar-track),
.mix-glue-table-slot :deep(.p-datatable-scrollable-body::-webkit-scrollbar-track) {
  background: #e2e8f0;
  border-radius: 8px;
}

.mix-glue-table-slot :deep(.p-datatable-table-container::-webkit-scrollbar-thumb),
.mix-glue-table-slot :deep(.p-datatable-wrapper::-webkit-scrollbar-thumb),
.mix-glue-table-slot :deep(.p-datatable-scrollable-body::-webkit-scrollbar-thumb) {
  background: #64748b;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
}

.mix-glue-consolidated-validation {
  flex-shrink: 0;
}

/* Hiệu ứng transition cho bảng 1 */
.slide-fade-enter-active {
  transition: all 0.4s ease-in-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-15px);
  opacity: 0;
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
</style>