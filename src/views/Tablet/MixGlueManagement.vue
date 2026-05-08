<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/list-mix-glue"></ion-back-button>
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
              <Button label="Lưu" icon="pi pi-save" outlined size="large" />
              <Button label="Xác nhận hoàn thành" icon="pi pi-check-circle" severity="success" size="large" />
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

          <div class="overflow-x-auto border-round-bottom-xl">
            <DataTable :value="isLoadingLine ? skeletons : lineDetails" scrollable scrollHeight="700px"
              tableStyle="min-width: 70rem" stripedRows class="modern-table">

              <Column field="productLineName" header="Xưởng" style="min-width: 100px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.productLineName }}</span>
                </template>
              </Column>

              <Column field="workOrderMasterName" header="Đơn yêu cầu" style="min-width: 180px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.workOrderMasterName }}</span>
                </template>
              </Column>

              <Column field="styleName" header="Hình thể" style="min-width: 150px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="70%" height="1rem" />
                  <span v-else>{{ data.styleName }}</span>
                </template>
              </Column>

              <Column field="requestDetailName" header="Chuyền" style="min-width: 120px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1.5rem" class="border-round-md" />
                  <span v-else class="bg-blue-50 text-blue-700 px-2 py-1 border-round-md font-medium text-sm">
                    {{ data.requestDetailName }}
                  </span>
                </template>
              </Column>

              <Column field="workOrderWeight" header="Trọng lượng" style="min-width: 120px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <span v-else>{{ data.workOrderWeight }} {{ data.workOrderWeightUnit }}</span>
                </template>
              </Column>

              <Column field="requestTime" header="Thời gian lãnh" style="min-width: 180px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="90%" height="1rem" />
                  <span v-else class="text-500">
                    <i class="pi pi-clock text-xs mr-1"></i>{{ format.formatDate(data.requestTime) }}
                  </span>
                </template>
              </Column>
            </DataTable>
          </div>
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
              <div class="col-12 sm:col-5 lg:col-4 lg:mb-0">
                <label class="text-800 font-medium mb-2 block">Mã thành phần</label>
                <InputText v-model="mixingProcess.component" readonly
                  class="w-full font-bold text-primary border-blue-200" />
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
              <DataTable :value="isLoadingComponent ? skeletons : componentDetailsFull" scrollable scrollHeight="700px"
                stripedRows class="modern-table" tableStyle="min-width: 70rem" @row-click="onRowClick"
                selectionMode="single">

                <template #footer>
                  <div class="flex justify-start">
                    <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" @click="openNew"
                      :disabled="false" />
                  </div>
                </template>

                <Column header="#" style="width: 50px; text-align: center; height: 60px">
                  <template #body="{ index }">
                    <Skeleton v-if="isLoadingComponent" width="60%" height="1rem" class="mx-auto" />
                    <span v-else>{{ index + 1 }}</span>
                  </template>
                </Column>

                <Column field="materialName" header="Tên thành phần" class="font-medium"
                  style="min-width: 180px; height: 60px">
                  <template #body="{ data }">
                    <Skeleton v-if="isLoadingComponent" width="80%" height="1rem" />
                    <span v-else>{{ data.materialName }}</span>
                  </template>
                </Column>

                <Column header="TL Yêu cầu (Kg)" style="min-width: 150px; height: 60px">
                  <template #body="{ data, index }">
                    <Skeleton v-if="isLoadingComponent" width="50%" height="1rem" />
                    <span v-else>{{ index === 0 ? headerInfo.totalWeight : data.requiredWeight }}</span>
                  </template>
                </Column>

                <Column header="TL Thực tế (Kg)" style="min-width: 150px; height: 60px">
                  <template #body="{ data }">
                    <Skeleton v-if="isLoadingComponent" width="60%" height="1rem" />
                    <span v-else
                      :class="data.actualWeight ? 'bg-blue-50 text-blue-700 px-2 py-1 border-round-md font-medium text-sm' : ''">
                      {{ data.actualWeight || '' }}
                    </span>
                  </template>
                </Column>

                <Column header="Người thao tác" style="min-width: 150px; height: 60px">
                  <template #body="{ data }">
                    <Skeleton v-if="isLoadingComponent" width="60%" height="1rem" />
                    <span v-else>{{ data.operator }}</span>
                  </template>
                </Column>

                <Column header="Thời gian cân" style="min-width: 180px; height: 60px">
                  <template #body="{ data }">
                    <Skeleton v-if="isLoadingComponent" width="90%" height="1rem" />
                    <span v-else class="text-500">{{ data.weighingTime }}</span>
                  </template>
                </Column>

                <template #paginatorend></template>
              </DataTable>
            </div>

            <!-- MODAL THÊM THÀNH PHẦN -->
            <Dialog v-model:visible="productDialog" :style="{ width: '450px' }" header="Thêm thành phần" :modal="true"
              class="p-fluid">
              <!-- Dùng flex-column để các trường xếp dọc đều nhau -->
              <div class="flex flex-column gap-4 pt-3">

                <div class="flex flex-column gap-2">
                  <label for="name" class="font-bold text-900">Tên thành phần</label>
                  <Select id="name" v-model="product.name" :options="materialsList" optionLabel="materialName"
                    optionValue="materialName" placeholder="Chọn thành phần" class="w-full"
                    :invalid="submitted && !product.name" :loading="isLoadingMaterials" @show="fetchMaterials"
                    showClear />
                  <small v-if="submitted && !product.name" class="text-red-500">
                    Tên thành phần là bắt buộc.
                  </small>
                </div>

                <div class="flex flex-column gap-2">
                  <label for="percentage" class="font-bold text-900">Phần trăm (%)</label>
                  <InputNumber id="percentage" v-model="product.percentage" suffix=" %"
                    :invalid="submitted && product.percentage === null" class="w-full" />
                  <small v-if="submitted && product.percentage === null" class="text-red-500">
                    Vui lòng nhập phần trăm.
                  </small>
                </div>

              </div>

              <template #footer>
                <Button label="Hủy" icon="pi pi-times" text severity="secondary" @click="hideDialog" />
                <Button label="Lưu" icon="pi pi-check" @click="saveProduct" />
              </template>
            </Dialog>

          </div>
        </div>
        <div class="h-3rem flex-shrink-0"></div>
      </div>
      <BackToTop slot="fixed" :showScrollButton="showScrollButton" @scrollToTop="scrollToTop" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonTitle, onIonViewDidEnter
} from '@ionic/vue';
import { useRoute } from 'vue-router';
import BackToTop from '@/components/BackToTop.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import ElectronicScale from '@/components/ElectronicScale.vue';
import workOrder from '@/api/workOrder';
import format from '@/mixins/format';
import { useAuthStore } from '@/store/auth';
import materialApi from '@/api/material';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const authStore = useAuthStore();
const route = useRoute();
const materialsList = ref<any[]>([]);
const isLoadingMaterials = ref(false);
const table2Ref = ref<HTMLDivElement | null>(null);

