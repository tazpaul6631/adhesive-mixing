<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>Separate Mixed Glue</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" :scroll-events="true">
      <Toast position="top-right" />

      <div class="main-container max-w-full mx-auto">
        <!-- Thông tin header -->
        <div class="surface-card p-3 shadow-1 border-round-xl">
          <div class="flex flex-wrap align-items-center justify-content-between">
            <!-- <user-avatar /> -->
            <div class="grid formgrid p-fluid flex">
              <div class="col-12 sm:col-6 lg:col-4">
                <label class="text-800 font-medium mb-1 block">Đơn điều công</label>
                <InputText v-model="headerInfo.orderNo" readonly class="font-bold text-blue-600" />
              </div>
              <div class="col-12 sm:col-6 lg:col-4">
                <label class="text-800 font-medium mb-1 block">Keo</label>
                <InputText v-model="headerInfo.glue" readonly class="font-bold text-blue-600" />
              </div>
              <div class="col-12 sm:col-6 lg:col-4 sm:mt-2 lg:mt-0">
                <label class="text-800 font-medium mb-1 block">Tổng trọng lượng (Kg)</label>
                <InputText v-model="headerInfo.totalWeight" readonly class="font-bold text-blue-600" />
              </div>
            </div>
            <div class="flex gap-2">
              <!-- <Button icon="pi pi-save" outlined size="large" @click="handleSaveDraft" /> -->
              <Button icon="pi pi-check-circle" severity="success" size="large" @click="handleComplete" />
            </div>
          </div>
        </div>

        <div class="segment-tabs">
          <ion-segment v-model="selectedTab" mode="ios" scrollable @ionChange="onSegmentIonChange">
            <ion-segment-button value="table1" content-id="table1">
              <ion-label class="font-bold">KEO TRỘN</ion-label>
            </ion-segment-button>
            <ion-segment-button value="table2" content-id="table2">
              <ion-label class="font-bold">KEO KHÔNG TRỘN</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <ion-segment-view>
          <ion-segment-content id="table1">
            <div class="surface-card p-0 shadow-1 border-round-xl">
              <div class="surface-100 p-3 border-round-top-xl">
                <span class="font-bold text-700 text-lg">
                  <i class="pi pi-list mr-2"></i>Chi tiết đơn yêu cầu chiết thùng keo trộn
                </span>
              </div>
              <SeparateGlue :is-loading="isLoadingLine" :order-details="mixedGlueTableDetails"
                @update-bucket="saveDraftToStoreOnly" />
            </div>
          </ion-segment-content>

          <ion-segment-content id="table2">
            <div class="surface-card p-0 shadow-1 border-round-xl">
              <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between">
                <span class="font-bold text-700 text-lg">
                  <i class="pi pi-box mr-2"></i>Chi tiết đơn yêu cầu sử dụng keo không trộn
                </span>
              </div>

              <div class="p-3 md:p-4 surface-50 border-bottom-1 surface-border">
                <div class="grid formgrid align-items-end">
                  <div class="col-12 sm:col-6 lg:col-3 lg:mb-0">
                    <label class="text-800 font-medium mb-2 block">Hình thể</label>
                    <InputText v-model="mixingProcess.styleName" readonly class="font-bold text-primary border-blue-200"
                      style="width: 280px;" fluid />
                  </div>

                  <div class="col-12 sm:col-6 lg:col-3 lg:mb-0">
                    <label class="text-800 font-medium mb-2 block">Keo</label>
                    <InputText v-model="mixingProcess.component" readonly class="font-bold text-primary border-blue-200"
                      style="width: 280px;" fluid />
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

              <div class="overflow-x-auto border-round-bottom-xl">
                <div class="table-wrapper">
                  <NoSeparateGlue :is-loading="isLoadingComponent" :no-mix-chemicals="noMixComponents"
                    :header-total-weight="headerInfo.totalWeight" v-model:selectedItem="selectedItem"
                    @row-click="onRowClick" @open-new="productDialog = true" @delete-row="handleDeleteComponent"
                    @chiet-row="handleChietRow" @view-row="handleViewRow" />
                </div>

                <AddComponentDialog v-model:visible="productDialog" :materials-list="materialsList"
                  :is-loading-materials="isLoadingMaterials" @fetch-materials="fetchMaterials"
                  @save="handleSaveNewComponent" />

                <SeparateGlueDialog v-model:visible="chietDialog" :chemical="currentChietChemical"
                  :order-details="chietOrderDetails" :is-view-mode="isViewMode" @confirm="confirmChiet" />
              </div>
            </div>
          </ion-segment-content>
        </ion-segment-view>
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
  IonSegment, IonSegmentButton, IonLabel, onIonViewWillEnter, IonSegmentView, IonSegmentContent
} from '@ionic/vue';
import { useToast } from 'primevue/usetoast';
import UI from '@/mixins/present';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore, isSeparateDraftRestorable } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import materialApi from '@/api/material';

