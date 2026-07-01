<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <div class="flex align-items-center justify-content-between">
          <ion-title class="no-padding">{{ t('mixGlueManagement.pageTitle') }}</ion-title>
          <LocaleSelect device-scope="tablet" select-class="mr-4" />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding mix-glue-management-content" :scroll-y="false">

      <div class="mix-glue-layout main-container max-w-full mx-auto">
        <!-- Thông tin header — cố định, không scroll -->
        <div class="mix-glue-header-card surface-card p-2 shadow-1 border-round-xl">
          <div class="grid align-items-end">
            <div class="col-12 lg:col-3">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.workOrder') }}</label>
              <InputText v-model="headerInfo.orderNo" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 lg:col-3">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.glue') }}</label>
              <InputText v-model="headerInfo.glue" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 lg:col-2">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.totalWeight') }}</label>
              <InputText v-model="headerInfo.totalWeight" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 lg:col-2">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.totalWeightActual')
                }}</label>
              <InputText :model-value="totalWeightActualDisplay" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 lg:col-2">
              <div class="flex gap-2 justify-content-end">
                <Button :icon="hidenTable1 ? 'pi pi-eye' : 'pi pi-eye-slash'" outlined class="mr-2 button-lg"
                  @click="handleHidenTable1" />
                <Button
                  :disabled="mixGlueConfirm || hasWorkOrderDataErrors || isCompleting || isNavigatingAway"
                  :loading="isCompleting"
                  icon="pi pi-check-circle" severity="success" class="button-lg" @click="handleComplete" />
              </div>
            </div>
          </div>
        </div>

        <!-- Vùng bảng — scroll khi nội dung dài -->
        <div class="mix-glue-scroll-body">
          <!-- BẢNG 1 -->
          <transition name="slide-fade">
            <div v-show="hidenTable1 && canShowTable1Content" class="surface-card p-0 shadow-1 border-round-xl">
              <div class="surface-100 p-3 border-round-top-xl">
                <span class="font-bold text-700 text-lg"><i class="pi pi-list mr-2"></i>{{
                  t('mixGlueManagement.sections.lineDetails') }}</span>
              </div>
              <LineDetailsTable :is-loading="isLoadingLine" :line-details="lineDetails" />
            </div>
          </transition>

          <!-- BẢNG 2: Keo trộn -->
          <transition name="slide-fade">
            <div v-if="canShowTable2Content" class="surface-card p-0 shadow-1 border-round-xl">
              <div
                class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between gap-3 flex-wrap">
                <span class="font-bold text-700 text-lg">
                  <i class="pi pi-box mr-2"></i>{{ t('mixGlueManagement.sections.mixingComponents') }}
                </span>
                <ScaleDevicePicker v-if="hasMixChemicals" :session-id="mixGlueScaleSessionId" />
              </div>

              <div v-if="isLoadingComponent" class="border-round-bottom-xl">
                <MixingComponentsTable :is-loading="true" :components="[]" :header-total-weight="headerInfo.totalWeight"
                  v-model:selectedItem="selectedItem" :disabled="true" />
              </div>

              <template v-else-if="hasMixChemicals">
                <div class="md:p-2 surface-50 border-bottom-1 surface-border">
                  <div class="grid formgrid align-items-end">
                    <div class="col-12 sm:col-5 lg:col-5 lg:mb-0">
                      <label class="text-800 font-medium mb-2 block">{{ t('mixGlueManagement.fields.componentCode')
                      }}</label>
                      <InputText v-model="mixingProcess.component" readonly
                        class="font-bold text-primary border-blue-200" style="width: 350px;" />
                    </div>

                    <ElectronicScale :scale-session-id="mixGlueScaleSessionId" hide-scale-picker
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

                <div class="border-round-bottom-xl">
                  <div ref="table2Ref" class="table-wrapper">
                    <MixingComponentsTable :is-loading="isLoadingComponent" :components="componentDetailsFull"
                      :header-total-weight="headerInfo.totalWeight" v-model:selectedItem="selectedItem"
                      :disabled="mixGlueConfirm" @row-click="onRowClick" @open-new="openMixComponentDialog"
                      @delete-row="handleDeleteComponent" />
                  </div>

                  <!-- MODAL THÊM THÀNH PHẦN -->
                  <AddComponentDialog v-model:visible="productDialog" :materials-list="materialsList"
                    :is-loading-materials="isLoadingMaterials" @fetch-materials="fetchMaterials"
                    @save="handleSaveNewComponent" />
                </div>
              </template>
            </div>
          </transition>

          <!-- BẢNG 3: Keo không trộn -->
          <transition name="slide-fade">
            <div v-if="canShowTable3Content" class="surface-card p-0 shadow-1 border-round-xl">
              <div
                class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between gap-3 flex-wrap">
                <span class="font-bold text-700 text-lg">
                  <i class="pi pi-box mr-2"></i>{{ t('mixGlueManagement.sections.noMixComponents') }}
                </span>
                <ScaleDevicePicker v-if="hasNoMixChemicals" :session-id="mixGlueScaleSessionId" :auto-connect="false" />
              </div>

              <div v-if="isLoadingComponent" class="overflow-x-auto border-round-bottom-xl">
                <NoSeparateGlue :is-loading="true" :no-mix-chemicals="[]" :header-total-weight="headerInfo.totalWeight"
                  :disabled="true" :is-no-mix-glue="isNoMixGlue" v-model:selectedItem="selectedItemNoMix" />
              </div>

              <template v-else-if="hasNoMixChemicals">
                <div class="md:p-2 surface-50 border-bottom-1 surface-border">
                  <div class="grid formgrid align-items-end">
                    <div class="col-12 sm:col-5 lg:col-5 lg:mb-0">
                      <label class="text-800 font-medium mb-2 block">{{ t('mixGlueManagement.fields.componentCode')
                      }}</label>
                      <InputText v-model="noMixMixingProcess.component" readonly
                        class="font-bold text-primary border-blue-200" style="width: 350px;" />
                    </div>

                    <ElectronicScale :scale-session-id="mixGlueScaleSessionId" hide-scale-picker
                      :weight-unit="activeNoMixComponent?.weightUnit" :target-weight="noMixTargetWeight"
                      :lower-tolerance="noMixScaleTolerance.lower" :upper-tolerance="noMixScaleTolerance.upper"
                      :enforce-tolerance="!!activeNoMixComponent && noMixTargetWeight > 0"
                      :locked-weight="activeNoMixComponent?.weighingTime ? (activeNoMixComponent?.actualWeight ?? '') : ''"
                      :disable-confirm="!!activeNoMixComponent?.weighingTime" @update:weight="handleNoMixWeightChange"
                      @confirm-weight="handleConfirmNoMixWeight" />
                  </div>
                </div>

                <div class="overflow-x-auto border-round-bottom-xl">
                  <div class="table-wrapper">
                    <NoSeparateGlue :is-loading="isLoadingComponent" :no-mix-chemicals="noMixComponents"
                      :header-total-weight="headerInfo.totalWeight" :disabled="mixGlueConfirm"
                      :is-no-mix-glue="isNoMixGlue" v-model:selectedItem="selectedItemNoMix"
                      @row-click="onNoMixRowClick" @open-new="openNoMixComponentDialog"
                      @delete-row="handleDeleteNoMixComponent" @chiet-row="handleChietRow" @view-row="handleViewRow" />
                  </div>

                  <SeparateAddComponentDialog v-model:visible="noMixProductDialog" :materials-list="noMixMaterialsList"
                    :is-loading-materials="isLoadingNoMixMaterials" @fetch-materials="fetchNoMixMaterials"
                    @save="handleSaveNewNoMixComponent" />

                  <SeparateGlueDialog v-model:visible="chietDialog" :chemical="currentChietChemical"
                    :order-details="chietOrderDetails" :request-details="requestDetails" :is-view-mode="isViewMode"
                    @update-bucket="saveChietDraftToStoreOnly" @confirm="confirmChiet" @add-row="handleAddChietRow"
                    @delete-row="handleDeleteChietRow" />
                </div>
              </template>
            </div>
          </transition>

          <div v-if="firstDataValidationError" class="mix-glue-consolidated-validation">
            <MixGlueDataValidationAlert :type="firstDataValidationError" />
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
  IonTitle, onIonViewDidEnter, useBackButton, alertController,
  onIonViewWillEnter, onIonViewWillLeave
} from '@ionic/vue';
import { useAppToast } from '@/composables/useAppToast';
import UI from '@/mixins/present';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore, isMixGlueDraftRestorable } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import materialApi from '@/api/material';
import mixGlueApi from '@/api/mixGlue';
import separateGlue from '@/api/separate';
import bucketApi from '@/api/bucket';
import { buildSeparateGlueCommandPayload } from '@/views/Tablet/Separate/separateMixedGlue.payload';
import type { PayloadBuildContext } from '@/views/Tablet/Separate/separateMixedGlue.types';
import { validateSeparateGlueAllocation } from '@/views/Tablet/Separate/separateGlue.bucket';

