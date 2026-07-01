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
          <ion-title class="no-padding">{{ t('listGlueReturnLog.pageTitle') }}</ion-title>
          <LocaleSelect device-scope="tablet" select-class="mr-4" />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding list-mix-glue-content" :scroll-events="true">
      <div class="main-container max-w-full mx-auto list-glue-return-page" :class="pageClass">
        <div class="surface-card p-0 shadow-1 border-round-xl list-glue-return-card">
          <div
            class="surface-100 border-round-top-xl flex align-items-center justify-content-between list-glue-return-card-head">
            <span class="list-glue-return-section-title">
              <i class="pi pi-list mr-2"></i>{{ t('listGlueReturnLog.sectionTitle') }}
            </span>
            <ScaleDevicePicker :session-id="glueReturnLogScaleSessionId" />
          </div>
          <div class="surface-100 list-glue-return-toolbar">
            <div class="grid formgrid align-items-end">
              <div class="col-12 sm:col-12 lg:col-6 sm:mt-2">
                <label class="text-800 font-medium mb-2 block">{{ t('listGlueReturnLog.selectedRow') }}</label>
                <InputText :model-value="selectedItem?.lineChemicalName || t('listGlueReturnLog.selectRowHint')"
                  readonly class="font-bold text-primary border-blue-200 glue-return-selected-input" fluid />
              </div>

              <div class="col-12 sm:col-12 lg:col-6 sm:mt-2">
                <ElectronicScaleGlueReturn :scale-session-id="glueReturnLogScaleSessionId" hide-scale-picker
                  :weight-unit="selectedItem?.returnWeightUnit || 'Kg'"
                  :locked-weight="showReturnWeight(selectedItem) ? String(selectedItem?.returnWeight ?? '') : ''"
                  :disable-confirm="!selectedItem || !!selectedItem?.scaleConfirmed || isRowApiSubmitted(selectedItem)"
                  @confirm-weight="handleScaleConfirmWeight" />
              </div>
            </div>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl list-glue-return-table-wrap">
            <DataTable v-model:selection="selectedItem" :value="lineDetails" lazy :totalRecords="totalRecords"
              :first="tableFirst" scrollable :scrollHeight="tableScrollHeight" stripedRows
              class="modern-table auto-columns-table" tableStyle="width: 100%; min-width: 0;" selectionMode="single"
              :paginator="true" :rows="rowsPerPage" dataKey="glueReturnLogId" @page="onPageLine" @row-click="onRowClick"
              paginatorTemplate="PrevPageLink CurrentPageReport NextPageLink"
              currentPageReportTemplate="Hiển thị {first} đến {last}">
              <template #empty>
                <div style="text-align: center; align-content: center;" :style="{ minHeight: emptyStateMinHeight }">
                  <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                  <p style="margin: 0; color: #6b7280;">{{ t('listGlueReturnLog.empty') }}</p>
                </div>
              </template>

              <Column field="seq" :header="t('listGlueReturnLog.columns.seq')" headerClass="dt-col-index"
                bodyClass="dt-col-index">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <span v-else>{{ data.seq }}</span>
                </template>
              </Column>

              <Column field="lineChemicalName" :header="t('listGlueReturnLog.columns.lineChemical')"
                headerClass="dt-col-primary" bodyClass="dt-col-primary">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else class="dt-cell-wrap">{{ data.lineChemicalName }}</span>
                </template>
              </Column>

              <Column field="returnWeight" :header="t('listGlueReturnLog.columns.returnWeight')"
                headerClass="dt-col-weight" bodyClass="dt-col-weight">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <div v-else class="flex align-items-center gap-2">
                    <!-- <InputText :model-value="data.returnWeight" readonly class="text-right font-bold bg-white"
                      style="width: 150px;" /> -->
                    <span class="font-bold">{{ data.returnWeight }} {{ data.returnWeightUnit || 'Kg' }}</span>
                  </div>
                </template>
              </Column>

              <Column field="updaterId" :header="t('listGlueReturnLog.columns.operator')" headerClass="dt-col-text"
                bodyClass="dt-col-text">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="70%" height="1rem" />
                  <span v-else>{{ isRowScaleConfirmed(data) ? data.updaterId : '' }}</span>
                </template>
              </Column>

              <Column field="weightTime" :header="t('listGlueReturnLog.columns.weighTime')"
                headerClass="dt-col-datetime" bodyClass="dt-col-datetime">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <span v-else>
                    <template v-if="isRowScaleConfirmed(data) && data.weightTime">
                      <i class="pi pi-clock text-xs mr-1"></i>
                      {{ format.formatDate(data.weightTime) }}
                    </template>
                  </span>
                </template>
              </Column>

              <Column :header="t('listGlueReturnLog.columns.confirm')" headerClass="dt-col-action"
                bodyClass="dt-col-action">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <div v-else class="flex justify-content-center">
                    <Button icon="pi pi-check-circle" severity="success" size="large" :disabled="!canSubmitRow(data)"
                      :loading="isConfirming && submittingRowId === data.glueReturnLogId"
                      @click="handleSubmitGlueReturnLog(data)" />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  onIonViewWillEnter,
  onIonViewWillLeave,
} from '@ionic/vue';
import { useAppToast } from '@/composables/useAppToast';
import dayjs from 'dayjs';
import { computeLazyTableTotalRecords, parseCursorPagedMeta, useListTableFetch } from '@/composables/useListTableFetch';
import { useAppLocale } from '@/composables/useAppLocale';
import { useAuthStore } from '@/store/auth';
import format from '@/mixins/format';
import glueReturnLogApi from '@/api/glueReturnLog';
import LocaleSelect from '@/components/LocaleSelect.vue';
import ElectronicScaleGlueReturn from '@/components/ElectronicScaleGlueReturn.vue';
import ScaleDevicePicker from '@/components/ScaleDevicePicker.vue';
import {
  useGlueReturnLogPendingStore,
  type GlueReturnLogPendingEntry,
} from '@/store/glueReturnLogPending';
import { useScaleManager } from '@/composables/useScaleManager';
import { useRequireOnline } from '@/composables/useRequireOnline';
import { useTabletPageLayout } from '@/composables/useTabletPageLayout';