import ElectronicScale from '@/components/ElectronicScale.vue';
import AddComponentDialog from '@/views/Tablet/Separate/components/AddComponentDialog.vue';
import SeparateGlue from '@/views/Tablet/Separate/components/SeparateGlue.vue';
import NoSeparateGlue from '@/views/Tablet/Separate/components/NoSeparateGlue.vue';
import SeparateGlueDialog from '@/views/Tablet/Separate/components/SeparateGlueDialog.vue';
import separateGlue from '@/api/separate';

dayjs.extend(customParseFormat);
// ============================================================================
// GLOBAL SETUP & REFS
// ============================================================================
const toast = useToast();
const authStore = useAuthStore();
const draftStore = useMixGlueDraftStore();
const route = useRoute();
const router = useRouter();

const currentWorkOrderId = ref('');
const isDirty = ref(false);
const isNavigatingAway = ref(false);
const startDate = ref('');
const endDate = ref('');

const headerInfo = ref({ orderNo: '', glue: '', totalWeight: '' });
const orderDetails = ref<any[]>([]);
const mixChemicals = ref<any[]>([]);
const noMixChemicalsFull = ref<any[]>([]);
const noMixComponents = ref<any[]>([]);
const selectedItem = ref<any>(null);
const activeComponent = ref<any>(null);
const mixingProcess = ref({ component: '', weight: '', styleName: '' });

const isLoadingLine = ref(true);
const isLoadingComponent = ref(true);
const hourlyValidity = ref<string>('0');

const selectedTab = ref('table1');

/** Đồng bộ swipeable segment + ion-segment-view (Ionic 8); tránh lệch state với v-model. */
const onSegmentIonChange = (event: CustomEvent) => {
  const v = (event.detail as { value?: string })?.value;
  if (v) selectedTab.value = v;
};

const productDialog = ref(false);
const materialsList = ref<any[]>([]);
const isLoadingMaterials = ref(false);
const isViewMode = ref(false);
const chietDialog = ref(false);
const chietOrderDetails = ref<any[]>([]);
const currentChietChemical = ref<any>(null);
const extraChietList = ref<any[]>([]); // Chứa mảng dữ liệu chiết thêm từ Modal
const mixGlueMasterId = ref<string>('');

/** Tab keo trộn: chỉ hiện orderDetails khi API có mixChemicals. */
const mixedGlueTableDetails = computed(() => {
  return mixChemicals.value.length > 0 ? orderDetails.value : [];
});

watch(noMixChemicalsFull, () => {
  if (!isLoadingComponent.value) isDirty.value = true;
}, { deep: true });

watch(orderDetails, () => {
  if (!isLoadingLine.value) isDirty.value = true;
}, { deep: true });

watch(noMixComponents, () => {
  if (!isLoadingComponent.value) isDirty.value = true;
}, { deep: true });

const resetState = () => {
  isDirty.value = false;
  isNavigatingAway.value = false;
  startDate.value = '';
  endDate.value = '';
  headerInfo.value = { orderNo: '', glue: '', totalWeight: '' };
  orderDetails.value = [];
  mixChemicals.value = [];
  noMixChemicalsFull.value = [];
  noMixComponents.value = [];
  selectedItem.value = null;
  activeComponent.value = null;
  mixingProcess.value = { component: '', weight: '', styleName: '' };
  hourlyValidity.value = '0';
  selectedTab.value = 'table1'; // Tùy chọn: Đưa tab về mặc định

  // Clear data của Modal chiết
  extraChietList.value = [];
  chietOrderDetails.value = [];
  currentChietChemical.value = null;
};