import ElectronicScale from '@/components/ElectronicScale.vue';
import ScaleDevicePicker from '@/components/ScaleDevicePicker.vue';
import LineDetailsTable from '@/views/Tablet/MixGlue/components/LineDetailsTable.vue';
import MixGlueDataValidationAlert from '@/views/Tablet/MixGlue/components/MixGlueDataValidationAlert.vue';
import MixingComponentsTable from '@/views/Tablet/MixGlue/components/MixingComponentsTable.vue';
import AddComponentDialog from '@/views/Tablet/MixGlue/components/AddComponentDialog.vue';
import NoSeparateGlue from '@/views/Tablet/Separate/components/NoSeparateGlue.vue';
import SeparateAddComponentDialog from '@/views/Tablet/Separate/components/AddComponentDialog.vue';
import SeparateGlueDialog from '@/views/Tablet/Separate/components/SeparateGlueDialog.vue';
import { useMixGlueNoMixChiet } from '@/views/Tablet/MixGlue/useMixGlueNoMixChiet';
import { useScaleManager } from '@/composables/useScaleManager';
import LocaleSelect from '@/components/LocaleSelect.vue';
import { useAppLocale } from '@/composables/useAppLocale';
import { useRequireOnline } from '@/composables/useRequireOnline';

dayjs.extend(customParseFormat);