onIonViewDidEnter(async () => {
  // nextTick đảm bảo rằng DOM đã được render hoàn toàn trước khi thao tác
  await nextTick();

  if (table2Ref.value) {
    // 3. Cuộn mượt mà đến bảng 2
    table2Ref.value.scrollIntoView({
      behavior: 'smooth', // Cuộn mượt (không bị giật cục)
      block: 'start'      // Cuộn sao cho mép trên của bảng nằm ở mép trên màn hình
    });
  }
});

// --- INTERFACES ---
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

// --- REFS & STATE ---
const headerInfo = ref({ orderNo: '', glue: '', totalWeight: '' });
const mixingProcess = ref({ component: '', weight: '' });

// Component Đang Chọn Từ Bảng Để Truyền Qua Cân Điện Tử
const activeComponent = ref<ComponentDetail | null>(null);

const lineDetails = ref<LineDetail[]>([]);
const componentDetailsFull = ref<ComponentDetail[]>([]);

const isLoadingLine = ref(true);
const isLoadingComponent = ref(true);

const skeletons = ref(new Array(5).fill({}));

// Dialog States
const productDialog = ref(false);
const product = ref<{ name?: string, percentage?: number | null }>({});
const submitted = ref(false);

// --- FUNCTIONS & LOGIC ---
const onRowClick = (event: { data: ComponentDetail }) => {
  if (!isLoadingComponent.value && event.data && event.data.materialName) {
    mixingProcess.value.component = event.data.materialName;

    // Tìm index của row được click để gán đúng Target Weight
    const rowIndex = componentDetailsFull.value.findIndex(item => item === event.data);
    activeComponent.value = { ...event.data }; // Cập nhật Component đang tương tác

    // Nếu là dòng đầu tiên, Target weight = headerInfo.totalWeight
    if (rowIndex === 0) {
      activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
    }
  }
};

const handleWeightChange = (newWeight: string) => {
  console.log("Trọng lượng cân đang là:", newWeight);
  mixingProcess.value.weight = newWeight;
};

// Hàm xử lý khi con báo xác nhận thành công
const handleConfirmWeight = (actualWeight: number) => {
  if (activeComponent.value) {
    // Tìm vị trí của thành phần đang cân trong mảng data của bảng
    const index = componentDetailsFull.value.findIndex(
      item => item.materialName === activeComponent.value?.materialName
    );

    if (index !== -1) {
      // ========================================================
      // 1. CHỈ ÁP DỤNG CHO DÒNG ĐANG ĐƯỢC CHỌN ĐỂ CÂN (DÒNG HIỆN TẠI)
      // Cập nhật TL Thực tế, Người thao tác và Thời gian cân
      // ========================================================
      componentDetailsFull.value[index].actualWeight = actualWeight;
      componentDetailsFull.value[index].operator = authStore.user?.employeeName || 'Chưa xác định';
      componentDetailsFull.value[index].weighingTime = format.formatDate(new Date().toISOString());

      // 2. CHỈ TÍNH TOÁN LẠI "TL YÊU CẦU" CHO CÁC DÒNG CÒN LẠI
      const baseItem = componentDetailsFull.value[0];
      const baseActualWeight = Number(baseItem.actualWeight || 0);
      const baseMixingRatio = Number(baseItem.mixingRatio || 100);

      // Nếu dòng 1 đã có TL Thực tế (đã cân dòng 1)
      if (baseActualWeight > 0) {
        componentDetailsFull.value.forEach((item, i) => {
          // Bỏ qua dòng đầu tiên
          if (i !== 0) {
            const currentRatio = Number(item.mixingRatio || 0);
            const newRequiredWeight = (currentRatio * baseActualWeight) / baseMixingRatio;

            // CHỈ cập nhật con số Yêu cầu, giữ nguyên trạng thái trống của Người thao tác/Thời gian
            item.requiredWeight = Number(newRequiredWeight.toFixed(3)) || '';
          }
        });
      }

      // Cập nhật lại activeComponent để đồng bộ
      activeComponent.value = { ...componentDetailsFull.value[index] };
    }
  }
};