// ============================================================================
const fetchWorkOrderDetail = async (id: string) => {
  resetState();

  isLoadingLine.value = true;
  isLoadingComponent.value = true;
  currentWorkOrderId.value = id;

  try {
    await draftStore.ensureHydrated();
    const existingDraft = draftStore.getDraft(id);

    if (isSeparateDraftRestorable(existingDraft)) {
      headerInfo.value = existingDraft!.headerInfo as typeof headerInfo.value;
      noMixChemicalsFull.value = existingDraft!.noMixChemicalsFull as any[];
      noMixComponents.value = (existingDraft!.noMixComponents as any[]) || [];
      extraChietList.value = (existingDraft!.extraChietList as any[]) || [];

      selectedItem.value = noMixChemicalsFull.value[0];
      activeComponent.value = { ...noMixChemicalsFull.value[0] };
      mixingProcess.value.styleName = noMixChemicalsFull.value[0]?.styleName || '';
      mixingProcess.value.component = noMixChemicalsFull.value[0]?.materialName || '';

      const { data } = await workOrder.getWorkOrder(id, 3);
      if (data?.success) {
        const respData = data.data;
        startDate.value = respData.startDate || new Date().toISOString();
        endDate.value = respData.endDate || new Date().toISOString();
        hourlyValidity.value = respData.hourlyValidity || '0';
        mixChemicals.value = respData.mixChemicals || [];
        orderDetails.value = existingDraft.orderDetails || respData.orderDetails || [];
        mixGlueMasterId.value = respData.mixGlueMasterId || '';
      }

      toast.add({ severity: 'info', summary: 'Khôi phục', detail: 'Đã tải lại dữ liệu đã lưu', life: 3000 });
    } else {
      const { data } = await workOrder.getWorkOrder(id, 3);
      if (data?.success) {
        const respData = data.data;
        startDate.value = respData.startDate || new Date().toISOString();
        endDate.value = respData.endDate || new Date().toISOString();
        hourlyValidity.value = respData.hourlyValidity || '0';
        mixGlueMasterId.value = respData.mixGlueMasterId || '';

        headerInfo.value = {
          orderNo: respData.workOrderMasterName || '',
          glue: respData.chemicalMasterName || '',
          totalWeight: respData.workOrderWeight?.toString() || ''
        };

        mixChemicals.value = respData.mixChemicals || [];
        orderDetails.value = respData.orderDetails || [];

        noMixChemicalsFull.value = (respData.mixChemicals || []).map((item: any) => ({
          factoryId: item.factoryId,
          factoryName: item.factoryName,
          styleName: item.styleName,
          materialCode: item.materialCode || '0',
          materialName: item.materialName,
          weightUnit: item.weightUnit || 'Kg',
          requiredWeight: item.requiredWeight || '',
          actualWeight: item.actualWeight || '',
          lowerTolerance: item.lowerTolerance || '0',
          upperTolerance: item.upperTolerance || '0',
          mixingRatio: item.mixingRatio || '100',
          glueExtra: item.glueExtra || false
        }));

        noMixComponents.value = respData.noMixChemicals || [];

        if (noMixComponents.value.length > 0) {
          selectedItem.value = noMixComponents.value[0];
          activeComponent.value = { ...noMixComponents.value[0] };
          activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
          mixingProcess.value.styleName = noMixComponents.value[0].styleName || '';
          mixingProcess.value.component = noMixComponents.value[0].materialName || '';
        }
      }
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu chi tiết:', error);
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu đơn hàng', life: 3000 });
  } finally {
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
    await nextTick();
    isDirty.value = false;
  }
};

// ============================================================================
// PAYLOAD & LƯU HOÀN THÀNH
// ============================================================================
const buildPayload = (recordStatus: string, options?: { forComplete?: boolean }) => {
  const factoryId = authStore.user?.factoryId || '';
  const employeeId = authStore.user?.employeeId || '';
  const defaultTime = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');

  /** Hoàn thành (nút ✓): không có mixChemicals thì không gửi separateGlues từ orderDetails. */
  const orderDetailsForPayload =
    options?.forComplete && mixChemicals.value.length === 0 ? [] : orderDetails.value;

  // Payload Bảng 1
  const baseSeparateGlues = orderDetailsForPayload.map(item => ({
    glueId: mixGlueMasterId.value || '',
    bucketId: item.selectedBucketId || '',
    recordStatus: recordStatus,
    createrId: item.operatorId || employeeId,
    updaterId: item.operatorId || employeeId,
    confirmDate: item.confirmDate || defaultTime
  }));

  // Payload Chiết thùng
  const separateGlues = extraChietList.value.map(item => ({
    glueId: item.glueId,
    bucketId: item.bucketId,
    recordStatus: recordStatus,
    createrId: item.operatorId || employeeId,
    updaterId: item.operatorId || employeeId,
    confirmDate: item.confirmDate || defaultTime
  }));

  const finalSeparateGlues = [...baseSeparateGlues, ...separateGlues];

  // Payload Bảng 2
  const finalNoSeparateGlues = noMixComponents.value
    .filter(item => item.actualWeight && Number(item.actualWeight) > 0)
    .map(item => ({
      materialCode: item.materialCode || '',
      glueWeight: Number(item.actualWeight) || 0,
      glueWeightUnit: item.weightUnit || 'Kg',
      glueExtra: !!item.glueExtra,
      recordStatus: item.recordStatus ? item.recordStatus : recordStatus,
      createrId: item.operatorId || employeeId,
      updaterId: item.operatorId || employeeId,
      confirmDate: item.confirmDate || defaultTime
    }));

  return {
    factoryId: factoryId,
    workOrderMasterId: currentWorkOrderId.value,
    startDate: startDate.value,
    endDate: endDate.value,
    createrId: employeeId,
    updaterId: employeeId,
    separateGlues: finalSeparateGlues,
    noSeparateGlues: finalNoSeparateGlues
  };
};

/** Thoát: recordStatus C — chỉ gửi bảng 1 nếu có chọn thùng / chiết; bảng 2 chỉ dòng đã cân. Bảng chưa đụng → mảng rỗng. */
const buildExitPayload = () => {
  const recordStatus = 'C';
  const factoryId = authStore.user?.factoryId || '';
  const employeeId = authStore.user?.employeeId || '';
  const defaultTime = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');

  const table1Touched =
    orderDetails.value.some((item: any) => !!item.selectedBucketId) ||
    extraChietList.value.length > 0;

  const baseSeparateGlues = table1Touched
    ? orderDetails.value
      .filter((item: any) => !!item.selectedBucketId)
      .map((item: any) => ({
        glueId: mixGlueMasterId.value || '',
        bucketId: item.selectedBucketId || '',
        recordStatus,
        createrId: item.operatorId || employeeId,
        updaterId: item.operatorId || employeeId,
        confirmDate: item.confirmDate || defaultTime
      }))
    : [];

  const separateGluesExtra = table1Touched
    ? extraChietList.value.map((item: any) => ({
      glueId: item.glueId,
      bucketId: item.bucketId,
      recordStatus,
      createrId: item.operatorId || employeeId,
      updaterId: item.operatorId || employeeId,
      confirmDate: item.confirmDate || defaultTime
    }))
    : [];

  const finalSeparateGlues = table1Touched ? [...baseSeparateGlues, ...separateGluesExtra] : [];

  const finalNoSeparateGlues = noMixComponents.value
    .filter(item => item.actualWeight && Number(item.actualWeight) > 0)
    .map(item => ({
      materialCode: item.materialCode || '',
      glueWeight: Number(item.actualWeight) || 0,
      glueWeightUnit: item.weightUnit || 'Kg',
      glueExtra: !!item.glueExtra,
      recordStatus: item.recordStatus ? item.recordStatus : recordStatus,
      createrId: item.operatorId || employeeId,
      updaterId: item.operatorId || employeeId,
      confirmDate: item.confirmDate || defaultTime
    }));

  return {
    factoryId,
    workOrderMasterId: currentWorkOrderId.value,
    startDate: startDate.value,
    endDate: endDate.value,
    createrId: employeeId,
    updaterId: employeeId,
    separateGlues: finalSeparateGlues,
    noSeparateGlues: finalNoSeparateGlues
  };
};

const handleSaveDraft = async () => {
  // const isIncomplete = noMixChemicalsFull.value.some(item => !item.actualWeight || Number(item.actualWeight) <= 0);
  // if (isIncomplete) return toast.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng thực hiện cân đầy đủ!', life: 4000 });

  try {
    await draftStore.saveDraft(currentWorkOrderId.value, {
      headerInfo: headerInfo.value,
      noMixChemicalsFull: noMixChemicalsFull.value,
      noMixComponents: noMixComponents.value,
      orderDetails: orderDetails.value,
      extraChietList: extraChietList.value
    });

    const payload = buildPayload("0");
    console.log("Save Draft Payload:", payload);
    // await separateGlue.postSeparateGlueCommand(payload);

    isDirty.value = false;
    toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã lưu bản nháp', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể lưu bản nháp', life: 3000 });
  }
};