const MIX_GLUE_SCALE_SESSION = 'mix-glue-scale-session';

const { stopAutoConnect } = useScaleManager();
const mixGlueScaleSessionId = MIX_GLUE_SCALE_SESSION;
const { t } = useAppLocale(() => 'tablet');
const { requireOnline, notifyOfflineFromError } = useRequireOnline();
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
  isChietCompleted?: boolean;
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
const hourlyValidity = ref<string>('0');
const hidenTable1 = ref(false);
const mixGlueConfirm = ref(false);
const isCompleting = ref(false);
const isNavigatingAway = ref(false);
const isNoMixGlue = ref(false);
const startDate = ref('');
const endDate = ref('');
const bucketListForValidation = ref<any[]>([]);

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

const canShowTable1Content = computed(
  () => firstDataValidationError.value !== 'orderDetails'
);
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

const hasWorkOrderDataErrors = computed(() => firstDataValidationError.value != null);

const toKg = (weight: number, unit?: string) => {
  const normalizedUnit = (unit || 'Kg').toLowerCase();
  return normalizedUnit === 'g' ? weight / 1000 : weight;
};

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
    weightUnit: item.weightUnit || 'Kg',
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
  extraChietList,
  noMixProductDialog,
  noMixMaterialsList,
  isLoadingNoMixMaterials,
  isViewMode,
  chietDialog,
  chietOrderDetails,
  currentChietChemical,
  applyNoMixFromWorkOrder,
  restoreNoMixDraft,
  getNoMixDraftExtras,
  resetNoMixSection,
  onNoMixRowClick,
  openNoMixComponentDialog,
  fetchNoMixMaterials,
  handleSaveNewNoMixComponent,
  handleDeleteNoMixComponent,
  handleChietRow,
  handleViewRow,
  confirmChiet,
  handleAddChietRow,
  handleDeleteChietRow,
  saveChietDraftToStoreOnly,
  handleConfirmNoMixWeight,
  isRowWeighed,
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
      mixGlueWeightUnit: item.weightUnit || 'Kg',
      glueExtra: item.glueExtra || false,
      recordStatus: recordStatus,
      createrId: item.operatorId || employeeId,
      updaterId: item.operatorId || employeeId,
      weightCompleteDate: item.weighingTime ? dayjs(item.weighingTime).format('YYYY-MM-DDTHH:mm:ss.SSS') : null
    }))
  };
};

