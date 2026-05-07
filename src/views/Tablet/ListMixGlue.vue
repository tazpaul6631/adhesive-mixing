<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/app-menu"></ion-back-button>
        </ion-buttons>
        <ion-title>List Mix Glue Management</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" class="ion-padding" :scroll-events="true" @ionScroll="handleScroll">
      <div class="main-container max-w-full mx-auto">

        <div class="surface-card p-3 shadow-1 border-round-xl">
          <div class="flex flex-wrap align-items-center justify-content-between">
            <user-avatar />
          </div>
        </div>

        <div class="surface-card p-0 shadow-1 mt-4 border-round-xl">
          <div class="surface-100 p-3 border-round-top-xl">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-list mr-2"></i>List Mix Glue
            </span>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <!-- Table được gắn tổng số record (totalRecords) từ API -->
            <DataTable :value="lineDetails" lazy :totalRecords="totalRecords" @page="onPageLine" scrollable
              scrollHeight="700px" stripedRows class="modern-table" tableStyle="min-width: 70rem"
              @row-click="onRowClick" :paginator="true" :rows="rowsPerPage" :rowsPerPageOptions="[5, 10, 20, 50]">

              <Column field="workOrderMasterName" header="Đơn điều công" style="min-width: 180px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.workOrderMasterName }}</span>
                </template>
              </Column>

              <Column field="chemicalMasterName" header="Keo" style="min-width: 100px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.chemicalMasterName }}</span>
                </template>
              </Column>

              <Column field="workOrderWeight" header="Tổng trọng lượng (kg)" style="min-width: 100px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.workOrderWeight }}</span>
                </template>
              </Column>

              <Column field="createrId" header="Người tạo" style="min-width: 150px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="70%" height="1rem" />
                  <span v-else>{{ data.createrId }}</span>
                </template>
              </Column>

              <Column field="createDate" header="Ngày tạo" style="min-width: 120px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <span v-else>{{ format.formatDate(data.createDate) }}</span>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>

        <div class="h-3rem flex-shrink-0"></div>
      </div>
      <BackToTop slot="fixed" :showScrollButton="showScrollButton" @scrollToTop="scrollToTop" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle
} from '@ionic/vue';
import { onMounted, ref } from 'vue';
import UserAvatar from '@/components/UserAvatar.vue';
import BackToTop from '@/components/BackToTop.vue';
import { useAuthStore } from '@/store/auth';
import format from '@/mixins/format';
import workOrder from '@/api/workOrder';
import { useRouter } from 'vue-router';

const router = useRouter();

// --- Khởi tạo Store ---
const authStore = useAuthStore();

// --- BackToTop logic ---
const contentRef = ref<any>(null);
const showScrollButton = ref(false);

const handleScroll = (event: CustomEvent) => {
  if (event.detail.scrollTop > 100) {
    showScrollButton.value = true;
  } else {
    showScrollButton.value = false;
  }
};

const scrollToTop = () => {
  contentRef.value?.$el?.scrollToTop(500);
};

// --- Khai báo Interface Data API ---
interface LineDetail {
  workOrderMasterName?: string;
  chemicalMasterName?: string;
  createrId?: string;
  createDate?: string;
  workOrderWeight?: number;
  [key: string]: any; // Chứa thêm các field khác từ API (vd: factoryId, workOrderMasterId...)
}

// --- Logic Call API & Phân Trang ---
const isLoadingLine = ref(true);
const lineDetails = ref<LineDetail[]>([]);
const totalRecords = ref(0);
const currentPage = ref(1);
const rowsPerPage = ref(20);

const onRowClick = (event: { data: LineDetail }) => {
  const workOrderMasterId = event.data.workOrderMasterId;
  if (workOrderMasterId) {
    // Chỉ chuyển trang và đẩy ID lên URL
    router.push({
      path: '/mix-glue-management',
      query: { workOrderMasterId: workOrderMasterId }
    });
  } else {
    console.warn('workOrderMasterId is missing in the clicked row data');
  }
};

// Hàm gọi API
const fetchWorkOrders = async (page: number, pageSize: number) => {
  isLoadingLine.value = true;

  // Dựng placeholder Skeleton cho mảng khi đang load
  lineDetails.value = Array.from({ length: pageSize }).map(() => ({}));

  try {
    const payload = {
      // Lấy factoryId từ store, nếu null thì gán mặc định để tránh lỗi API
      factoryId: authStore.user?.factoryId,
      isMixGlue: true,
      mixGlueComplete: false,
      page: page,
      pageSize: pageSize
    };

    const response = await workOrder.postWorkOrderList(payload);

    if (response.data && response.data.success) {
      // Đổ dữ liệu thật vào table
      lineDetails.value = response.data.data.items;
      totalRecords.value = response.data.data.totalCount;
    } else {
      console.error("Lấy dữ liệu thất bại", response.data?.message);
      lineDetails.value = [];
    }
  } catch (error) {
    console.error("Lỗi gọi API getWorkOrderList:", error);
    lineDetails.value = [];
  } finally {
    isLoadingLine.value = false;
  }
};

// Hàm xử lý sự kiện khi click chuyển trang trên PrimeVue DataTable
const onPageLine = (event: any) => {
  currentPage.value = event.page + 1;
  rowsPerPage.value = event.rows;

  fetchWorkOrders(currentPage.value, rowsPerPage.value);
};

onMounted(() => {
  // Khi load trang lần đầu, gọi API ở page 1
  fetchWorkOrders(currentPage.value, rowsPerPage.value);
});
</script>

<style scoped></style>