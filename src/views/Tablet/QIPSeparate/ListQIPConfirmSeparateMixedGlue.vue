<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>Danh sách chiết keo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" :scroll-events="true">
      <div class="main-container max-w-full mx-auto">

        <!-- THÊM content-id VÀO BUTTON -->
        <ion-segment v-model="selectedTab" mode="ios" @ionChange="onTabChange">
          <ion-segment-button value="table1" content-id="table1">
            <ion-label class="font-bold">KEO CHIẾT</ion-label>
          </ion-segment-button>
          <ion-segment-button value="table2" content-id="table2">
            <ion-label class="font-bold">KEO KHÔNG CHIẾT</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- SỬ DỤNG ION-SEGMENT-VIEW VÀ CONTENT -->
        <ion-segment-view>
          <ion-segment-content id="table1">
            <MixedGlueTable :items="mixedGlueList" :totalRecords="mixedTotal" :isLoading="isLoadingMixed"
              :rowsPerPage="mixedRowsPerPage" v-model:selectedItem="selectedMixedItem" @page="onPageMixed"
              @row-click="onRowClickMixed" />
          </ion-segment-content>

          <ion-segment-content id="table2">
            <NoMixGlueTable :items="noMixGlueList" :totalRecords="noMixTotal" :isLoading="isLoadingNoMix"
              :rowsPerPage="noMixRowsPerPage" v-model:selectedItem="selectedNoMixItem" @page="onPageNoMix"
              @row-click="onRowClickNoMix" />
          </ion-segment-content>
        </ion-segment-view>

        <div class="h-3rem flex-shrink-0"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  IonSegment, IonSegmentButton, IonLabel, onIonViewWillEnter, IonSegmentView, IonSegmentContent
} from '@ionic/vue';
import { ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';
import separateGlue from '@/api/separate';
import MixedGlueTable from '@/views/Tablet/QIPSeparate/components/MixedGlueTable.vue';
import NoMixGlueTable from '@/views/Tablet/QIPSeparate/components/NoMixGlueTable.vue';

const router = useRouter();
const authStore = useAuthStore();

const selectedTab = ref('table1');
const goBack = () => router.push('/app-menu');

// --- STATE BẢNG 1 ---
const isLoadingMixed = ref(false);
const mixedGlueList = ref<any[]>([]);
const mixedTotal = ref(0);
const mixedCurrentPage = ref(1);
const mixedRowsPerPage = ref(5);
const selectedMixedItem = ref<any>(null);

// --- STATE BẢNG 2 ---
const isLoadingNoMix = ref(false);
const noMixGlueList = ref<any[]>([]);
const noMixTotal = ref(0);
const noMixCurrentPage = ref(1);
const noMixRowsPerPage = ref(5);
const selectedNoMixItem = ref<any>(null);

// SỬA HÀM 1: Bảng Keo Trộn
const fetchMixedGlue = async (page: number, pageSize: number) => {
  isLoadingMixed.value = true;
  mixedGlueList.value = Array.from({ length: pageSize }).map((_, index) => ({
    separateGlueId: `skeleton-mix-${index}`
  }));

  try {
    const payload = { factoryId: authStore.user?.factoryId || "01", qipconfirmComplete: false, page, pageSize };
    const response = await separateGlue.postSGQueryResult(payload);
    const resData = response.data as any;

    if (resData?.success) {
      // THÊM || [] VÀO ĐÂY ĐỂ CHỐNG CRASH
      mixedGlueList.value = resData.data.items || [];
      mixedTotal.value = Number(resData.data.totalCount) || 0;
    } else {
      mixedGlueList.value = [];
      mixedTotal.value = 0; // Đảm bảo total cũng về 0
    }
  } catch (error) {
    mixedGlueList.value = [];
    mixedTotal.value = 0;
  } finally {
    isLoadingMixed.value = false;
  }
};

// SỬA HÀM 2: Bảng Keo Không Trộn (Tương tự)
const fetchNoMixGlue = async (page: number, pageSize: number) => {
  isLoadingNoMix.value = true;
  noMixGlueList.value = Array.from({ length: pageSize }).map((_, index) => ({
    noSeparateGlueId: `skeleton-nomix-${index}`
  }));

  try {
    const payload = { factoryId: authStore.user?.factoryId || "01", qipconfirmComplete: false, page, pageSize };
    const response = await separateGlue.postNSGQueryResult(payload);
    const resData = response.data as any;

    if (resData?.success) {
      // THÊM || [] VÀO ĐÂY ĐỂ CHỐNG CRASH
      noMixGlueList.value = resData.data.items || [];
      noMixTotal.value = Number(resData.data.totalCount) || 0;
    } else {
      noMixGlueList.value = [];
      noMixTotal.value = 0;
    }
  } catch (error) {
    noMixGlueList.value = [];
    noMixTotal.value = 0;
  } finally {
    isLoadingNoMix.value = false;
  }
};

// Tab thay đổi => gọi API tương ứng nếu chưa có data
const onTabChange = (event: CustomEvent) => {
  const tab = event.detail.value;

  if (tab === 'table1') {
    // Reset page về 1 (tuỳ chọn) và gọi lại API bảng 1
    mixedCurrentPage.value = 1;
    fetchMixedGlue(mixedCurrentPage.value, mixedRowsPerPage.value);
  } else if (tab === 'table2') {
    // Reset page về 1 (tuỳ chọn) và gọi lại API bảng 2
    noMixCurrentPage.value = 1;
    fetchNoMixGlue(noMixCurrentPage.value, noMixRowsPerPage.value);
  }
};

// Phân trang
const onPageMixed = (event: any) => {
  mixedCurrentPage.value = event.page + 1;
  mixedRowsPerPage.value = event.rows;
  fetchMixedGlue(mixedCurrentPage.value, mixedRowsPerPage.value);
};
const onPageNoMix = (event: any) => {
  noMixCurrentPage.value = event.page + 1;
  noMixRowsPerPage.value = event.rows;
  fetchNoMixGlue(noMixCurrentPage.value, noMixRowsPerPage.value);
};

// Xử lý click cho bảng Keo Trộn (Table 1)
const onRowClickMixed = (event: { data: any }) => {
  const separateGlueId = event.data.separateGlueId;
  const requestDetailId = event.data.requestDetailId;

  if (separateGlueId && requestDetailId) {
    router.push({
      path: '/qip-confirm-separate-mixed-glue',
      query: {
        separateGlueId: separateGlueId,
        requestDetailId: requestDetailId,
        type: 'mixed'
      }
    });
  } else {
    console.warn('separateGlueId & requestDetailId is missing in the clicked row data');
  }
};

// Xử lý click cho bảng Keo Không Trộn (Table 2)
const onRowClickNoMix = (event: { data: any }) => {
  const noSeparateGlueId = event.data.noSeparateGlueId;
  const workOrderMasterId = event.data.workOrderMasterId;

  if (workOrderMasterId && noSeparateGlueId) {
    router.push({
      path: '/qip-confirm-separate-mixed-glue',
      query: {
        noSeparateGlueId: noSeparateGlueId,
        workOrderMasterId: workOrderMasterId,
        type: 'nomix'
      }
    });
  } else {
    console.warn('workOrderMasterId & noSeparateGlueId is missing in the clicked row data');
  }
};

// Tự động gọi API của Tab mặc định khi mở màn hình
onIonViewWillEnter(() => {
  selectedTab.value = 'table1'; // Đảm bảo segment đang focus đúng tab 1
  fetchMixedGlue(mixedCurrentPage.value, mixedRowsPerPage.value);
});
</script>

<style scoped>
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
}

ion-segment-button {
  width: auto;
}

ion-label {
  line-height: normal !important;
}
</style>