const GLUE_RETURN_LOG_SCALE_SESSION = 'tablet-glue-return-log';
const glueReturnLogScaleSessionId = GLUE_RETURN_LOG_SCALE_SESSION;

export interface GlueReturnLogItem {
  factoryId: string;
  factoryName?: string;
  glueReturnLogId: string;
  returnGlueId: string;
  lineChemicalId?: string;
  lineChemicalName: string;
  seq: string;
  returnWeight?: string | number;
  returnWeightUnit?: string;
  updaterId?: string;
  updateDate?: string;
  weightTime?: string;
  scaleConfirmed?: boolean;
  apiConfirmed?: boolean;
}

const router = useRouter();
const { showToast } = useAppToast();
const { t } = useAppLocale(() => 'tablet');
const authStore = useAuthStore();
const pendingStore = useGlueReturnLogPendingStore();
const { startAutoConnect, stopAutoConnect } = useScaleManager();
const { requireOnline, notifyOfflineFromError } = useRequireOnline();

const {
  pageClass,
  tableScrollHeight,
  emptyStateMinHeight,
} = useTabletPageLayout({ listPageWithToolbar: true });

const lineDetails = ref<Partial<GlueReturnLogItem>[]>([]);
const totalRecords = ref(0);
const currentPage = ref(1);
const rowsPerPage = ref(50);
const tableFirst = computed(() => (currentPage.value - 1) * rowsPerPage.value);
const isLoadingLine = ref(true);
const isConfirming = ref(false);
const submittingRowId = ref('');
const selectedItem = ref<GlueReturnLogItem | null>(null);
const { startRequest, isStaleRequest, shouldSkipDuplicatePageLoad } = useListTableFetch();

