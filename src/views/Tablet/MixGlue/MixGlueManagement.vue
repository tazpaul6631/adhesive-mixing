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
          <ion-title>{{ t('mixGlueManagement.pageTitle') }}</ion-title>
          <LocaleSelect device-scope="tablet" select-class="mr-4" />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" :scroll-events="true">

      <div class="main-container max-w-full mx-auto">
        <!-- Thông tin header -->
        <div class="surface-card p-3 shadow-1 border-round-xl">
          <div class="flex flex-wrap align-items-center justify-content-between">
            <div v-show="hidenTable1" class="grid formgrid p-fluid flex">
              <div class="col-12 sm:col-6 lg:col-4">
                <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.workOrder') }}</label>
                <InputText v-model="headerInfo.orderNo" readonly class="font-bold text-blue-600" />
              </div>
              <div class="col-12 sm:col-6 lg:col-4">
                <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.glue') }}</label>
                <InputText v-model="headerInfo.glue" readonly class="font-bold text-blue-600" />
              </div>
              <div class="col-12 sm:col-6 lg:col-4 sm:mt-2 lg:mt-0">
                <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.totalWeight') }}</label>
                <InputText v-model="headerInfo.totalWeight" readonly class="font-bold text-blue-600" />
              </div>
            </div>
            <div class="flex gap-2">
              <Button :icon="hidenTable1 ? 'pi pi-eye' : 'pi pi-eye-slash'" outlined size="large"
                @click="handleHidenTable1" />
              <Button :disabled="mixGlueConfirm" icon="pi pi-check-circle" severity="success" size="large"
                @click="handleComplete" />
            </div>
          </div>
        </div>

        <!-- BẢNG 1 -->
        <transition name="slide-fade">
          <div v-show="hidenTable1" class="surface-card p-0 shadow-1 border-round-xl">
            <div class="surface-100 p-3 border-round-top-xl">
              <span class="font-bold text-700 text-lg"><i class="pi pi-list mr-2"></i>{{ t('mixGlueManagement.sections.lineDetails') }}</span>
            </div>
            <LineDetailsTable :is-loading="isLoadingLine" :line-details="lineDetails" />
          </div>
        </transition>

        <!-- BẢNG 2 -->
        <transition name="slide-fade">
          <div class="surface-card p-0 shadow-1 border-round-xl">
            <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between">
              <span class="font-bold text-700 text-lg">
                <i class="pi pi-box mr-2"></i>{{ t('mixGlueManagement.sections.mixingComponents') }}
              </span>
            </div>

            <div class="md:p-2 surface-50 border-bottom-1 surface-border">
              <div class="grid formgrid align-items-end">
                <div class="col-12 sm:col-5 lg:col-6 lg:mb-0">
                  <label class="text-800 font-medium mb-2 block">{{ t('mixGlueManagement.fields.componentCode') }}</label>
                  <InputText v-model="mixingProcess.component" readonly class="font-bold text-primary border-blue-200"
                    style="width: 350px;" />
                </div>

                <ElectronicScale :weight-unit="activeComponent?.weightUnit"
                  :target-weight="activeComponent?.requiredWeight ?? 0"
                  :lower-tolerance="activeComponent?.lowerTolerance ?? ''"
                  :upper-tolerance="activeComponent?.upperTolerance ?? ''"
                  :locked-weight="activeComponent?.weighingTime ? (activeComponent?.actualWeight ?? '') : ''"
                  :disable-confirm="!!activeComponent?.weighingTime" @update:weight="handleWeightChange"
                  @connection-status="handleConnectionStatus" @confirm-weight="handleConfirmWeight" />
              </div>
            </div>

            <div class="border-round-bottom-xl">
              <div ref="table2Ref" class="table-wrapper">
                <MixingComponentsTable :is-loading="isLoadingComponent" :components="componentDetailsFull"
                  :header-total-weight="headerInfo.totalWeight" v-model:selectedItem="selectedItem"
                  @row-click="onRowClick" @open-new="productDialog = true" @delete-row="handleDeleteComponent" />
              </div>

              <!-- MODAL THÊM THÀNH PHẦN -->
              <AddComponentDialog v-model:visible="productDialog" :materials-list="materialsList"
                :is-loading-materials="isLoadingMaterials" @fetch-materials="fetchMaterials"
                @save="handleSaveNewComponent" />
            </div>
          </div>
        </transition>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
  IonTitle, onIonViewDidEnter, useBackButton, alertController,
  onIonViewWillEnter, onIonViewWillLeave
} from '@ionic/vue';
import { useToast } from 'primevue/usetoast';
import UI from '@/mixins/present';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore, isMixGlueDraftRestorable } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import materialApi from '@/api/material';
import mixGlueApi from '@/api/mixGlue';

