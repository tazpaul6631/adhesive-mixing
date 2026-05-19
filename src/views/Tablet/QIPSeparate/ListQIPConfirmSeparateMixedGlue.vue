<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>List QIP Confirm Separate Mixed Glue</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" :scroll-events="true">
      <div class="main-container max-w-full mx-auto">
        <div class="segment-tabs">
          <ion-segment v-model="selectedTab" mode="ios" scrollable @ionChange="onSegmentIonChange">
            <ion-segment-button value="table1">
              <ion-label class="font-bold">KEO CHIẾT</ion-label>
            </ion-segment-button>
            <ion-segment-button value="table2">
              <ion-label class="font-bold">KEO KHÔNG CHIẾT</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <div v-show="selectedTab === 'table1'" class="tab-panel">
          <MixedGlueTable :items="mixedGlueList" :totalRecords="mixedTotal" :isLoading="isLoadingMixed"
            :rowsPerPage="mixedRowsPerPage" v-model:selectedItem="selectedMixedItem" @page="onPageMixed"
            @row-click="onRowClickMixed" />
        </div>

        <div v-show="selectedTab === 'table2'" class="tab-panel">
          <NoMixGlueTable :items="noMixGlueList" :totalRecords="noMixTotal" :isLoading="isLoadingNoMix"
            :rowsPerPage="noMixRowsPerPage" v-model:selectedItem="selectedNoMixItem" @page="onPageNoMix"
            @row-click="onRowClickNoMix" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  IonSegment, IonSegmentButton, IonLabel, onIonViewWillEnter
} from '@ionic/vue';
import { ref, nextTick } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';
import separateGlue from '@/api/separate';
import MixedGlueTable from '@/views/Tablet/QIPSeparate/components/MixedGlueTable.vue';
import NoMixGlueTable from '@/views/Tablet/QIPSeparate/components/NoMixGlueTable.vue';

const router = useRouter();
const authStore = useAuthStore();
const selectedTab = ref<'table1' | 'table2'>('table1');
const goBack = () => router.push('/app-menu');
const isLoadingMixed = ref(false);
const mixedGlueList = ref<any[]>([]);
const mixedTotal = ref(0);
const mixedCurrentPage = ref(1);
const mixedRowsPerPage = ref(5);
const selectedMixedItem = ref<any>(null);
const isLoadingNoMix = ref(false);
const noMixGlueList = ref<any[]>([]);
const noMixTotal = ref(0);
const noMixCurrentPage = ref(1);
const noMixRowsPerPage = ref(5);
const selectedNoMixItem = ref<any>(null);

const parsePagedResponse = (resData: any) => {
  const pageData = resData?.data ?? resData ?? {};
  const items = Array.isArray(pageData.items) ? pageData.items : [];
  const totalCount = Number(pageData.totalCount) || 0;
  return { items, totalCount };
};

const pickDefaultTab = () => {
  if (mixedGlueList.value.length > 0 || mixedTotal.value > 0) {
    selectedTab.value = 'table1';
    return;
  }

  if (noMixGlueList.value.length > 0 || noMixTotal.value > 0) {
    selectedTab.value = 'table2';
    return;
  }
  selectedTab.value = 'table1';
};

const fetchMixedGlue = async (page: number, pageSize: number) => {
  isLoadingMixed.value = true;
  mixedGlueList.value = [];

  try {
    const payload = { factoryId: authStore.user?.factoryId || '01', qipconfirmComplete: false, page, pageSize };
    const response = await separateGlue.postSGQueryResult(payload);
    const resData = response.data as any;

    if (resData?.success) {
      const { items, totalCount } = parsePagedResponse(resData);
      mixedGlueList.value = items;
      mixedTotal.value = totalCount;
    } else {
      mixedGlueList.value = [];
      mixedTotal.value = 0;
    }
  } catch (error) {
    console.error('Lỗi fetch keo chiết:', error);
    mixedGlueList.value = [];
    mixedTotal.value = 0;
  } finally {
    isLoadingMixed.value = false;
  }
};

const fetchNoMixGlue = async (page: number, pageSize: number) => {
  isLoadingNoMix.value = true;
  noMixGlueList.value = [];

  try {
    const payload = { factoryId: authStore.user?.factoryId || '01', qipconfirmComplete: false, page, pageSize };
    const response = await separateGlue.postNSGQueryResult(payload);
    const resData = response.data as any;

    if (resData?.success) {
      const { items, totalCount } = parsePagedResponse(resData);
      noMixGlueList.value = items;
      noMixTotal.value = totalCount;
    } else {
      noMixGlueList.value = [];
      noMixTotal.value = 0;
    }
  } catch (error) {
    console.error('Lỗi fetch keo không chiết:', error);
    noMixGlueList.value = [];
    noMixTotal.value = 0;
  } finally {
    isLoadingNoMix.value = false;
  }
};

const onSegmentIonChange = (event: CustomEvent) => {
  const tab = (event.detail as { value?: 'table1' | 'table2' })?.value;
  if (!tab) return;

  selectedTab.value = tab;

  if (tab === 'table1') {
    fetchMixedGlue(mixedCurrentPage.value, mixedRowsPerPage.value);
    return;
  }
  fetchNoMixGlue(noMixCurrentPage.value, noMixRowsPerPage.value);
};

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

const onRowClickMixed = (event: { data: any }) => {
  const separateGlueId = event.data.separateGlueId;
  const requestDetailId = event.data.requestDetailId;

  if (separateGlueId && requestDetailId) {
    router.push({
      path: '/qip-confirm-separate-mixed-glue',
      query: {
        separateGlueId,
        requestDetailId,
        type: 'mixed'
      }
    });
  } else {
    console.warn('separateGlueId & requestDetailId is missing in the clicked row data');
  }
};

const onRowClickNoMix = (event: { data: any }) => {
  const noSeparateGlueId = event.data.noSeparateGlueId;
  const workOrderMasterId = event.data.workOrderMasterId;

  if (workOrderMasterId && noSeparateGlueId) {
    router.push({
      path: '/qip-confirm-separate-mixed-glue',
      query: {
        noSeparateGlueId,
        workOrderMasterId,
        type: 'nomix'
      }
    });
  } else {
    console.warn('workOrderMasterId & noSeparateGlueId is missing in the clicked row data');
  }
};

const loadInitialData = async () => {
  mixedCurrentPage.value = 1;
  noMixCurrentPage.value = 1;
  selectedMixedItem.value = null;
  selectedNoMixItem.value = null;

  await Promise.all([
    fetchMixedGlue(mixedCurrentPage.value, mixedRowsPerPage.value),
    fetchNoMixGlue(noMixCurrentPage.value, noMixRowsPerPage.value)
  ]);
  pickDefaultTab();
  await nextTick();
};

onIonViewWillEnter(() => {
  void loadInitialData();
});
</script>

<style scoped>
.segment-tabs {
  flex-shrink: 0;
  width: 100%;
  position: relative;
  z-index: 2;
}

.tab-panel {
  width: 100%;
  min-height: 500px;
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