const handleComplete = async () => {
  // const isIncomplete = noMixChemicalsFull.value.some(item => !item.actualWeight || Number(item.actualWeight) <= 0);
  // if (isIncomplete) {
  //   return toast.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng thực hiện cân đầy đủ!', life: 4000 });
  // }

  try {
    const payload = buildPayload('1', { forComplete: true });
    await separateGlue.postSeparateGlueCommand(payload);
    console.log("Save Draft Payload:", payload);

    // Chặn mọi tác vụ lưu nháp khi đang thoát
    isNavigatingAway.value = true;

    // Xóa draft và điều hướng
    await draftStore.clearDraft(currentWorkOrderId.value);
    isDirty.value = false;
    toast.add({ severity: 'success', summary: 'Hoàn thành', detail: 'Đã gửi dữ liệu thành công', life: 3000 });
    router.push('/list-separate-mixed-glue-management');
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xác nhận hoàn thành', life: 3000 });
  }
};

// ============================================================================
// CÂN & XỬ LÝ TABLE
// ============================================================================
const onRowClick = (event: { data: any }) => {
  if (isLoadingComponent.value || !event.data?.materialName) return;

  mixingProcess.value.styleName = event.data.styleName || '';
  mixingProcess.value.component = event.data.materialName || '';

  const rowIndex = noMixComponents.value.findIndex(item => item === event.data);
  activeComponent.value = { ...event.data };
  selectedItem.value = event.data;

  if (rowIndex === 0) activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
};