const handleHidenTable1 = () => {
  hidenTable1.value = !hidenTable1.value;
};

const isSeparateGlueRowFilled = (row: any) =>
  !!row.selectedBucketId || !!row.bucketId;

const ensureBucketListForValidation = async () => {
  if (bucketListForValidation.value.length > 0) {
    return bucketListForValidation.value;
  }

  try {
    const { data } = await bucketApi.postBucket({ factoryId: authStore.user?.factoryId || '' });
    if (data?.success && data.data) {
      bucketListForValidation.value = data.data;
    }
  } catch (error) {
    console.error('Lỗi khi tải danh sách thùng chứa', error);
  }

  return bucketListForValidation.value;
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
  extraChietList: extraChietList.value,
  noMixComponents: noMixComponents.value,
});

const validateBeforeNoMixComplete = async (): Promise<string | null> => {
  const bucketList = await ensureBucketListForValidation();

  const unweighed = noMixComponents.value.find((item) => !isRowWeighed(item));
  if (unweighed) {
    return t('separateMixedGlue.toast.noMixWeighFirst', { name: unweighed.materialName });
  }

  for (const row of noMixComponents.value) {
    if (!row.isChietCompleted) continue;

    const extras = extraChietList.value.filter(
      (item) => String(item.glueId) === String(row.materialCode)
    );
    if (extras.length === 0) continue;

    for (let i = 0; i < extras.length; i++) {
      if (!isSeparateGlueRowFilled(extras[i])) {
        return t('separateMixedGlue.toast.chietSelectBucket', { name: row.materialName, row: i + 1 });
      }
    }

    const chietAllocationError = validateSeparateGlueAllocation(
      extras,
      requestDetails.value,
      bucketList,
      row.actualWeight,
      row.weightUnit || 'Kg',
      { requireAllRequestDetails: false }
    );
    if (chietAllocationError) {
      return t('separateMixedGlue.toast.chietPrefix', { name: row.materialName, message: chietAllocationError || '' });
    }
  }

  return null;
};

const handleCompleteNoMixGlue = async (source: 'complete-button' | 'chiet-row' = 'complete-button') => {
  if (isCompleting.value || isNavigatingAway.value) return;
  if (!(await requireOnline())) return;

  const validationError = await validateBeforeNoMixComplete();
  if (validationError) {
    showToast({
      severity: 'warn',
      summary: t('separateMixedGlue.toast.incomplete'),
      detail: validationError,
      life: 6000,
    });
    return;
  }

  isCompleting.value = true;
  try {
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
      isCompleting.value = false;
      return;
    }
    console.error(error);
    showToast({
      severity: 'error',
      summary: t('listMixGlue.toast.error'),
      detail: t('separateMixedGlue.toast.completeFailed'),
      life: 6000,
    });
    isCompleting.value = false;
  }
};

completeNoMixGlue = () => handleCompleteNoMixGlue('chiet-row');

const handleCompleteMixGlue = async () => {
  if (isCompleting.value || isNavigatingAway.value) return;

  const hasIncompleteRows = (rows: ComponentDetail[]) =>
    rows.some(item => !item.actualWeight || Number(item.actualWeight) <= 0);

  if (hasMixChemicals.value && hasIncompleteRows(componentDetailsFull.value)) {
    showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('mixGlueManagement.toast.incompleteWeighing'), life: 6000 });
    return;
  }

  if (hasNoMixChemicals.value && hasIncompleteRows(noMixComponents.value)) {
    showToast({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('mixGlueManagement.toast.incompleteNoMixWeighing'), life: 6000 });
    return;
  }

  if (!(await requireOnline())) return;

  isCompleting.value = true;
  try {
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
      isCompleting.value = false;
      return;
    }
    console.error(error);
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.saveFailed'), life: 6000 });
    isCompleting.value = false;
  }
};

