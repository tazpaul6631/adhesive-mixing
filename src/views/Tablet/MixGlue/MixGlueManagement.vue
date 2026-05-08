<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>Mix Glue Management</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" class="ion-padding" :scroll-events="true" @ionScroll="handleScroll">
      <Toast position="top-right" />

      <div class="main-container max-w-full mx-auto">
        <!-- Thông tin header -->
        <div class="surface-card p-3 shadow-1 border-round-xl">
          <div
            class="flex flex-wrap align-items-center justify-content-between border-bottom-1 surface-border pb-3 mb-3">
            <user-avatar />
            <div class="flex gap-2">
              <Button label="Lưu" icon="pi pi-save" outlined size="large" @click="handleSaveDraft" />
              <Button label="Xác nhận hoàn thành" icon="pi pi-check-circle" severity="success" size="large"
                @click="handleComplete" />
            </div>
          </div>

          <div class="grid formgrid p-fluid">
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
        </div>

        <!-- BẢNG 1 -->
        <div class="surface-card p-0 shadow-1 mt-4 border-round-xl">
          <div class="surface-100 p-3 border-round-top-xl">
            <span class="font-bold text-700 text-lg"><i class="pi pi-list mr-2"></i>Chi tiết dây chuyền</span>
          </div>
          <LineDetailsTable :is-loading="isLoadingLine" :line-details="lineDetails" />
        </div>

        <!-- BẢNG 2 -->
        <div class="surface-card p-0 shadow-1 border-round-xl mt-4">
          <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-box mr-2"></i>Thành phần trộn keo
            </span>
          </div>

          <div class="p-3 md:p-4 surface-50 border-bottom-1 surface-border">
            <div class="grid formgrid align-items-end">
              <div class="col-12 sm:col-5 lg:col-6 lg:mb-0">
                <label class="text-800 font-medium mb-2 block">Mã thành phần</label>
                <InputText v-model="mixingProcess.component" readonly
                  class="w-full font-bold text-primary border-blue-200" style="width: 350px;" />
              </div>

              <!-- Truyền dữ liệu target, lower, upper từ activeComponent vào ElectronicScale -->
              <ElectronicScale :target-weight="activeComponent?.requiredWeight || 0"
                :lower-tolerance="activeComponent?.lowerTolerance || 0"
                :upper-tolerance="activeComponent?.upperTolerance || 0" @update:weight="handleWeightChange"
                @connection-status="handleConnectionStatus" @confirm-weight="handleConfirmWeight" />
            </div>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <div ref="table2Ref" class="table-wrapper">
              <MixingComponentsTable :is-loading="isLoadingComponent" :components="componentDetailsFull"
                :header-total-weight="headerInfo.totalWeight" @row-click="onRowClick"
                @open-new="productDialog = true" />
            </div>

            <!-- MODAL THÊM THÀNH PHẦN -->
            <AddComponentDialog v-model:visible="productDialog" :materials-list="materialsList"
              :is-loading-materials="isLoadingMaterials" @fetch-materials="fetchMaterials"
              @save="handleSaveNewComponent" />

          </div>
        </div>
        <div class="h-3rem flex-shrink-0"></div>
      </div>
      <BackToTop slot="fixed" :showScrollButton="showScrollButton" @scrollToTop="scrollToTop" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick, watch } from 'vue';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
  IonTitle, onIonViewDidEnter, useBackButton
} from '@ionic/vue';
import { useToast } from 'primevue/usetoast';

// Stores & APIs
import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import materialApi from '@/api/material';

// Components & Utils
import BackToTop from '@/components/BackToTop.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import ElectronicScale from '@/components/ElectronicScale.vue';
import format from '@/mixins/format';
import LineDetailsTable from '@/views/Tablet/MixGlue/components/LineDetailsTable.vue';
import MixingComponentsTable from '@/views/Tablet/MixGlue/components/MixingComponentsTable.vue';
import AddComponentDialog from '@/views/Tablet/MixGlue/components/AddComponentDialog.vue';

// ============================================================================
// 1. INTERFACES & TYPES
// ============================================================================
interface LineDetail {
  productLineName?: string;
  workOrderMasterName?: string;
  styleName?: string;
  requestDetailName?: string;
  workOrderWeight?: number;
  workOrderWeightUnit?: string;
  requestTime?: string;
}