const handleWeightChange = (newWeight: string) => {
  mixingProcess.value.weight = newWeight;
};

const scrollToActiveRow = async () => {
  setTimeout(() => {
    if (!activeComponent.value) return;

    const index = noMixComponents.value.findIndex(
      item => item.materialName === activeComponent.value?.materialName
    );

    if (index !== -1) {
      // Vì template dùng thẻ div.table-wrapper bao quanh component con NoSeparateGlue
      // Ta dùng querySelector để tìm vào tận bên trong tbody của DataTable
      const wrapper = document.querySelector('.table-wrapper .p-datatable-tbody');

      if (wrapper) {
        const rows = wrapper.querySelectorAll('tr');
        if (rows && rows[index]) {
          const activeRow = rows[index];
          activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, 100);
};

const handleConfirmWeight = async (actualWeight: string) => {
  if (!activeComponent.value) return;

  const index = noMixComponents.value.findIndex(item => item.materialName === activeComponent.value?.materialName);

  if (index !== -1) {
    const now = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');
    const weighedMaterialName = noMixComponents.value[index].materialName;
    const weighedOperator = authStore.user?.name || authStore.user?.employeeName || authStore.user?.employeeId || 'Chưa xác định';
    const weighedOperatorId = authStore.user?.employeeId || '';

    noMixComponents.value[index].actualWeight = actualWeight;
    noMixComponents.value[index].operator = weighedOperator;
    noMixComponents.value[index].operatorId = weighedOperatorId;
    noMixComponents.value[index].weighingTime = now;
    noMixComponents.value[index].confirmDate = now;

    const baseItem = noMixComponents.value[0];
    const baseActualWeight = Number(baseItem.actualWeight || '0');
    const baseMixingRatio = Number(baseItem.mixingRatio || '100');

    if (baseActualWeight > 0) {
      const baseUnit = baseItem.weightUnit?.toLowerCase() || 'kg';

      noMixComponents.value.forEach((item, i) => {
        if (i !== 0) {
          const currentRatio = Number(item.mixingRatio || '0');
          let newRequiredWeight = (currentRatio * baseActualWeight) / baseMixingRatio;

          // Xử lý khác biệt đơn vị
          const currentUnit = item.weightUnit?.toLowerCase() || 'kg';
          if (baseUnit === 'kg' && currentUnit === 'g') {
            newRequiredWeight *= 1000;
          } else if (baseUnit === 'g' && currentUnit === 'kg') {
            newRequiredWeight /= 1000;
          }

          item.requiredWeight = newRequiredWeight.toFixed(3);
        }
      });
    }

    // TỰ ĐỘNG CHUYỂN DÒNG TIẾP THEO VÀ SCROLL
    const nextIndex = noMixComponents.value.findIndex(item => !item.weighingTime);

    if (nextIndex !== -1) {
      const nextItem = noMixComponents.value[nextIndex];
      selectedItem.value = nextItem;
      activeComponent.value = { ...nextItem };
      mixingProcess.value.component = nextItem.materialName || '';
      mixingProcess.value.styleName = nextItem.styleName || '';

      if (nextIndex === 0) {
        activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
      }

      scrollToActiveRow();

    } else {
      activeComponent.value = { ...noMixComponents.value[index] };
      toast.add({ severity: 'success', summary: 'Hoàn tất', detail: 'Đã cân xong tất cả các thành phần.', life: 4000 });
    }

    const fullIndex = noMixChemicalsFull.value.findIndex(item => item.materialName === weighedMaterialName);
    if (fullIndex !== -1) {
      noMixChemicalsFull.value[fullIndex].actualWeight = actualWeight;
      noMixChemicalsFull.value[fullIndex].operator = weighedOperator;
      noMixChemicalsFull.value[fullIndex].operatorId = weighedOperatorId;
      noMixChemicalsFull.value[fullIndex].weighingTime = now;
      noMixChemicalsFull.value[fullIndex].confirmDate = now;
    }

    await saveDraftToStoreOnly();
  }
};

const handleConnectionStatus = (status: boolean) => {
  console.log(status ? "Cân đã kết nối!" : "Mất kết nối với cân!");
};

// ============================================================================
// MODAL & MATERIALS LOGIC
// ============================================================================
const handleSaveNewComponent = async (newComponentData: { name: string, percentage: string, materialCode: string, weightUnit: string }) => {
  const baseItem = noMixChemicalsFull.value[0];
  // if (!baseItem) {
  //   toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy hóa chất gốc', life: 3000 });
  //   return;
  // }
  // if (Number(baseItem?.actualWeight || 0) <= 0) {
  //   toast.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng cân thành phần gốc trước khi thêm thành phần mới', life: 3000 });
  //   return;
  // }
  const baseActualWeight = Number(baseItem?.actualWeight || '0');
  const baseMixingRatio = Number(baseItem?.mixingRatio || '100');
  const newPercentage = Number(newComponentData.percentage || '0');

  let calculatedReqWeight = baseMixingRatio > 0
    ? (newPercentage * baseActualWeight) / baseMixingRatio
    : 0;

  // Xử lý khác biệt đơn vị
  const baseUnit = baseItem?.weightUnit?.toLowerCase() || 'kg';
  const currentUnit = newComponentData.weightUnit?.toLowerCase() || 'kg';

  if (baseUnit === 'kg' && currentUnit === 'g') {
    calculatedReqWeight *= 1000;
  } else if (baseUnit === 'g' && currentUnit === 'kg') {
    calculatedReqWeight /= 1000;
  }

  const newComponent = {
    materialName: newComponentData.name,
    materialCode: newComponentData.materialCode,
    weightUnit: newComponentData.weightUnit,
    requiredWeight: calculatedReqWeight.toFixed(3),
    actualWeight: newComponentData.percentage.toString(), // Lấy trực tiếp số cân nhập từ modal
    operator: authStore.user?.name || authStore.user?.employeeName || authStore.user?.employeeId || 'Chưa xác định',
    operatorId: authStore.user?.employeeId || '',
    weighingTime: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS'),
    lowerTolerance: '0',
    upperTolerance: '0',
    mixingRatio: newComponentData.percentage.toString(),
    glueExtra: true,
    factoryName: baseItem?.factoryName,
    styleName: baseItem?.styleName,
    factoryId: authStore.user?.factoryId || ''
  };

  noMixChemicalsFull.value.push(newComponent);
  noMixComponents.value.push(newComponent);

  await draftStore.saveDraft(currentWorkOrderId.value, {
    headerInfo: headerInfo.value,
    noMixChemicalsFull: noMixChemicalsFull.value,
    noMixComponents: noMixComponents.value,
    orderDetails: orderDetails.value,
    extraChietList: extraChietList.value
  });

  toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã thêm thành phần mới', life: 3000 });
};

const handleDeleteComponent = async (rowToDelete: any) => {
  await UI.Confirm(
    'Xác nhận xóa',
    `Thành phần: ${rowToDelete.materialName}`,
    `Bạn có chắc chắn muốn xóa thành phần này?`,
    async () => {
      // 1. Xóa khỏi mảng dữ liệu gốc
      noMixChemicalsFull.value = noMixChemicalsFull.value.filter(
        item => item.materialCode !== rowToDelete.materialCode
      );

      // 2. Xóa khỏi mảng đang hiển thị trên Table
      noMixComponents.value = noMixComponents.value.filter(
        item => item.materialCode !== rowToDelete.materialCode
      );

      // 3. QUAN TRỌNG: Dọn dẹp luôn các record chiết thùng liên quan đến mã keo này
      extraChietList.value = extraChietList.value.filter(
        item => item.glueId !== rowToDelete.materialCode
      );

      // 4. Cập nhật lại bản nháp (Đảm bảo lưu kèm extraChietList đã update)
      await draftStore.saveDraft(currentWorkOrderId.value, {
        headerInfo: headerInfo.value,
        noMixChemicalsFull: noMixChemicalsFull.value,
        noMixComponents: noMixComponents.value,
        orderDetails: orderDetails.value,
        extraChietList: extraChietList.value
      });

      toast.add({ severity: 'success', summary: 'Đã xóa', detail: `Xóa thành phần thành công`, life: 3000 });
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
      const existingCodes = noMixChemicalsFull.value.map(item => String(item.materialCode));
      materialsList.value = (data.data || []).filter((item: any) => !existingCodes.includes(String(item.materialCode)));
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải thành phần', life: 3000 });
  } finally {
    isLoadingMaterials.value = false;
  }
};

const saveDraftToStoreOnly = async () => {
  if (isNavigatingAway.value) return;

  await draftStore.saveDraft(currentWorkOrderId.value, {
    headerInfo: headerInfo.value,
    noMixChemicalsFull: noMixChemicalsFull.value,
    noMixComponents: noMixComponents.value,
    orderDetails: orderDetails.value,
    extraChietList: extraChietList.value
  });
};

// ============================================================================
// XỬ LÝ MODAL CHIẾT KEO
// ============================================================================
const handleChietRow = (rowData: any) => {
  isViewMode.value = false;
  currentChietChemical.value = rowData;

  // SỬA Ở ĐÂY: Reset toàn bộ các trường liên quan đến thao tác chọn thùng
  chietOrderDetails.value = orderDetails.value.map(item => ({
    ...item,
    chemicalId: rowData.materialCode,
    selectedBucketId: null, // reset thùng
    operator: '',           // Xóa người thao tác cũ
    operatorId: '',
    confirmTime: null,      // Xóa thời gian hiển thị UI
    confirmDate: null       // Xóa thời gian gửi payload
  }));

  chietDialog.value = true;
};

const handleViewRow = (rowData: any) => {
  isViewMode.value = true; // Mở modal ở chế độ CHỈ XEM
  currentChietChemical.value = rowData;

  const savedData = extraChietList.value.filter(item => item.glueId === rowData.materialCode);

  chietOrderDetails.value = orderDetails.value.map(item => {
    const match = savedData.find(s => s.bucketId === item.selectedBucketId);
    return {
      ...item,
      chemicalId: rowData.materialCode,
      selectedBucketId: match ? match.bucketId : null,
      operator: match ? match.operator : '',
      operatorId: match ? match.operatorId : '',
      confirmDate: match ? match.confirmDate : null
    };
  });

  chietDialog.value = true;
};

const confirmChiet = async () => {
  // 1. Dọn dẹp data cũ
  extraChietList.value = extraChietList.value.filter(
    item => item.glueId !== currentChietChemical.value?.materialCode
  );

  const now = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');

  // 2. Thêm data mới
  chietOrderDetails.value.forEach(item => {
    if (item.selectedBucketId) {
      extraChietList.value.push({
        glueId: item.chemicalId || '',
        bucketId: item.selectedBucketId,
        _sourceLineId: item.selectedBucketId,
        operator: item.operator,
        operatorId: item.operatorId,
        confirmDate: item.confirmDate || now
      });
    }
  });

  // 3. Đánh dấu trạng thái ĐÃ CHIẾT bằng cờ UI (không đụng tới recordStatus)
  if (currentChietChemical.value?.materialCode) {
    const targetCode = currentChietChemical.value.materialCode;

    const index = noMixComponents.value.findIndex(item => item.materialCode === targetCode);
    if (index !== -1) noMixComponents.value[index].isChietCompleted = true;

    const fullIndex = noMixChemicalsFull.value.findIndex(item => item.materialCode === targetCode);
    if (fullIndex !== -1) noMixChemicalsFull.value[fullIndex].isChietCompleted = true;
  }

  // 4. Lưu vào draft store (Bao gồm cờ isChietCompleted)
  await draftStore.saveDraft(currentWorkOrderId.value, {
    headerInfo: headerInfo.value,
    noMixChemicalsFull: noMixChemicalsFull.value,
    noMixComponents: noMixComponents.value,
    orderDetails: orderDetails.value,
    extraChietList: extraChietList.value
  });

  toast.add({ severity: 'success', summary: 'Đã lưu chiết', detail: 'Thông tin chiết thùng được tạm lưu', life: 3000 });
  chietDialog.value = false;
};

// ============================================================================
// ĐIỀU HƯỚNG VÀ CẢNH BÁO THOÁT
// ============================================================================
const goBack = async () => {
  // Kiểm tra trực tiếp khi bấm nút Back trên UI
  if (isDirty.value) {
    const canLeave = await alertExitPage();
    if (canLeave) {
      router.back(); // Nếu đồng ý thoát, mới gọi router.back()
    }
  } else {
    router.back(); // Nếu chưa thay đổi gì thì cho thoát luôn
  }
};

const alertExitPage = (): Promise<boolean> =>
  new Promise(resolve => {
    void (async () => {
      const alert = await alertController.create({
        header: 'Cảnh báo chưa lưu',
        message:
          'Bạn có chắc chắn thoát không?',
        buttons: [
          { text: 'Ở lại', role: 'cancel', handler: () => resolve(false) },
          {
            text: 'Thoát',
            role: 'confirm',
            cssClass: 'text-red-500',
            handler: () => {
              void (async () => {
                try {
                  const payload = buildExitPayload();
                  await separateGlue.postSeparateGlueCommand(payload);
                  await draftStore.saveDraft(currentWorkOrderId.value, {
                    headerInfo: headerInfo.value,
                    noMixChemicalsFull: noMixChemicalsFull.value,
                    noMixComponents: noMixComponents.value,
                    orderDetails: orderDetails.value,
                    extraChietList: extraChietList.value
                  });
                  isDirty.value = false;
                  resolve(true);
                } catch (error) {
                  console.error(error);
                  toast.add({
                    severity: 'error',
                    summary: 'Lỗi',
                    detail: 'Không thể gửi lưu tiến độ (C) lên server.',
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

// Vẫn giữ lại cho nút Back cứng của Android (Hardware back button)
useBackButton(10, processNextHandler => {
  if (!isDirty.value) {
    processNextHandler();
    return;
  }
  void alertExitPage().then(ok => {
    if (ok) processNextHandler();
  });
});

// Vẫn giữ lại đề phòng user vuốt (swipe) để back hoặc dùng phím back trình duyệt
onBeforeRouteLeave(async (to, from) => {
  if (isDirty.value) {
    const canLeave = await alertExitPage();
    return canLeave;
  }
  return true;
});

onIonViewDidEnter(async () => {
  await nextTick();
});

onIonViewWillEnter(() => {
  selectedTab.value = 'table1';
  const workOrderMasterId = route.query.workOrderMasterId as string;
  if (workOrderMasterId) {
    fetchWorkOrderDetail(workOrderMasterId);
  } else {
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
  }
});
</script>

<style scoped>
/* Khối tab: không cho co khi .main-container là flex column full-height (tránh tab "biến mất" giống trang list). */
.segment-tabs {
  flex-shrink: 0;
  width: 100%;
  position: relative;
  z-index: 2;
}

/* Xóa các css lỗi cũ và thay bằng: */
ion-segment-view {
  min-height: 500px;
  /* Chiều cao tối thiểu để chống co sập */
  height: auto;
  width: 100%;
}

ion-segment-content {
  width: 100%;
}

ion-segment {
  height: 50px;
  min-height: 50px;
  flex-shrink: 0;
  width: 100%;
}

ion-segment-button {
  width: auto;
}

ion-label {
  line-height: normal !important;
}
</style>