import ElectronicScale from '@/components/ElectronicScale.vue';
import LineDetailsTable from '@/views/Tablet/MixGlue/components/LineDetailsTable.vue';
import MixingComponentsTable from '@/views/Tablet/MixGlue/components/MixingComponentsTable.vue';
import AddComponentDialog from '@/views/Tablet/MixGlue/components/AddComponentDialog.vue';
import { useScaleManager } from '@/composables/useScaleManager';
import LocaleSelect from '@/components/LocaleSelect.vue';
import { useAppLocale } from '@/composables/useAppLocale';

dayjs.extend(customParseFormat);
const { releaseScaleConnection } = useScaleManager();
const { t } = useAppLocale(() => 'tablet');
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
  materialCode?: string;
  materialName?: string;
  weightUnit?: string;
  requiredWeight?: string;
  actualWeight?: string;
  operator?: string;
  operatorId?: string;
  weighingTime?: string;
}

const selectedItem = ref<ComponentDetail | null>(null);

// ============================================================================
// 2. GLOBAL SETUP & REFS CHUNG
// ============================================================================
const toast = useToast();
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

watch(componentDetailsFull, () => {
  if (!isLoadingComponent.value) isDirty.value = true;
}, { deep: true });

const fetchWorkOrderDetail = async (id: string) => {
  resetState();
  isLoadingLine.value = true;
  isLoadingComponent.value = true;
  currentWorkOrderId.value = id;

  try {
    await draftStore.ensureHydrated();
    const existingDraft = draftStore.getDraft(id);

    if (isMixGlueDraftRestorable(existingDraft)) {
      headerInfo.value = existingDraft!.headerInfo as typeof headerInfo.value;
      componentDetailsFull.value = existingDraft!.componentDetailsFull as ComponentDetail[];

      const firstUnconfirmed = componentDetailsFull.value.find(item => !item.weighingTime) || componentDetailsFull.value[0];
      selectedItem.value = firstUnconfirmed;
      activeComponent.value = { ...firstUnconfirmed };
      mixingProcess.value.component = firstUnconfirmed.materialName || '';

      await scrollToActiveRow();

      const { data } = await workOrder.getWorkOrder(id, 1);
      if (data?.success) {
        lineDetails.value = data.data.orderDetails || [];
        hourlyValidity.value = data.data.hourlyValidity || '0';
        mixGlueConfirm.value = data.data.mixGlueConfirm;
      }

      toast.add({
        severity: 'info',
        summary: t('mixGlueManagement.toast.restore'),
        detail: t('mixGlueManagement.toast.restoreDetail'),
        life: 3000
      });
    } else {
      // 3. NẾU KHÔNG CÓ DRAFT: Chạy logic lấy API như cũ
      const { data } = await workOrder.getWorkOrder(id, 1);
      if (data?.success) {
        const respData = data.data;
        mixGlueConfirm.value = respData.mixGlueConfirm;
        console.log(mixGlueConfirm.value);

        hourlyValidity.value = respData.hourlyValidity || '0';

        headerInfo.value = {
          orderNo: respData.workOrderMasterName || '',
          glue: respData.chemicalMasterName || '',
          totalWeight: respData.workOrderWeight?.toString() || ''
        };

        lineDetails.value = respData.orderDetails || [];

        componentDetailsFull.value = (respData.mixChemicals || []).map((item: any) => ({
          ...item,
          materialCode: item.materialCode || '0',
          weightUnit: item.weightUnit || 'Kg',
          requiredWeight: item.requiredWeight || '',
          actualWeight: item.actualWeight || '',
          lowerTolerance: item.lowerTolerance || '0',
          upperTolerance: item.upperTolerance || '0',
          mixingRatio: item.mixingRatio || '100',
          glueExtra: item.glueExtra || false
        }));

        noMixComponents.value = (respData.noMixChemicals || []).map((item: any) => ({ ...item }));

        if (componentDetailsFull.value.length > 0) {
          componentDetailsFull.value[0].requiredWeight = headerInfo.value.totalWeight;
          activeComponent.value = { ...componentDetailsFull.value[0] };
          mixingProcess.value.component = componentDetailsFull.value[0].materialName || '';
          selectedItem.value = componentDetailsFull.value[0];
        }
      }
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu chi tiết:', error);
    toast.add({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.loadFailed'), life: 3000 });
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

const handleComplete = async () => {
  const isIncomplete = componentDetailsFull.value.some(
    item => !item.actualWeight || Number(item.actualWeight) <= 0
  );

  if (isIncomplete) {
    toast.add({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('mixGlueManagement.toast.incompleteWeighing'), life: 4000 });
    return;
  }

  try {
    const payloadToSubmit = buildPayload("1");

    await mixGlueApi.postMixGlueCommand(payloadToSubmit);

    await draftStore.saveDraft(currentWorkOrderId.value, {
      headerInfo: headerInfo.value,
      componentDetailsFull: componentDetailsFull.value,
      hourlyValidity: hourlyValidity.value
    });

    isDirty.value = false;
    toast.add({
      severity: 'success',
      summary: t('mixGlueManagement.toast.saveSuccess'),
      detail: t('mixGlueManagement.toast.saveSuccessDetail'),
      life: 3000
    });

    router.push('/list-mix-glue');
  } catch (error) {
    console.error(error);
    toast.add({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.saveFailed'), life: 3000 });
  }
};

// ============================================================================
// 4. LOGIC CÂN & TÍNH TOÁN TỶ LỆ TRỘN
// ============================================================================
const mixingProcess = ref({ component: '', weight: '' });
const activeComponent = ref<ComponentDetail | null>(null);

const onRowClick = (event: { data: ComponentDetail }) => {
  if (isLoadingComponent.value || !event.data?.materialName) return;

  mixingProcess.value.component = event.data.materialName;
  const rowIndex = componentDetailsFull.value.findIndex(item => item === event.data);
  activeComponent.value = { ...event.data };
  selectedItem.value = event.data;

  if (rowIndex === 0) {
    activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
  }
};

const handleWeightChange = (newWeight: string) => {
  mixingProcess.value.weight = newWeight;
};

const scrollToActiveRow = async () => {
  // Dùng setTimeout để nhường 1 nhịp cho Vue render lại bảng
  setTimeout(() => {
    if (!table2Ref.value || !activeComponent.value) return;

    // 1. Tìm vị trí (index) của dòng đang được active trong mảng dữ liệu
    const index = componentDetailsFull.value.findIndex(
      item => item.materialName === activeComponent.value?.materialName
    );

    if (index !== -1) {
      // 2. Tìm thẻ tbody chứa các dòng dữ liệu của PrimeVue DataTable
      const tbody = table2Ref.value.querySelector('.p-datatable-tbody');

      if (tbody) {
        // Lấy tất cả các thẻ tr (dòng) bên trong tbody
        const rows = tbody.querySelectorAll('tr');

        if (rows && rows[index]) {
          const activeRow = rows[index];

          // 3. Cuộn bảng đến dòng được active
          // Dùng scrollIntoView với block: 'center' để dòng luôn nằm giữa màn hình bảng
          activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, 100);
};

const handleConfirmWeight = async (actualWeight: string) => { // Thêm async ở đây
  if (!activeComponent.value) return;

  const index = componentDetailsFull.value.findIndex(
    item => item.materialName === activeComponent.value?.materialName
  );

  if (index !== -1) {
    componentDetailsFull.value[index].actualWeight = actualWeight;
    componentDetailsFull.value[index].operator = authStore.user?.name || authStore.user?.employeeName || authStore.user?.employeeId || t('mixGlueManagement.unknownOperator');
    componentDetailsFull.value[index].operatorId = authStore.user?.employeeId || '';
    componentDetailsFull.value[index].weighingTime = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');

    const baseItem = componentDetailsFull.value[0];
    const baseActualWeight = Number(baseItem.actualWeight || '0');
    const baseMixingRatio = Number(baseItem.mixingRatio || '100');

    if (baseActualWeight > 0) {
      const baseUnit = baseItem.weightUnit?.toLowerCase() || 'kg';

      componentDetailsFull.value.forEach((item, i) => {
        if (i !== 0 && !item.glueExtra) {
          const currentRatio = Number(item.mixingRatio || '0');
          let newRequiredWeight = (currentRatio * baseActualWeight) / baseMixingRatio;

          // Xử lý khác biệt đơn vị giữa thành phần gốc và thành phần hiện tại
          const currentUnit = item.weightUnit?.toLowerCase() || 'kg';
          if (baseUnit === 'kg' && currentUnit === 'g') {
            newRequiredWeight *= 1000;
          } else if (baseUnit === 'g' && currentUnit === 'kg') {
            newRequiredWeight /= 1000;
          }

          item.requiredWeight = (newRequiredWeight.toFixed(3)) || '';
        }
      });
    }

    // 2. TỰ ĐỘNG CHUYỂN DÒNG TIẾP THEO VÀ SCROLL
    const nextIndex = componentDetailsFull.value.findIndex(item => !item.weighingTime);

    if (nextIndex !== -1) {
      const nextItem = componentDetailsFull.value[nextIndex];
      selectedItem.value = nextItem;
      activeComponent.value = { ...nextItem };
      mixingProcess.value.component = nextItem.materialName || '';

      if (nextIndex === 0) {
        activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
      }

      // Gọi hàm scroll
      await scrollToActiveRow();

    } else {
      activeComponent.value = { ...componentDetailsFull.value[index] };
      toast.add({ severity: 'success', summary: t('mixGlueManagement.toast.weighingComplete'), detail: t('mixGlueManagement.toast.weighingCompleteDetail'), life: 4000 });
    }

    await draftStore.saveDraft(currentWorkOrderId.value, {
      headerInfo: headerInfo.value,
      componentDetailsFull: componentDetailsFull.value
    });
  }
};

const handleConnectionStatus = (status: boolean) => {
  console.log(status ? "Cân đã kết nối!" : "Mất kết nối với cân!");
};

// ============================================================================
// 5. LOGIC MODAL THÊM THÀNH PHẦN
// ============================================================================
const productDialog = ref(false);
const materialsList = ref<any[]>([]);
const isLoadingMaterials = ref(false);

const handleSaveNewComponent = async (newComponentData: { name: string, percentage: string, materialCode: string, weightUnit: string }) => {
  const baseItem = componentDetailsFull.value[0];
  if (!baseItem) {
    toast.add({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.baseNotFound'), life: 3000 });
    return;
  }
  if (Number(baseItem?.actualWeight || 0) <= 0) {
    toast.add({ severity: 'warn', summary: t('listMixGlue.toast.warning'), detail: t('mixGlueManagement.toast.weighBaseFirst'), life: 3000 });
    return;
  }
  const baseActualWeight = Number(baseItem?.actualWeight || '0');
  const baseMixingRatio = Number(baseItem?.mixingRatio || '100');
  const newPercentage = Number(newComponentData.percentage || '0');

  let calculatedRequiredWeight = baseMixingRatio > 0
    ? (newPercentage * baseActualWeight) / baseMixingRatio
    : 0;

  // Xử lý khác biệt đơn vị
  const baseUnit = baseItem?.weightUnit?.toLowerCase() || 'kg';
  const currentUnit = newComponentData.weightUnit?.toLowerCase() || 'kg';

  if (baseUnit === 'kg' && currentUnit === 'g') {
    calculatedRequiredWeight *= 1000;
  } else if (baseUnit === 'g' && currentUnit === 'kg') {
    calculatedRequiredWeight /= 1000;
  }

  componentDetailsFull.value.push({
    materialName: newComponentData.name,
    materialCode: newComponentData.materialCode,
    weightUnit: newComponentData.weightUnit,
    requiredWeight: calculatedRequiredWeight > 0 ? calculatedRequiredWeight.toFixed(3) : '',
    actualWeight: '',
    operator: '',
    operatorId: '',
    weighingTime: '',
    lowerTolerance: '',
    upperTolerance: '',
    mixingRatio: (newComponentData.percentage).toString(),
    glueExtra: true,
    mixGlue: true,
    noMixGlue: false,
    factoryId: authStore.user?.factoryId || ''
  });

  await draftStore.saveDraft(currentWorkOrderId.value, {
    headerInfo: headerInfo.value,
    componentDetailsFull: componentDetailsFull.value
  });

  toast.add({ severity: 'success', summary: t('mixGlueManagement.toast.addSuccess'), detail: t('mixGlueManagement.toast.addSuccessDetail'), life: 3000 });
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

      // 2. Cập nhật lại bản nháp trong Store ngay lập tức
      void draftStore.saveDraft(currentWorkOrderId.value, {
        headerInfo: headerInfo.value,
        componentDetailsFull: componentDetailsFull.value
      });

      toast.add({
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

const fetchMaterials = async () => {
  isLoadingMaterials.value = true;
  try {
    const { data } = await materialApi.postMaterial({ factoryId: authStore.user?.factoryId || '' });

    if (data?.success) {
      const existingCodes = componentDetailsFull.value.map(item => String(item.materialCode));

      materialsList.value = (data.data || []).filter(
        (item: any) => !existingCodes.includes(String(item.materialCode))
      );
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('mixGlueManagement.toast.loadMaterialsFailed'), life: 3000 });
  } finally {
    isLoadingMaterials.value = false;
  }
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
                try {
                  const payload = buildPayload('C', { onlyProgressLines: true });
                  await mixGlueApi.postMixGlueCommand(payload);
                  await draftStore.saveDraft(currentWorkOrderId.value, {
                    headerInfo: headerInfo.value,
                    componentDetailsFull: componentDetailsFull.value,
                    hourlyValidity: hourlyValidity.value
                  });
                  isDirty.value = false;
                  resolve(true);
                } catch (error) {
                  console.error(error);
                  toast.add({
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
  selectedItem.value = null;
  mixingProcess.value = { component: '', weight: '' };
  isDirty.value = false;
  mixGlueConfirm.value = false;
};

onIonViewDidEnter(async () => {
  await nextTick();
  if (table2Ref.value) {
    table2Ref.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

onIonViewWillLeave(() => {
  releaseScaleConnection();
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