interface ComponentDetail {
  materialName?: string;
  requiredWeight?: number | string;
  actualWeight?: number;
  operator?: string;
  weighingTime?: string;
  lowerTolerance?: number;
  upperTolerance?: number;
  mixingRatio?: number;
}

// ============================================================================
// 2. GOLBAL SETUP & REFS CHUNG
// ============================================================================
const toast = useToast();
const authStore = useAuthStore();
const draftStore = useMixGlueDraftStore();
const route = useRoute();
const router = useRouter();

const currentWorkOrderId = ref('');
const isDirty = ref(false); // Theo dõi thay đổi chưa lưu

// ============================================================================
// 3. LOGIC LẤY & LƯU DỮ LIỆU ĐƠN HÀNG (WORK ORDER)
// ============================================================================
const headerInfo = ref({ orderNo: '', glue: '', totalWeight: '' });
const lineDetails = ref<LineDetail[]>([]);
const componentDetailsFull = ref<ComponentDetail[]>([]);
const isLoadingLine = ref(true);
const isLoadingComponent = ref(true);

watch(componentDetailsFull, () => {
  if (!isLoadingComponent.value) isDirty.value = true;
}, { deep: true });

const fetchWorkOrderDetail = async (id: string) => {
  isLoadingLine.value = true;
  isLoadingComponent.value = true;
  currentWorkOrderId.value = id;

  const savedDraft = draftStore.getDraft(id);
  if (savedDraft) {
    headerInfo.value = savedDraft.headerInfo;
    componentDetailsFull.value = savedDraft.componentDetailsFull;
    await finalizeLoading();
    return;
  }

  try {
    const { data } = await workOrder.getWorkOrder(id);
    if (data?.success) {
      const respData = data.data;
      headerInfo.value = {
        orderNo: respData.workOrderMasterName || '',
        glue: respData.chemicalMasterName || '',
        totalWeight: respData.workOrderWeight?.toString() || ''
      };

      lineDetails.value = respData.orderDetails || [];
      componentDetailsFull.value = (respData.chemicals || []).map((item: any) => ({
        ...item,
        requiredWeight: item.requiredWeight || item.netWeight || '',
        actualWeight: item.actualWeight || '',
        lowerTolerance: item.lowerTolerance || 0,
        upperTolerance: item.upperTolerance || 0,
        mixingRatio: item.mixingRatio || 100
      }));

      // Set default for first item
      if (componentDetailsFull.value.length > 0) {
        componentDetailsFull.value[0].requiredWeight = Number(headerInfo.value.totalWeight);
        activeComponent.value = { ...componentDetailsFull.value[0] };
        mixingProcess.value.component = componentDetailsFull.value[0].materialName || '';
      }
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu chi tiết:', error);
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

const handleSaveDraft = () => {
  draftStore.saveDraft(currentWorkOrderId.value, {
    headerInfo: headerInfo.value,
    componentDetailsFull: componentDetailsFull.value
  });
  isDirty.value = false;
  toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã lưu bản nháp', life: 3000 });
};

const handleComplete = async () => {
  try {
    draftStore.clearDraft(currentWorkOrderId.value);
    isDirty.value = false;
    toast.add({ severity: 'success', summary: 'Hoàn thành', detail: 'Đã gửi dữ liệu', life: 3000 });
    router.push('/list-mix-glue');
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xác nhận', life: 3000 });
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

  if (rowIndex === 0) {
    activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
  }
};

const handleWeightChange = (newWeight: string) => {
  mixingProcess.value.weight = newWeight;
};

const handleConfirmWeight = (actualWeight: number) => {
  if (!activeComponent.value) return;

  const index = componentDetailsFull.value.findIndex(
    item => item.materialName === activeComponent.value?.materialName
  );

  if (index !== -1) {
    // 4.1. Cập nhật dữ liệu dòng hiện tại
    componentDetailsFull.value[index].actualWeight = actualWeight;
    componentDetailsFull.value[index].operator = authStore.user?.employeeName || 'Chưa xác định';
    componentDetailsFull.value[index].weighingTime = format.formatDate(new Date().toISOString());

    // 4.2. Tính toán lại TL yêu cầu cho các dòng sau dựa trên dòng 1
    const baseItem = componentDetailsFull.value[0];
    const baseActualWeight = Number(baseItem.actualWeight || 0);
    const baseMixingRatio = Number(baseItem.mixingRatio || 100);

    if (baseActualWeight > 0) {
      componentDetailsFull.value.forEach((item, i) => {
        if (i !== 0) {
          const currentRatio = Number(item.mixingRatio || 0);
          const newRequiredWeight = (currentRatio * baseActualWeight) / baseMixingRatio;
          item.requiredWeight = Number(newRequiredWeight.toFixed(3)) || '';
        }
      });
    }
    activeComponent.value = { ...componentDetailsFull.value[index] };
  }
};

const handleConnectionStatus = (status: boolean) => {
  console.log(status ? "Cân đã kết nối!" : "Mất kết nối với cân!");
};

// ============================================================================
// 5. LOGIC MODAL THÊM THÀNH PHẦN
// ============================================================================
const productDialog = ref(false); // ĐÃ THÊM BIẾN NÀY ĐỂ MỞ MODAL
const materialsList = ref<any[]>([]);
const isLoadingMaterials = ref(false);

// Xử lý khi nhận sự kiện 'save' từ AddComponentDialog
const handleSaveNewComponent = (newComponentData: { name: string, percentage: number }) => {
  const baseItem = componentDetailsFull.value[0];
  const baseActualWeight = Number(baseItem?.actualWeight || 0);
  const baseMixingRatio = Number(baseItem?.mixingRatio || 100);

  // Tính toán trọng lượng yêu cầu
  const calculatedRequiredWeight = (newComponentData.percentage * baseActualWeight) / baseMixingRatio;

  componentDetailsFull.value.push({
    materialName: newComponentData.name,
    requiredWeight: Number(calculatedRequiredWeight.toFixed(3)) || '',
    actualWeight: 0,
    operator: '',
    weighingTime: '',
    lowerTolerance: 5,
    upperTolerance: 5,
    mixingRatio: newComponentData.percentage
  });
};

const fetchMaterials = async () => {
  isLoadingMaterials.value = true;
  try {
    const { data } = await materialApi.postMaterial({ factoryId: authStore.user?.factoryId || '' });
    if (data?.success) materialsList.value = data.data || [];
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải thành phần', life: 3000 });
  } finally {
    isLoadingMaterials.value = false;
  }
};

// ============================================================================
// 6. UI & SCROLL CHUNKS
// ============================================================================
const contentRef = ref<any>(null);
const table2Ref = ref<HTMLDivElement | null>(null);
const showScrollButton = ref(false);

const handleScroll = (event: CustomEvent) => {
  showScrollButton.value = event.detail.scrollTop > 100;
};

const scrollToTop = () => {
  contentRef.value?.$el?.scrollToTop(500);
};

// ============================================================================
// 7. NAVIGATION & GUARDS (CHẶN THOÁT)
// ============================================================================
const goBack = () => router.back();

const alertKhongChoPhepThoat = (nextFunction?: any) => {
  const confirmLeave = window.confirm("Dữ liệu chưa được lưu. Bạn có chắc chắn muốn thoát? Dữ liệu đang cân sẽ bị mất.");
  if (confirmLeave) {
    isDirty.value = false;
    nextFunction ? nextFunction() : router.back();
  } else {
    if (nextFunction) nextFunction(false);
  }
};

useBackButton(10, (processNextHandler) => {
  isDirty.value ? alertKhongChoPhepThoat() : processNextHandler();
});

onBeforeRouteLeave((to, from, next) => {
  isDirty.value ? alertKhongChoPhepThoat(next) : next();
});

// ============================================================================
// 8. LIFECYCLE HOOKS
// ============================================================================
onIonViewDidEnter(async () => {
  await nextTick();
  if (table2Ref.value) {
    table2Ref.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

onMounted(() => {
  const workOrderMasterId = route.query.workOrderMasterId as string;
  if (workOrderMasterId) {
    fetchWorkOrderDetail(workOrderMasterId);
  } else {
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
  }
});
</script>

<style scoped></style>