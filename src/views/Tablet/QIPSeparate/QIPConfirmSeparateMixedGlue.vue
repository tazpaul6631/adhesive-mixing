<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>
          {{ isMixedMode ? 'QIP Confirm Separate Mixed Glue' : 'QIP Confirm Separate No Mix Glue' }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding bg-gray-50">
      <div class="main-container max-w-full mx-auto">
        <div class="flex flex-wrap align-items-center justify-content-between surface-border">
          <user-avatar />
          <ConnectBluetooth ref="bluetoothRef" templateType="separate" :printData="selectedItem"
            @printSuccess="handlePrintSuccess" />
        </div>

        <div class="surface-card p-0 shadow-1 border-round-xl mt-4">
          <div class="surface-100 p-3 border-round-top-xl bg-white">
            <span class="font-bold text-900 text-xl">
              <i class="pi pi-list mr-2"></i>
              Danh sách chờ xác nhận việc chiết thùng
              <span class="text-primary">({{ isMixedMode ? 'KEO CHIẾT' : 'KEO KHÔNG CHIẾT' }})</span>
            </span>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl" :key="isMixedMode ? 'mixed' : 'nomix'">

            <!-- BẢNG DÀNH CHO KEO TRỘN -->
            <DataTable v-if="isMixedMode" :value="lineDetails" stripedRows class="custom-bordered-table auto-columns-table"
              tableStyle="width: 100%;" scrollable scrollHeight="500px" dataKey="separateGlueId"
              selectionMode="single" v-model:selection="selectedTableRow" @row-click="onMixedRowClick">
              <template #empty>
                <div style="text-align: center; padding: 3.3rem; height: 400px; align-content: center;">
                  <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                  <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
                </div>
              </template>

              <!-- Các cột thực tế cho Keo Trộn -->
              <Column field="workOrderMasterName" header="Đơn điều công" headerClass="dt-col-primary"
                bodyClass="dt-col-primary">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else class="font-bold">{{ data.workOrderMasterName }}</span>
                </template>
              </Column>
              <Column field="productLineName" header="Chuyền" headerClass="dt-col-text" bodyClass="dt-col-text">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.productLineName }}</span>
                </template>
              </Column>
              <Column field="bucketName" header="Bình chứa" headerClass="dt-col-text" bodyClass="dt-col-text">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.bucketName }}</span>
                </template>
              </Column>
              <Column header="Dung lượng" headerClass="dt-col-weight" bodyClass="dt-col-weight">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.capacity }} {{ data.capacityUnit }}</span>
                </template>
              </Column>
            </DataTable>

            <!-- BẢNG DÀNH CHO KEO KHÔNG TRỘN -->
            <DataTable v-else :value="lineDetails" stripedRows class="custom-bordered-table auto-columns-table"
              tableStyle="width: 100%;" scrollable scrollHeight="700px" dataKey="noSeparateGlueId"
              selectionMode="single" v-model:selection="selectedTableRow" @row-click="onNoMixRowClick">
              <template #empty>
                <div style="text-align: center; padding: 3.3rem; height: 400px; align-content: center;">
                  <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                  <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
                </div>
              </template>

              <!-- Các cột thực tế cho Keo Không Trộn -->
              <Column field="workOrderMasterName" header="Đơn điều công" headerClass="dt-col-primary"
                bodyClass="dt-col-primary">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else class="font-bold">{{ data.workOrderMasterName }}</span>
                </template>
              </Column>
              <Column field="productLineName" header="Chuyền" headerClass="dt-col-text" bodyClass="dt-col-text">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.productLineName }}</span>
                </template>
              </Column>
              <Column field="glueName" header="Tên Keo" headerClass="dt-col-primary" bodyClass="dt-col-primary">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.glueName }}</span>
                </template>
              </Column>
              <Column header="Trọng lượng" headerClass="dt-col-weight" bodyClass="dt-col-weight">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.glueWeight }} {{ data.glueWeightUnit }}</span>
                </template>
              </Column>
            </DataTable>

          </div>
        </div>
        <div class="h-3rem flex-shrink-0"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import ConnectBluetooth from '@/components/ConnectBluetooth.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, onIonViewWillEnter, onIonViewDidEnter, onIonViewDidLeave
} from '@ionic/vue';
import { ref, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import separateGlue from '@/api/separate';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isLoadingLine = ref(true);
const selectedItem = ref<any>(null);
const selectedTableRow = ref<any>(null);
const lineDetails = ref<any[]>([]);
const bluetoothRef = ref<any>(null);

const isMixedMode = computed(() => {
  return route.query.type === 'mixed';
});

const handlePrintSuccess = () => {
  router.back();
};

// --- FETCH & STATE LOGIC ---
const resetState = () => {
  lineDetails.value = [];
  selectedItem.value = null;
  selectedTableRow.value = null;
  isLoadingLine.value = true;
};

// --- GỌI API KEO TRỘN ---
const fetchMixedGlueDetail = async (factoryId: string, sgId: string) => {
  try {
    const { data } = await separateGlue.getSGQueryResult(factoryId, sgId);

    if (data && data.success) {
      const detail = data.data
        ? { ...data.data, separateGlueId: data.data.separateGlueId ?? sgId }
        : null;
      lineDetails.value = detail ? [detail] : [];
      selectedTableRow.value = detail;
      selectedItem.value = {
        factoryId,
        separateGlueId: sgId,
        ...detail,
      };
    } else {
      lineDetails.value = [];
      selectedTableRow.value = null;
      console.error('API Error (Mixed):', data?.message);
    }
  } catch (error) {
    lineDetails.value = [];
    selectedTableRow.value = null;
    console.error('Fetch Mixed Glue Detail Error:', error);
  }
};

// --- GỌI API KEO KHÔNG TRỘN ---
const fetchNoMixGlueDetail = async (factoryId: string, nsgId: string) => {
  try {
    const { data } = await separateGlue.getNSGQueryResult(factoryId, nsgId);

    if (data && data.success) {
      const detail = data.data
        ? { ...data.data, noSeparateGlueId: data.data.noSeparateGlueId ?? nsgId }
        : null;
      lineDetails.value = detail ? [detail] : [];
      selectedTableRow.value = detail;
      selectedItem.value = {
        factoryId,
        noSeparateGlueId: nsgId,
        ...detail,
      };
    } else {
      lineDetails.value = [];
      selectedTableRow.value = null;
      console.error('API Error (NoMix):', data?.message);
    }
  } catch (error) {
    lineDetails.value = [];
    selectedTableRow.value = null;
    console.error('Fetch NoMix Glue Detail Error:', error);
  }
};

const loadDetailFromRoute = async () => {
  resetState();

  const factoryId = authStore.user?.factoryId || '01';
  const type = route.query.type as string;

  if (type === 'mixed') {
    const separateGlueId = route.query.separateGlueId as string;
    if (separateGlueId) {
      await fetchMixedGlueDetail(factoryId, separateGlueId);
    }
  } else if (type === 'nomix') {
    const noSeparateGlueId = route.query.noSeparateGlueId as string;
    if (noSeparateGlueId) {
      await fetchNoMixGlueDetail(factoryId, noSeparateGlueId);
    }
  }

  isLoadingLine.value = false;
};

const onMixedRowClick = async (event: { data: any }) => {
  const separateGlueId = event.data?.separateGlueId;
  if (!separateGlueId) return;

  isLoadingLine.value = true;
  const factoryId = authStore.user?.factoryId || '01';
  await fetchMixedGlueDetail(factoryId, String(separateGlueId));
  isLoadingLine.value = false;
};

const onNoMixRowClick = async (event: { data: any }) => {
  const noSeparateGlueId = event.data?.noSeparateGlueId;
  if (!noSeparateGlueId) return;

  isLoadingLine.value = true;
  const factoryId = authStore.user?.factoryId || '01';
  await fetchNoMixGlueDetail(factoryId, String(noSeparateGlueId));
  isLoadingLine.value = false;
};

// --- LIFECYCLE ---
onIonViewWillEnter(async () => {
  await loadDetailFromRoute();
});

onIonViewDidEnter(async () => {
  await nextTick();
  await nextTick();
  bluetoothRef.value?.initBluetooth?.();
});

onIonViewDidLeave(() => {
  bluetoothRef.value?.pauseBluetooth?.();
});

const goBack = () => router.back(); 
</script>