const handleConnectionStatus = (status: boolean) => {
  if (status) {
    console.log("Cân đã kết nối!");
  } else {
    console.log("Mất kết nối với cân!");
  }
};

const fetchWorkOrderDetail = async (id: string | number) => {
  isLoadingLine.value = true;
  isLoadingComponent.value = true;

  try {
    const response = await workOrder.getWorkOrder(id);

    if (response.data && response.data.success) {
      const data = response.data.data;

      headerInfo.value = {
        orderNo: data.workOrderMasterName || '',
        glue: data.chemicalMasterName || '',
        totalWeight: data.workOrderWeight ? data.workOrderWeight.toString() : ''
      };

      lineDetails.value = data.orderDetails || [];

      // Mapping data chemicals kèm các default props nếu không có
      componentDetailsFull.value = (data.chemicals || []).map((item: any) => ({
        ...item,
        requiredWeight: item.requiredWeight || item.netWeight || '',
        actualWeight: item.actualWeight || '',
        lowerTolerance: item.lowerTolerance || 0,
        upperTolerance: item.upperTolerance || 0,
        mixingRatio: item.mixingRatio || 100
      }));

      // Khi tải xong, Gán mặc định dòng đầu tiên vào Electronic Scale
      if (componentDetailsFull.value.length > 0) {
        componentDetailsFull.value[0].requiredWeight = Number(headerInfo.value.totalWeight);

        const firstItem = componentDetailsFull.value[0];
        mixingProcess.value.component = firstItem.materialName || '';
        activeComponent.value = { ...firstItem };
      }
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu chi tiết:', error);
  } finally {
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
  }
};

// Mở Modal
const openNew = () => {
  product.value = { name: '', percentage: null };
  submitted.value = false;
  productDialog.value = true;
};

// Ẩn Modal
const hideDialog = () => {
  productDialog.value = false;
  submitted.value = false;
};

// Lưu thông tin từ Modal
const saveProduct = () => {
  submitted.value = true;

  if (product.value.name?.trim() && product.value.percentage != null) {
    // 1. Lấy dòng đầu tiên
    const firstItem = componentDetailsFull.value[0];

    // 2. Lấy TL thực tế và mixingRatio của dòng đầu tiên
    const baseActualWeight = Number(firstItem?.actualWeight || 0);
    const baseMixingRatio = Number(firstItem?.mixingRatio || 100); // Đề phòng lỗi chia 0 thì set mặc định 100

    // 3. Tính toán theo công thức mới: (Phần trăm * TL thực tế) / mixingRatio
    const calculatedRequiredWeight = (product.value.percentage * baseActualWeight) / baseMixingRatio;

    componentDetailsFull.value.push({
      materialName: product.value.name,
      requiredWeight: Number(calculatedRequiredWeight.toFixed(3)) || '',
      actualWeight: 0,
      operator: '',
      weighingTime: '',
      lowerTolerance: 5,
      upperTolerance: 5,
      mixingRatio: product.value.percentage
    });

    productDialog.value = false;
    product.value = {};
    submitted.value = false;
  }
};

const fetchMaterials = async () => {
  isLoadingMaterials.value = true;
  try {
    const payload = {
      factoryId: authStore.user?.factoryId || ''
    };

    const response = await materialApi.postMaterial(payload);

    if (response.data && response.data.success) {
      materialsList.value = response.data.data || [];
    }
  } catch (error) {
    console.error("Lỗi khi tải danh sách thành phần:", error);
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách thành phần', life: 3000 });
  } finally {
    isLoadingMaterials.value = false;
  }
};

// --- SCROLL TO TOP LOGIC ---
const contentRef = ref<any>(null);
const showScrollButton = ref(false);

const handleScroll = (event: CustomEvent) => {
  showScrollButton.value = event.detail.scrollTop > 100;
};

const scrollToTop = () => {
  contentRef.value?.$el?.scrollToTop(500);
};

// --- LIFECYCLE ---
onMounted(() => {
  const workOrderMasterId = route.query.workOrderMasterId as string;
  if (workOrderMasterId) {
    fetchWorkOrderDetail(workOrderMasterId);
  } else {
    console.error("Không tìm thấy mã Đơn điều công (workOrderMasterId) trên URL!");
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
  }
});
</script>

<style scoped></style>