const handleComplete = async () => {
  if (isCompleting.value || isNavigatingAway.value) return;
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
    // showToast({
    //   severity: 'success',
    //   summary: t('mixGlueManagement.toast.weighingComplete'),
    //   detail: t('mixGlueManagement.toast.weighingCompleteDetail'),
    //   life: 6000,
    // });
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
      life: 6000,
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
  const weightUnit = newComponentData.weightUnit || 'Kg';
  const weightStr = enteredWeight.toFixed(3);
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
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.baseNotFound'), life: 3000 });
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

      targetList.value = (data.data || []).filter(
        (item: any) => !existingCodes.includes(String(item.materialCode))
      );
    }
  } catch (error) {
    showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.loadMaterialsFailed'), life: 3000 });
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
const goBack = async () => {
  if (isDirty.value) {
    const ok = await alertExitPage();
    if (ok) router.back();
  } else {
    router.back();
  }
};

/** Thoát có đồng bộ server: recordStatus C, chỉ gửi dòng đã cân; bảng chưa làm gì → mixGlues []. Không xóa draft. */
const alertExitPage = (): Promise<boolean> =>
  new Promise(resolve => {
    void (async () => {
      const alert = await alertController.create({
        header: t('mixGlueManagement.exitAlert.header'),
        message: t('mixGlueManagement.exitAlert.message'),
        buttons: [
          { text: t('mixGlueManagement.exitAlert.stay'), role: 'cancel', handler: () => resolve(false) },
          {
            text: t('mixGlueManagement.exitAlert.exit'),
            role: 'confirm',
            cssClass: 'text-red-500',
            handler: () => {
              void (async () => {
                if (!(await requireOnline())) {
                  resolve(false);
                  return;
                }
                try {
                  const payload = buildPayload('C', { onlyProgressLines: true });
                  await mixGlueApi.postMixGlueCommand(payload);
                  await saveDraftSnapshot();
                  // await draftStore.clearDraft(currentWorkOrderId.value);
                  isDirty.value = false;
                  resolve(true);
                } catch (error) {
                  console.error(error);
                  if (notifyOfflineFromError(error)) {
                    resolve(false);
                    return;
                  }
                  showToast({
                    severity: 'error',
                    summary: t('listMixGlue.toast.error'),
                    detail: t('mixGlueManagement.toast.progressSaveFailed'),
                    life: 3500
                  });
                  resolve(false);
                }
              })();
            }
          }
        ]
      });
      await alert.present();
    })();
  });

useBackButton(10, processNextHandler => {
  if (!isDirty.value) {
    processNextHandler();
    return;
  }
  void alertExitPage().then(ok => {
    if (ok) processNextHandler();
  });
});

onBeforeRouteLeave(async () => {
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
  bucketListForValidation.value = [];
  resetNoMixSection();
};

onIonViewDidEnter(async () => {
  await nextTick();
  if (table2Ref.value) {
    table2Ref.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

onIonViewWillLeave(async () => {
  stopAutoConnect(mixGlueScaleSessionId);
  if (isNavigatingAway.value) return;
  if (currentWorkOrderId.value && isDirty.value) {
    await saveDraftSnapshot();
  }
});

onIonViewWillEnter(() => {
  const workOrderMasterId = route.query.workOrderMasterId as string;
  if (workOrderMasterId) {
    // Mỗi khi vào màn hình này, nó sẽ lấy ID mới từ route và fetch lại
    fetchWorkOrderDetail(workOrderMasterId);
  } else {
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
  }
});
</script>

<style scoped>
.mix-glue-management-content {
  --overflow: hidden;
}

.mix-glue-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.mix-glue-header-card {
  flex-shrink: 0;
}

.mix-glue-scroll-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
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
</style>