const hasLoadedGlueReturnRows = () =>
  lineDetails.value.some((row) => row.glueReturnLogId != null && row.glueReturnLogId !== '');

const goBack = () => router.push('/app-menu');

const isRowScaleConfirmed = (row: Partial<GlueReturnLogItem> | null | undefined) =>
  !!row?.scaleConfirmed &&
  !!row?.returnWeight &&
  Number(row.returnWeight) > 0 &&
  !!row?.updaterId &&
  !!row?.weightTime;

const isRowApiSubmitted = (row: Partial<GlueReturnLogItem> | null | undefined) =>
  !!row?.apiConfirmed;

const showReturnWeight = (row: Partial<GlueReturnLogItem> | null | undefined) =>
  (!!row?.scaleConfirmed || !!row?.apiConfirmed) &&
  !!row?.returnWeight &&
  Number(row.returnWeight) > 0;

const canSubmitRow = (row: Partial<GlueReturnLogItem>) =>
  isRowScaleConfirmed(row) && !isRowApiSubmitted(row) && !isConfirming.value;

const buildReturnWeightFromScale = (actualWeightKg: string) => {
  const weightKg = Number(actualWeightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return null;
  }

  if (weightKg < 1) {
    return {
      returnWeight: Number((weightKg * 1000).toFixed(3)).toString(),
      returnWeightUnit: 'g',
    };
  }

  return {
    returnWeight: weightKg.toFixed(3),
    returnWeightUnit: 'Kg',
  };
};

const applyRowPatch = (glueReturnLogId: string, patch: Partial<GlueReturnLogItem>) => {
  lineDetails.value = lineDetails.value.map((item) =>
    String(item.glueReturnLogId) === String(glueReturnLogId)
      ? { ...item, ...patch }
      : item
  );

  if (String(selectedItem.value?.glueReturnLogId) === String(glueReturnLogId)) {
    selectedItem.value = {
      ...(selectedItem.value as GlueReturnLogItem),
      ...patch,
    };
  }
};

const mergePendingIntoItem = (item: GlueReturnLogItem): GlueReturnLogItem => {
  const normalized = normalizeGlueReturnLogItem(item);
  if (normalized.apiConfirmed) {
    return normalized;
  }

  const pending = pendingStore.getPending(String(item.glueReturnLogId));
  if (!pending) {
    return normalized;
  }

  return {
    ...normalized,
    ...pending,
    scaleConfirmed: true,
    apiConfirmed: false,
  };
};

const buildPendingEntry = (
  row: GlueReturnLogItem,
  patch: Pick<
    GlueReturnLogPendingEntry,
    'returnWeight' | 'returnWeightUnit' | 'updaterId' | 'weightTime'
  >
): GlueReturnLogPendingEntry => ({
  glueReturnLogId: String(row.glueReturnLogId),
  returnGlueId: row.returnGlueId,
  lineChemicalId: row.lineChemicalId,
  factoryId: row.factoryId || authStore.user?.factoryId || '',
  returnWeight: patch.returnWeight,
  returnWeightUnit: patch.returnWeightUnit,
  updaterId: patch.updaterId,
  weightTime: patch.weightTime,
  scaleConfirmed: true,
});

const normalizeGlueReturnLogItem = (item: GlueReturnLogItem): GlueReturnLogItem => {
  const weighed = !!item.returnWeight && Number(item.returnWeight) > 0;
  const hasOperator = !!item.updaterId;
  const hasTime = !!(item.weightTime || item.updateDate);
  const apiConfirmed = weighed && hasOperator && hasTime;

  return {
    ...item,
    updaterId: apiConfirmed ? (item.updaterId || '') : '',
    weightTime: apiConfirmed ? (item.weightTime || item.updateDate || '') : '',
    scaleConfirmed: apiConfirmed,
    apiConfirmed,
  };
};

