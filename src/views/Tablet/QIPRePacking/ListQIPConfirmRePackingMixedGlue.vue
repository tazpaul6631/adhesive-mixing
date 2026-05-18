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

    <ion-content ref="contentRef" class="ion-padding" :scroll-events="true" @ionScroll="handleScroll">
      <div class="main-container max-w-full mx-auto">
        <ion-segment v-model="selectedTab" mode="ios" @ionChange="onTabChange">
          <ion-segment-button value="table1">
            <ion-label class="font-bold">KEO CHIẾT</ion-label>
          </ion-segment-button>
          <ion-segment-button value="table2">
            <ion-label class="font-bold">KEO KHÔNG CHIẾT</ion-label>
          </ion-segment-button>
        </ion-segment>

        <div class="block w-full" :key="selectedTab">
          <MixedGlueTable v-if="selectedTab === 'table1'" :items="mixedGlueList" :totalRecords="mixedTotal"
            :isLoading="isLoadingMixed" :rowsPerPage="mixedRowsPerPage" v-model:selectedItem="selectedMixedItem"
            @page="onPageMixed" @row-click="onRowClickMixed" />

          <NoMixGlueTable v-if="selectedTab === 'table2'" :items="noMixGlueList" :totalRecords="noMixTotal"
            :isLoading="isLoadingNoMix" :rowsPerPage="noMixRowsPerPage" v-model:selectedItem="selectedNoMixItem"
            @page="onPageNoMix" @row-click="onRowClickNoMix" />
        </div>
        <div class="h-3rem flex-shrink-0"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  IonSegment, IonSegmentButton, IonLabel, onIonViewWillEnter
} from '@ionic/vue';
import { ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';
import rePackingGlue from '@/api/separate';
import MixedGlueTable from '@/views/Tablet/QIPRePacking/components/MixedGlueTable.vue';
import NoMixGlueTable from '@/views/Tablet/QIPRePacking/components/NoMixGlueTable.vue';

const router = useRouter();
const authStore = useAuthStore();

const showScrollButton = ref(false);
const selectedTab = ref('table1');

const handleScroll = (event: CustomEvent) => {
  showScrollButton.value = event.detail.scrollTop > 100;
};
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

// Fetch Bảng 1
const fetchMixedGlue = async (page: number, pageSize: number) => {
  isLoadingMixed.value = true;
  mixedGlueList.value = Array.from({ length: pageSize }).map(() => ({}));

  try {
    const payload = {
      factoryId: authStore.user?.factoryId || "01",
      qipconfirmComplete: false,
      page,
      pageSize
    };
    const response = await rePackingGlue.postRPGQueryResult(payload);
    const resData = response.data as any;

    if (resData?.success) {
      mixedGlueList.value = resData.data.items;
      mixedTotal.value = Number(resData.data.totalCount) || 0;
    } else {
      mixedGlueList.value = [];
    }
  } catch (error) {
    mixedGlueList.value = [];
  } finally {
    isLoadingMixed.value = false;
  }
};

// Fetch Bảng 2
const fetchNoMixGlue = async (page: number, pageSize: number) => {
  isLoadingNoMix.value = true;
  noMixGlueList.value = Array.from({ length: pageSize }).map(() => ({}));

  try {
    const payload = {
      factoryId: authStore.user?.factoryId || "01",
      qipconfirmComplete: false,
      page,
      pageSize
    };
    const response = await rePackingGlue.postNRPGQueryResult(payload);
    const resData = response.data as any;

    if (resData?.success) {
      noMixGlueList.value = resData.data.items;
      noMixTotal.value = Number(resData.data.totalCount) || 0;
    } else {
      noMixGlueList.value = [];
    }
  } catch (error) {
    noMixGlueList.value = [];
  } finally {
    isLoadingNoMix.value = false;
  }
};

// Tab thay đổi => gọi API tương ứng nếu chưa có data
const onTabChange = (event: CustomEvent) => {
  const tab = event.detail.value;
  if (tab === 'table1' && mixedGlueList.value.length === 0) {
    fetchMixedGlue(mixedCurrentPage.value, mixedRowsPerPage.value);
  } else if (tab === 'table2' && noMixGlueList.value.length === 0) {
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
  const rePackingGlueId = event.data.rePackingGlueId;
  const requestDetailId = event.data.requestDetailId;

  if (rePackingGlueId && requestDetailId) {
    router.push({
      path: '/qip-confirm-repacking-mixed-glue',
      query: {
        rePackingGlueId: rePackingGlueId,
        requestDetailId: requestDetailId,
        type: 'mixed'
      }
    });
  } else {
    console.warn('rePackingGlueId & requestDetailId is missing in the clicked row data');
  }
};

// Xử lý click cho bảng Keo Không Trộn (Table 2)
const onRowClickNoMix = (event: { data: any }) => {
  const noRePackingGlueId = event.data.noRePackingGlueId;
  const workOrderMasterId = event.data.workOrderMasterId;

  if (workOrderMasterId && noRePackingGlueId) {
    router.push({
      path: '/qip-confirm-repacking-mixed-glue',
      query: {
        noRePackingGlueId: noRePackingGlueId,
        workOrderMasterId: workOrderMasterId,
        type: 'nomix'
      }
    });
  } else {
    console.warn('workOrderMasterId & noRePackingGlueId is missing in the clicked row data');
  }
};

onIonViewWillEnter(() => {
  fetchMixedGlue(mixedCurrentPage.value, mixedRowsPerPage.value);
});
</script>

<style scoped>
ion-segment-view {
  height: 150px;
  width: auto;
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

ion-segment-content {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>