const parseListResponse = (
  resData: any,
  fallbackPage: number,
  fallbackPageSize: number
): { items: GlueReturnLogItem[]; page: number; pageSize: number; hasNextPage: boolean } => {
  if (!resData?.success) {
    return { items: [], page: fallbackPage, pageSize: fallbackPageSize, hasNextPage: false };
  }

  const payload = resData.data;
  if (Array.isArray(payload)) {
    return {
      items: payload,
      page: fallbackPage,
      pageSize: fallbackPageSize,
      hasNextPage: false,
    };
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const meta = parseCursorPagedMeta(payload, fallbackPage, fallbackPageSize);
  return {
    items,
    page: meta.page,
    pageSize: meta.pageSize,
    hasNextPage: meta.hasNextPage,
  };
};

const syncSelectedItem = () => {
  if (!selectedItem.value?.glueReturnLogId) return;

  const matched = lineDetails.value.find(
    (item) => String(item.glueReturnLogId) === String(selectedItem.value?.glueReturnLogId)
  );
  selectedItem.value = matched ? { ...matched } as GlueReturnLogItem : null;
};

const fetchGlueReturnLogs = async (page: number, pageSize: number) => {
  const requestId = startRequest();
  isLoadingLine.value = true;
  lineDetails.value = Array.from({ length: pageSize }).map(() => ({}));

  try {
    const payload = {
      factoryId: authStore.user?.factoryId || '',
      departmentId: authStore.user?.departmentId,
      page,
      pageSize,
    };

    const [response] = await Promise.all([
      glueReturnLogApi.postListGlueReturnLog(payload),
      pendingStore.ensureHydrated(),
    ]);
    if (isStaleRequest(requestId)) return;

    const { items, page: responsePage, pageSize: responsePageSize, hasNextPage } = parseListResponse(
      response.data,
      page,
      pageSize
    );
    lineDetails.value = items.map(mergePendingIntoItem);
    items.forEach((item) => {
      const normalized = normalizeGlueReturnLogItem(item);
      if (normalized.apiConfirmed) {
        void pendingStore.clearPending(String(item.glueReturnLogId));
      }
    });
    currentPage.value = responsePage;
    rowsPerPage.value = responsePageSize;
    totalRecords.value = computeLazyTableTotalRecords(
      responsePage,
      responsePageSize,
      items.length,
      hasNextPage
    );
    syncSelectedItem();
  } catch (error) {
    if (isStaleRequest(requestId)) return;
    console.error('Lỗi gọi API getqueryresult gluereturnlog:', error);
    lineDetails.value = [];
    totalRecords.value = 0;
    selectedItem.value = null;
  } finally {
    if (!isStaleRequest(requestId)) {
      isLoadingLine.value = false;
    }
  }
};

const onPageLine = (event: { page: number; rows: number }) => {
  if (shouldSkipDuplicatePageLoad({
    eventPage: event.page,
    eventRows: event.rows,
    currentPage: currentPage.value,
    rowsPerPage: rowsPerPage.value,
    isLoading: isLoadingLine.value,
    hasData: hasLoadedGlueReturnRows(),
  })) {
    return;
  }

  currentPage.value = event.page + 1;
  rowsPerPage.value = event.rows;
  void fetchGlueReturnLogs(currentPage.value, rowsPerPage.value);
};

const onRowClick = (event: { data: GlueReturnLogItem }) => {
  selectedItem.value = { ...event.data };
};

const handleScaleConfirmWeight = (actualWeight: string) => {
  const row = selectedItem.value;
  if (!row?.glueReturnLogId) {
    showToast({
      severity: 'warn',
      summary: t('listGlueReturnLog.toast.warning'),
      detail: t('listGlueReturnLog.toast.selectRowFirst'),
      life: 6000,
    });
    return;
  }

  if (row.scaleConfirmed || isRowApiSubmitted(row)) {
    return;
  }

  const parsed = buildReturnWeightFromScale(actualWeight);
  if (!parsed) {
    return;
  }

  const updaterId = authStore.user?.employeeId || '';
  const weightTime = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');
  const patch = {
    returnWeight: parsed.returnWeight,
    returnWeightUnit: parsed.returnWeightUnit,
    updaterId,
    weightTime,
    scaleConfirmed: true as const,
    apiConfirmed: false,
  };

  applyRowPatch(row.glueReturnLogId, patch);
  void pendingStore.savePending(buildPendingEntry(row, patch));

  // showToast({
  //   severity: 'info',
  //   summary: t('listGlueReturnLog.toast.success'),
  //   detail: t('listGlueReturnLog.toast.scaleSaved'),
  //   life: 6000,
  // });
};

const handleSubmitGlueReturnLog = async (row: GlueReturnLogItem) => {
  if (!canSubmitRow(row)) {
    return;
  }

  if (!row.returnGlueId || !row.lineChemicalId) {
    showToast({
      severity: 'warn',
      summary: t('listGlueReturnLog.toast.warning'),
      detail: t('listGlueReturnLog.toast.missingConfirmIds'),
      life: 6000,
    });
    return;
  }

  if (!(await requireOnline())) return;

  isConfirming.value = true;
  submittingRowId.value = row.glueReturnLogId;

  try {
    const payload = {
      factoryId: row.factoryId || authStore.user?.factoryId || '',
      glueReturnLogId: row.glueReturnLogId,
      returnGlueId: row.returnGlueId,
      // lineChemicalId: row.lineChemicalId,
      returnWeight: Number(row.returnWeight),
      returnWeightUnit: row.returnWeightUnit || 'Kg',
      weightTime: row.weightTime,
      updaterId: row.updaterId || authStore.user?.employeeId || '',
    };

    const { data } = await glueReturnLogApi.postConfirmGlueReturnLog(payload);
    if (!data?.success) {
      throw new Error(data?.message || t('listGlueReturnLog.toast.confirmFailed'));
    }

    applyRowPatch(row.glueReturnLogId, {
      apiConfirmed: true,
    });
    await pendingStore.clearPending(row.glueReturnLogId);
    void fetchGlueReturnLogs(currentPage.value, rowsPerPage.value);

    showToast({
      severity: 'success',
      summary: t('listGlueReturnLog.toast.success'),
      detail: t('listGlueReturnLog.toast.confirmSuccess'),
      life: 3000,
    });
  } catch (error) {
    if (notifyOfflineFromError(error)) return;
    console.error('Lỗi xác nhận cân trả keo:', error);
    showToast({
      severity: 'error',
      summary: t('listGlueReturnLog.toast.error'),
      detail: t('listGlueReturnLog.toast.confirmFailed'),
      life: 6000,
    });
  } finally {
    isConfirming.value = false;
    submittingRowId.value = '';
  }
};

onIonViewWillEnter(() => {
  currentPage.value = 1;
  startAutoConnect(GLUE_RETURN_LOG_SCALE_SESSION);
  void fetchGlueReturnLogs(1, rowsPerPage.value);
});

onIonViewWillLeave(() => {
  stopAutoConnect(GLUE_RETURN_LOG_SCALE_SESSION);
});
</script>

<style scoped>
.list-glue-return-page {
  width: 100%;
}

.list-glue-return-section-title {
  font-weight: 700;
  color: var(--text-color-secondary);
  font-size: 1.2rem;
}

.glue-return-selected-input {
  width: 100%;
  max-width: 100%;
}

.list-glue-return-table-wrap {
  width: 100%;
  max-width: 100%;
}

.tablet-page--inch87.list-glue-return-page {
  padding: 0.5rem 0.625rem;
}

.tablet-page--inch87 .list-glue-return-card-head {
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tablet-page--inch87 .list-glue-return-toolbar {
  padding: 0 0.75rem 0.625rem;
}

.tablet-page--inch11.list-glue-return-page {
  padding: 0.875rem 1.125rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.tablet-page--inch11 .list-glue-return-card-head {
  padding: 0.875rem 1rem;
  gap: 0.75rem;
}

.tablet-page--inch11 .list-glue-return-toolbar {
  padding: 0 1rem 0.875rem;
}

.tablet-page--inch11 .glue-return-selected-input {
  max-width: 400px;
}
</style>
