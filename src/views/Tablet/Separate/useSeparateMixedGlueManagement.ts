import { ref, computed, watch, nextTick } from 'vue';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import { onIonViewDidEnter, onIonViewWillEnter, onIonViewWillLeave, useBackButton, alertController } from '@ionic/vue';
import { useToast } from 'primevue/usetoast';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import UI from '@/mixins/present';
import format from '@/mixins/format';
import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore, isSeparateDraftRestorable, hasDraftSeparateTableData, normalizeDraftWorkOrderId } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import materialApi from '@/api/material';
import separateGlue from '@/api/separate';
import bucketApi from '@/api/bucket';
import { validateSeparateGlueAllocation, validateChietBucketCapacity, type BucketOption } from './separateGlue.bucket';
import { useAppLocale } from '@/composables/useAppLocale';
import { useRequireOnline } from '@/composables/useRequireOnline';

import type { HeaderInfo, MixingProcess, NewComponentFormData, PayloadBuildContext } from './separateMixedGlue.types';
import {
  applyMixGlueMasterId,
  createDefaultSeparateGlueRow,
  mapNoMixChemicalsFull,
  mapSeparateHeaderInfo,
  normalizeRequestDetails,
  resolveNoMixSeparateGlueDetails,
  resolveSplitSeparateGlueDetails,
  resolveNoMixGlueWeightFromApi,
  syncSeparateGlueRowGlueIds,
} from './separateMixedGlue.mappers';
import { buildSeparateGlueCommandPayload, buildSeparateGlueExitPayload } from './separateMixedGlue.payload';
import {
  isNewNoMixSeparateAddRow,
  markApiNoSeparateGlueCancelledByRow,
  normalizeNewNoMixSeparateAddRow,
  syncNoMixSeparateGlueState,
} from './noSeparateGlueSync';
import { useScaleManager } from '@/composables/useScaleManager';

dayjs.extend(customParseFormat);

export function useSeparateMixedGlueManagement() {
  const toast = useToast();
  const { t } = useAppLocale(() => 'tablet');
  const { requireOnline, notifyOfflineFromError } = useRequireOnline();
  const authStore = useAuthStore();
  const draftStore = useMixGlueDraftStore();
  const { releaseScaleConnection } = useScaleManager();
  const route = useRoute();
  const router = useRouter();

  // --- Meta & trạng thái chung ---
  const currentWorkOrderId = ref('');
  const isDirty = ref(false);
  const isNavigatingAway = ref(false);
  const startDate = ref('');
  const endDate = ref('');
  const hourlyValidity = ref('0');
  const mixGlueMasterId = ref('');
  const selectedTab = ref('table1');
  const separateGlueComplete = ref(false);
  const separateGlueConfirm = ref(false);
  /** isNoMixGlue: đã bấm ✓ submit 1 lần → khóa nút ✓ và bảng noMix. */
  const noMixGlueSubmitLocked = ref(false);
  const headerInfo = ref<HeaderInfo>({
    orderNo: '',
    glue: '',
    totalWeight: '',
    totalMixGlueWeight: '0.000',
    totalNoMixGlueWeight: '0.000',
    isNoMixGlue: false,
  });
  const isLoadingLine = ref(true);
  const isLoadingComponent = ref(true);

  // --- Tab keo trộn (bảng 1) ---
  const orderDetails = ref<any[]>([]);
  const requestDetails = ref<any[]>([]);
  const separateGlueDetails = ref<any[]>([]);
  const noMixSeparateGlueDetails = ref<any[]>([]);
  const apiNoSeparateGlues = ref<any[]>([]);
  const mixChemicals = ref<any[]>([]);
  const noMixChemicals = ref<any[]>([]);

  const hasMixChemicals = computed(() => mixChemicals.value.length > 0);
  const hasNoMixChemicals = computed(() => noMixChemicals.value.length > 0);
  const isNoMixGlue = computed(() => headerInfo.value.isNoMixGlue);

  const isNoMixGlueOperationLocked = computed(() =>
    headerInfo.value.isNoMixGlue
    && (noMixGlueSubmitLocked.value || separateGlueConfirm.value)
  );

  const mixedGlueTableDetails = computed(() => (
    hasMixChemicals.value ? separateGlueDetails.value : []
  ));

  const noMixGlueTableDetails = computed(() => (
    hasNoMixChemicals.value ? noMixSeparateGlueDetails.value : []
  ));

  const resolveNoMixGlueWeightDisplay = (): string =>
    resolveNoMixGlueWeightFromApi({
      noSeparateGlues: apiNoSeparateGlues.value,
      totalNoMixGlueWeight: headerInfo.value.totalNoMixGlueWeight,
    });

  const totalWeightActualDisplay = computed(() => (
    headerInfo.value.isNoMixGlue
      ? resolveNoMixGlueWeightDisplay()
      : headerInfo.value.totalMixGlueWeight
  ));

  const mixSeparateTargetWeight = computed(() => headerInfo.value.totalMixGlueWeight || '0');
  const noMixSeparateTargetWeight = computed(() => resolveNoMixGlueWeightDisplay());

  const getNoMixGlueId = () => String(noMixChemicals.value[0]?.materialCode ?? '');

  const applySplitSeparateGlueDetails = (existingDraft: any, respData: any) => {
    const hasMix = (respData?.mixChemicals || []).length > 0;
    const hasNoMix = (respData?.noMixChemicals || []).length > 0;
    const isNoMixGlue = Boolean(
      existingDraft?.headerInfo?.isNoMixGlue ?? respData?.isNoMixGlue
    );
    const { mixRows, noMixRows } = resolveSplitSeparateGlueDetails(
      existingDraft,
      respData,
      mixGlueMasterId.value,
      hasMix,
      hasNoMix,
      getNoMixGlueId(),
      isNoMixGlue
    );

    separateGlueDetails.value = syncSeparateGlueRowGlueIds(mixRows, mixGlueMasterId.value);
    noMixSeparateGlueDetails.value = noMixRows.map((row) => ({
      ...row,
      glueId: getNoMixGlueId() || row.glueId,
    }));

    if (isNoMixGlue) {
      applyNoMixGlueApiSync();
    }
  };

  const applyNoMixGlueApiSync = () => {
    if (!headerInfo.value.isNoMixGlue) return;

    const synced = syncNoMixSeparateGlueState(
      noMixSeparateGlueDetails.value,
      apiNoSeparateGlues.value,
      getNoMixGlueId()
    );
    noMixSeparateGlueDetails.value = synced.tableRows;
    apiNoSeparateGlues.value = synced.apiItems;
  };

  // --- Tab keo không trộn (bảng 2) ---
  const noMixChemicalsFull = ref<any[]>([]);
  const noMixComponents = ref<any[]>([]);
  const selectedItem = ref<any>(null);
  const activeComponent = ref<any>(null);
  const mixingProcess = ref<MixingProcess>({ component: '', weight: '', styleName: '' });

  // --- Modal / dialog ---
  const productDialog = ref(false);
  const materialsList = ref<any[]>([]);
  const isLoadingMaterials = ref(false);
  const isViewMode = ref(false);
  const chietDialog = ref(false);
  const chietOrderDetails = ref<any[]>([]);
  const currentChietChemical = ref<any>(null);
  const extraChietList = ref<any[]>([]);
  /** Dòng chiết đang làm dở theo từng keo — tách biệt với separateGlueDetails tab 1. */
  const chietPendingByMaterial = ref<Record<string, any[]>>({});

  watch(separateGlueDetails, () => {
    if (!isLoadingLine.value) isDirty.value = true;
  }, { deep: true });

  watch(noMixSeparateGlueDetails, () => {
    if (!isLoadingLine.value) isDirty.value = true;
  }, { deep: true });

  watch(noMixChemicalsFull, () => {
    if (!isLoadingComponent.value) isDirty.value = true;
  }, { deep: true });

  watch(noMixComponents, () => {
    if (!isLoadingComponent.value) isDirty.value = true;
  }, { deep: true });

  const resetState = () => {
    isDirty.value = false;
    isNavigatingAway.value = false;
    separateGlueComplete.value = false;
    separateGlueConfirm.value = false;
    noMixGlueSubmitLocked.value = false;
    startDate.value = '';
    endDate.value = '';
    headerInfo.value = {
      orderNo: '',
      glue: '',
      totalWeight: '',
      totalMixGlueWeight: '0.000',
      totalNoMixGlueWeight: '0.000',
      isNoMixGlue: false,
    };
    orderDetails.value = [];
    requestDetails.value = [];
    separateGlueDetails.value = [];
    noMixSeparateGlueDetails.value = [];
    apiNoSeparateGlues.value = [];
    mixChemicals.value = [];
    noMixChemicals.value = [];
    noMixChemicalsFull.value = [];
    noMixComponents.value = [];
    selectedItem.value = null;
    activeComponent.value = null;
    mixingProcess.value = { component: '', weight: '', styleName: '' };
    hourlyValidity.value = '0';
    selectedTab.value = 'table1';
    extraChietList.value = [];
    chietOrderDetails.value = [];
    chietPendingByMaterial.value = {};
    currentChietChemical.value = null;
    mixGlueMasterId.value = '';
  };

  const buildDraftSnapshot = () => ({
    headerInfo: headerInfo.value,
    noMixChemicalsFull: noMixChemicalsFull.value,
    noMixComponents: noMixComponents.value,
    separateGlueDetails: separateGlueDetails.value,
    noMixSeparateGlueDetails: noMixSeparateGlueDetails.value,
    apiNoSeparateGlues: apiNoSeparateGlues.value,
    requestDetails: requestDetails.value,
    extraChietList: extraChietList.value,
    chietPendingByMaterial: chietPendingByMaterial.value,
    mixGlueMasterId: mixGlueMasterId.value,
    noMixGlueSubmitLocked: noMixGlueSubmitLocked.value,
  });

  const saveDraftToStoreOnly = async () => {
    if (isNavigatingAway.value) return;

    const draftKey = normalizeDraftWorkOrderId(currentWorkOrderId.value);
    if (!draftKey) return;

    await draftStore.saveDraft(draftKey, buildDraftSnapshot());
  };

  const hasLocalSeparateTableData = () =>
    separateGlueDetails.value.length > 0
    || noMixSeparateGlueDetails.value.length > 0
    || (headerInfo.value.isNoMixGlue && apiNoSeparateGlues.value.length > 0);

  const persistDraftOnLeave = async () => {
    if (isNavigatingAway.value || !hasLocalSeparateTableData()) return;
    await saveDraftToStoreOnly();
  };

  const syncApiNoSeparateGlues = (respData: any, draft?: any) => {
    if (Array.isArray(draft?.apiNoSeparateGlues) && draft.apiNoSeparateGlues.length > 0) {
      apiNoSeparateGlues.value = draft.apiNoSeparateGlues.map((item: any) => ({ ...item }));
      return;
    }

    apiNoSeparateGlues.value = Array.isArray(respData?.noSeparateGlues)
      ? respData.noSeparateGlues.map((item: any) => ({ ...item }))
      : [];
  };

  const getPayloadContext = (): PayloadBuildContext => ({
    factoryId: authStore.user?.factoryId || '',
    employeeId: authStore.user?.employeeId || '',
    workOrderMasterId: currentWorkOrderId.value,
    startDate: startDate.value,
    endDate: endDate.value,
    mixGlueMasterId: mixGlueMasterId.value,
    mixChemicals: mixChemicals.value,
    noMixChemicals: noMixChemicals.value,
    separateGlueDetails: separateGlueDetails.value,
    noMixSeparateGlueDetails: noMixSeparateGlueDetails.value,
    extraChietList: extraChietList.value,
    noMixComponents: noMixComponents.value,
    isNoMixGlue: headerInfo.value.isNoMixGlue,
    apiNoSeparateGlues: apiNoSeparateGlues.value,
    totalNoMixGlueWeight: resolveNoMixGlueWeightDisplay(),
  });

  const getOperatorInfo = () => ({
    name: authStore.user?.name || authStore.user?.employeeName || authStore.user?.employeeId || t('mixGlueManagement.unknownOperator'),
    id: authStore.user?.employeeId || '',
  });

  /** Dòng có sẵn từ API → glueExtra false; dòng tự thêm (không có trong API gốc) → glueExtra true. */
  const normalizeNoMixGlueExtraFlags = (components: any[], apiNoMixChemicals: any[]) => {
    const preExistingCodes = new Set(
      (apiNoMixChemicals || []).map((item) => String(item.materialCode))
    );

    return (components || []).map((item) => ({
      ...item,
      glueExtra: preExistingCodes.has(String(item.materialCode)) ? false : true,
    }));
  };

  const restoreNoMixSubmitLockFromDraft = (draft?: any) => {
    if (draft?.noMixGlueSubmitLocked === true) {
      noMixGlueSubmitLocked.value = true;
    }
  };

  const applySeparateGlueStatusFromWorkOrder = (respData: any) => {
    separateGlueComplete.value = Boolean(respData?.separateGlueComplete);
    separateGlueConfirm.value = Boolean(respData?.separateGlueConfirm);
    if (Boolean(respData?.isNoMixGlue) && separateGlueConfirm.value) {
      noMixGlueSubmitLocked.value = true;
    }
    const fromQuery = route.query.separateGlueComplete === 'true' || route.query.separateGlueComplete === '1';
    if (fromQuery) {
      separateGlueComplete.value = true;
    }
  };

  const blockIfNoMixOperationLocked = (): boolean => {
    if (!isNoMixGlueOperationLocked.value) return false;

    toast.add({
      severity: 'warn',
      summary: t('separateMixedGlue.toast.locked'),
      detail: t('separateMixedGlue.toast.noMixAlreadySubmitted'),
      life: 6000,
    });
    return true;
  };

  const blockIfOrderComplete = (): boolean => {
    if (!separateGlueComplete.value) return false;

    toast.add({
      severity: 'warn',
      summary: t('separateMixedGlue.toast.locked'),
      detail: t('separateMixedGlue.toast.completeFirst'),
      life: 6000,
    });
    return true;
  };

  const restoreDraftBranch = async (id: string, existingDraft: any) => {
    restoreNoMixSubmitLockFromDraft(existingDraft);
    const factoryId = authStore.user?.factoryId || '';
    noMixChemicalsFull.value = existingDraft.noMixChemicalsFull as any[];
    noMixComponents.value = (existingDraft.noMixComponents as any[]) || [];
    extraChietList.value = (existingDraft.extraChietList as any[]) || [];
    chietPendingByMaterial.value = (existingDraft.chietPendingByMaterial as Record<string, any[]>) || {};
    applyMixGlueMasterId({}, existingDraft.mixGlueMasterId, (v) => { mixGlueMasterId.value = v; });

    if (noMixComponents.value.length > 0) {
      selectedItem.value = noMixComponents.value[0];
      activeComponent.value = { ...noMixComponents.value[0] };
      mixingProcess.value.styleName = noMixComponents.value[0]?.styleName || '';
      mixingProcess.value.component = noMixComponents.value[0]?.materialName || '';
      if (!noMixComponents.value[0]?.glueExtra) {
        activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
      }
    } else if (noMixChemicalsFull.value.length > 0) {
      selectedItem.value = noMixChemicalsFull.value[0];
      activeComponent.value = { ...noMixChemicalsFull.value[0] };
      mixingProcess.value.styleName = noMixChemicalsFull.value[0]?.styleName || '';
      mixingProcess.value.component = noMixChemicalsFull.value[0]?.materialName || '';
    }

    const { data } = await workOrder.getWorkOrder(factoryId, id, 3);
    if (!data?.success) {
      syncApiNoSeparateGlues({}, existingDraft);
      applySplitSeparateGlueDetails(existingDraft, {
        mixChemicals: existingDraft?.separateGlueDetails?.length ? [{}] : [],
        noMixChemicals: existingDraft?.noMixSeparateGlueDetails?.length ? [{}] : [],
        isNoMixGlue: existingDraft?.headerInfo?.isNoMixGlue,
      });
      return;
    }

    const respData = data.data;
    applySeparateGlueStatusFromWorkOrder(respData);
    headerInfo.value = mapSeparateHeaderInfo(respData);
    syncApiNoSeparateGlues(respData, existingDraft);
    startDate.value = respData.startDate || new Date().toISOString();
    endDate.value = respData.endDate || new Date().toISOString();
    hourlyValidity.value = respData.hourlyValidity || '0';
    applyMixGlueMasterId(respData, existingDraft.mixGlueMasterId, (v) => { mixGlueMasterId.value = v; });
    mixChemicals.value = respData.mixChemicals || [];
    noMixChemicals.value = respData.noMixChemicals || [];
    orderDetails.value = respData.orderDetails || [];
    requestDetails.value = existingDraft.requestDetails?.length
      ? existingDraft.requestDetails
      : normalizeRequestDetails(respData);
    applySplitSeparateGlueDetails(existingDraft, respData);

    noMixComponents.value = normalizeNoMixGlueExtraFlags(
      noMixComponents.value,
      respData.noMixChemicals || []
    );

    if (selectedItem.value) {
      const restoredSelection = noMixComponents.value.find(
        (item) => String(item.materialCode) === String(selectedItem.value?.materialCode)
      );
      if (restoredSelection) {
        selectedItem.value = restoredSelection;
        activeComponent.value = { ...restoredSelection };
        mixingProcess.value.component = restoredSelection.materialName || '';
        mixingProcess.value.styleName = restoredSelection.styleName || '';
      }
    }

    toast.add({ severity: 'info', summary: t('separateMixedGlue.toast.restore'), detail: t('separateMixedGlue.toast.restoreDetail'), life: 6000 });
  };

  const loadFreshBranch = async (id: string, existingDraft?: any) => {
    restoreNoMixSubmitLockFromDraft(existingDraft);
    const factoryId = authStore.user?.factoryId || '';
    const { data } = await workOrder.getWorkOrder(factoryId, id, 3);
    if (!data?.success) return;

    const respData = data.data;
    applySeparateGlueStatusFromWorkOrder(respData);
    startDate.value = respData.startDate || new Date().toISOString();
    endDate.value = respData.endDate || new Date().toISOString();
    hourlyValidity.value = respData.hourlyValidity || '0';
    applyMixGlueMasterId(respData, existingDraft?.mixGlueMasterId, (v) => { mixGlueMasterId.value = v; });

    headerInfo.value = mapSeparateHeaderInfo(respData);
    syncApiNoSeparateGlues(respData, existingDraft);

    mixChemicals.value = respData.mixChemicals || [];
    noMixChemicals.value = respData.noMixChemicals || [];
    orderDetails.value = respData.orderDetails || [];
    requestDetails.value = existingDraft?.requestDetails?.length
      ? existingDraft.requestDetails
      : normalizeRequestDetails(respData);
    applySplitSeparateGlueDetails(
      hasDraftSeparateTableData(existingDraft) ? existingDraft : null,
      respData
    );

    noMixChemicalsFull.value = mapNoMixChemicalsFull(respData.mixChemicals || []);
    noMixComponents.value = normalizeNoMixGlueExtraFlags(
      respData.noMixChemicals || [],
      respData.noMixChemicals || []
    );

    if (noMixComponents.value.length > 0) {
      selectedItem.value = noMixComponents.value[0];
      activeComponent.value = { ...noMixComponents.value[0] };
      activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
      mixingProcess.value.styleName = noMixComponents.value[0].styleName || '';
      mixingProcess.value.component = noMixComponents.value[0].materialName || '';
    }
  };

  const fetchWorkOrderDetail = async (id: string) => {
    const normalizedId = normalizeDraftWorkOrderId(id);
    if (!normalizedId) return;

    resetState();
    isLoadingLine.value = true;
    isLoadingComponent.value = true;
    currentWorkOrderId.value = normalizedId;

    try {
      await draftStore.ensureHydrated();
      const existingDraft = draftStore.getDraft(normalizedId);
      const shouldRestoreDraft = Boolean(
        existingDraft
        && (isSeparateDraftRestorable(existingDraft) || hasDraftSeparateTableData(existingDraft))
      );

      if (shouldRestoreDraft) {
        await restoreDraftBranch(normalizedId, existingDraft);
      } else {
        await loadFreshBranch(normalizedId, existingDraft);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu chi tiết:', error);
      toast.add({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('separateMixedGlue.toast.loadFailed'), life: 6000 });
    } finally {
      isLoadingLine.value = false;
      isLoadingComponent.value = false;
      await nextTick();
      isDirty.value = false;
    }
  };

  const isRowWeighed = (row: any) =>
    !!row.actualWeight && Number(row.actualWeight) > 0;

  const isSeparateGlueRowFilled = (row: any) => {
    // const hasRequest =
    //   (Array.isArray(row.selectedRequestDetailIds) && row.selectedRequestDetailIds.length > 0)
    //   || (Array.isArray(row.requestDetailIds) && row.requestDetailIds.length > 0);
    const hasBucket = !!row.selectedBucketId || !!row.bucketId;
    return hasBucket;
  };

  /** Dòng user bấm + (isNewAddRow); đơn chỉ keo không trộn không có dòng mặc định. */
  const getNoMixUserAddedRows = () =>
    noMixSeparateGlueDetails.value.filter(isNewNoMixSeparateAddRow);

  /** isNoMixGlue: không add-row → submit bình thường; có add-row → bắt chọn thùng + đủ kg. */
  const shouldValidateNoMixSeparateRows = () => {
    if (!hasNoMixChemicals.value) return false;
    if (headerInfo.value.isNoMixGlue) {
      return getNoMixUserAddedRows().length > 0;
    }
    return true;
  };

  const bucketListForValidation = ref<BucketOption[]>([]);

  const ensureBucketListForValidation = async () => {
    if (bucketListForValidation.value.length > 0) {
      return bucketListForValidation.value;
    }

    try {
      const { data } = await bucketApi.postBucket({ factoryId: authStore.user?.factoryId || '' });
      if (data?.success && data.data) {
        bucketListForValidation.value = data.data;
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách thùng chứa', error);
    }

    return bucketListForValidation.value;
  };

  const validateBeforeComplete = async (): Promise<string | null> => {
    const bucketList = await ensureBucketListForValidation();

    if (hasMixChemicals.value) {
      for (let i = 0; i < separateGlueDetails.value.length; i++) {
        if (!isSeparateGlueRowFilled(separateGlueDetails.value[i])) {
          return t('separateMixedGlue.toast.mixedGlueSelectBucket', { row: i + 1 });
        }
      }

      const mixCapacityResult = validateChietBucketCapacity(
        separateGlueDetails.value,
        bucketList,
        mixSeparateTargetWeight.value,
        'Kg'
      );
      if (!mixCapacityResult.ok) {
        return t('separateMixedGlue.toast.mixedGluePrefix', {
          message: mixCapacityResult.message || t('separateMixedGlue.validation.capacityMismatchWeighed'),
        });
      }
    }

    if (shouldValidateNoMixSeparateRows()) {
      const rowsToValidate = headerInfo.value.isNoMixGlue
        ? getNoMixUserAddedRows()
        : noMixSeparateGlueDetails.value;

      for (const row of rowsToValidate) {
        if (!isSeparateGlueRowFilled(row)) {
          const rowIndex = noMixSeparateGlueDetails.value.indexOf(row);
          return t('separateMixedGlue.toast.noMixSelectBucket', {
            row: rowIndex >= 0 ? rowIndex + 1 : 1,
          });
        }
      }

      const noMixCapacityResult = validateChietBucketCapacity(
        rowsToValidate,
        bucketList,
        noMixSeparateTargetWeight.value,
        'Kg'
      );
      if (!noMixCapacityResult.ok) {
        return t('separateMixedGlue.toast.noMixPrefix', {
          message: noMixCapacityResult.message || t('separateMixedGlue.validation.capacityMismatchWeighed'),
        });
      }
    }

    if (!hasNoMixChemicals.value && noMixComponents.value.length > 0) {
      const unweighed = noMixComponents.value.find((item) => !isRowWeighed(item));
      if (unweighed) {
        return t('separateMixedGlue.toast.noMixWeighFirst', { name: unweighed.materialName });
      }

      for (const row of noMixComponents.value) {
        if (!row.isChietCompleted) continue;

        const extras = extraChietList.value.filter(
          (item) => String(item.glueId) === String(row.materialCode)
        );
        if (extras.length === 0) continue;

        for (let i = 0; i < extras.length; i++) {
          if (!isSeparateGlueRowFilled(extras[i])) {
            return t('separateMixedGlue.toast.chietSelectBucket', { name: row.materialName, row: i + 1 });
          }
        }

        const chietAllocationError = validateSeparateGlueAllocation(
          extras,
          requestDetails.value,
          bucketList,
          row.actualWeight,
          row.weightUnit || 'Kg',
          { requireAllRequestDetails: false }
        );
        if (chietAllocationError) {
          return t('separateMixedGlue.toast.chietPrefix', { name: row.materialName, message: chietAllocationError || '' });
        }
      }
    }

    return null;
  };

  const handleComplete = async () => {
    if (isNoMixGlueOperationLocked.value) {
      blockIfNoMixOperationLocked();
      return;
    }

    if (!(await requireOnline())) return;

    const validationError = await validateBeforeComplete();
    if (validationError) {
      toast.add({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.incomplete'),
        detail: validationError,
        life: 6000,
      });
      return;
    }

    try {
      const payload = buildSeparateGlueCommandPayload(getPayloadContext(), '1', { forComplete: true });
      await separateGlue.postSeparateGlueCommand(payload);

      if (headerInfo.value.isNoMixGlue) {
        noMixGlueSubmitLocked.value = true;
        separateGlueConfirm.value = true;
        const draftKey = normalizeDraftWorkOrderId(currentWorkOrderId.value);
        if (draftKey) {
          await draftStore.saveDraft(draftKey, buildDraftSnapshot());
        }
      }

      isNavigatingAway.value = true;
      isDirty.value = false;
      toast.add({ severity: 'success', summary: t('separateMixedGlue.toast.completeSuccess'), detail: t('separateMixedGlue.toast.completeSuccessDetail'), life: 3000 });
      router.push('/list-separate-mixed-glue-management');
    } catch (error) {
      if (notifyOfflineFromError(error)) return;
      toast.add({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('separateMixedGlue.toast.completeFailed'), life: 3000 });
    }
  };

  const onRowClick = (event: { data: any }) => {
    if (isLoadingComponent.value || !event.data?.materialName) return;

    mixingProcess.value.styleName = event.data.styleName || '';
    mixingProcess.value.component = event.data.materialName || '';

    const rowIndex = noMixComponents.value.findIndex(item => item === event.data);
    activeComponent.value = { ...event.data };
    selectedItem.value = event.data;

    if (rowIndex === 0 && !event.data.glueExtra) {
      activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
    }
    mixingProcess.value.weight = '0.000';
  };

  const handleWeightChange = (newWeight: string) => {
    mixingProcess.value.weight = newWeight;
  };

  const scrollToActiveRow = () => {
    setTimeout(() => {
      if (!activeComponent.value) return;

      const index = noMixComponents.value.findIndex(
        item => item.materialName === activeComponent.value?.materialName
      );
      if (index === -1) return;

      const wrapper = document.querySelector('.table-wrapper .p-datatable-tbody');
      const rows = wrapper?.querySelectorAll('tr');
      rows?.[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const recalculateRequiredWeights = (baseActualWeight: number) => {
    const baseItem = noMixComponents.value[0];
    const baseMixingRatio = Number(baseItem.mixingRatio || '100');
    if (baseActualWeight <= 0) return;

    const baseUnit = baseItem.weightUnit?.toLowerCase() || 'kg';

    noMixComponents.value.forEach((item, i) => {
      if (i === 0 || item.glueExtra) return;

      const currentRatio = Number(item.mixingRatio || '0');
      let newRequiredWeight = (currentRatio * baseActualWeight) / baseMixingRatio;
      const currentUnit = item.weightUnit?.toLowerCase() || 'kg';

      if (baseUnit === 'kg' && currentUnit === 'g') newRequiredWeight *= 1000;
      else if (baseUnit === 'g' && currentUnit === 'kg') newRequiredWeight /= 1000;

      item.requiredWeight = newRequiredWeight.toFixed(3);
    });
  };

  const handleConfirmWeight = async (actualWeight: string) => {
    if (!activeComponent.value) return;

    const index = noMixComponents.value.findIndex(
      item => item.materialName === activeComponent.value?.materialName
    );
    if (index === -1) return;

    const now = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');
    const weighedMaterialName = noMixComponents.value[index].materialName;
    const operator = getOperatorInfo();

    noMixComponents.value[index].actualWeight = actualWeight;
    noMixComponents.value[index].operator = operator.name;
    noMixComponents.value[index].operatorId = operator.id;
    noMixComponents.value[index].weighingTime = now;
    noMixComponents.value[index].confirmDate = now;

    recalculateRequiredWeights(Number(noMixComponents.value[0].actualWeight || '0'));

    const nextIndex = noMixComponents.value.findIndex(item => !item.weighingTime);
    if (nextIndex !== -1) {
      const nextItem = noMixComponents.value[nextIndex];
      selectedItem.value = nextItem;
      activeComponent.value = { ...nextItem };
      mixingProcess.value.component = nextItem.materialName || '';
      mixingProcess.value.styleName = nextItem.styleName || '';
      mixingProcess.value.weight = '0.000';
      if (nextIndex === 0 && !nextItem.glueExtra) {
        activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
      }
      scrollToActiveRow();
    } else {
      activeComponent.value = { ...noMixComponents.value[index] };
      // toast.add({ severity: 'success', summary: t('separateMixedGlue.toast.weighingComplete'), detail: t('separateMixedGlue.toast.weighingCompleteDetail'), life: 4000 });
    }

    const fullIndex = noMixChemicalsFull.value.findIndex(item => item.materialName === weighedMaterialName);
    if (fullIndex !== -1) {
      noMixChemicalsFull.value[fullIndex].actualWeight = actualWeight;
      noMixChemicalsFull.value[fullIndex].operator = operator.name;
      noMixChemicalsFull.value[fullIndex].operatorId = operator.id;
      noMixChemicalsFull.value[fullIndex].weighingTime = now;
      noMixChemicalsFull.value[fullIndex].confirmDate = now;
    }

    await saveDraftToStoreOnly();
  };

  const handleConnectionStatus = (_status: boolean) => { };

  const calcToleranceGrams = (weight: number, weightUnit: string) => {
    const unit = weightUnit.toLowerCase();
    const weightInGrams = unit === 'kg' ? weight * 1000 : weight;
    return Number((weightInGrams * 0.05).toFixed(3));
  };

  const handleSaveNewComponent = async (newComponentData: NewComponentFormData) => {
    if (blockIfOrderComplete()) return;

    const enteredWeight = Number(newComponentData.percentage ?? 0);
    const weightUnit = newComponentData.weightUnit || 'Kg';
    const toleranceGrams = calcToleranceGrams(enteredWeight, weightUnit);

    const newComponent = {
      materialName: newComponentData.name,
      materialCode: newComponentData.materialCode,
      weightUnit,
      requiredWeight: enteredWeight.toFixed(3),
      actualWeight: '',
      operator: '',
      operatorId: '',
      weighingTime: '',
      confirmDate: '',
      lowerTolerance: String(toleranceGrams),
      upperTolerance: String(toleranceGrams),
      mixingRatio: '',
      glueExtra: true,
      styleName: '',
      factoryName: '',
      factoryId: authStore.user?.factoryId || '',
    };

    noMixChemicalsFull.value.push(newComponent);
    noMixComponents.value.push(newComponent);

    selectedItem.value = newComponent;
    activeComponent.value = { ...newComponent };
    mixingProcess.value.component = newComponent.materialName;
    mixingProcess.value.styleName = '';
    mixingProcess.value.weight = '0.000';
    scrollToActiveRow();

    await draftStore.saveDraft(currentWorkOrderId.value, buildDraftSnapshot());
    toast.add({ severity: 'success', summary: t('separateMixedGlue.toast.addSuccess'), detail: t('separateMixedGlue.toast.addSuccessDetail'), life: 3000 });
  };

  const handleDeleteComponent = async (rowToDelete: any) => {
    if (blockIfOrderComplete()) return;

    await UI.Confirm(
      t('separateMixedGlue.confirmDelete.title'),
      t('separateMixedGlue.confirmDelete.componentLabel', { name: rowToDelete.materialName ?? '' }),
      t('separateMixedGlue.confirmDelete.message'),
      async () => {
        noMixChemicalsFull.value = noMixChemicalsFull.value.filter(
          item => item.materialCode !== rowToDelete.materialCode
        );
        noMixComponents.value = noMixComponents.value.filter(
          item => item.materialCode !== rowToDelete.materialCode
        );
        extraChietList.value = extraChietList.value.filter(
          item => item.glueId !== rowToDelete.materialCode
        );
        await draftStore.saveDraft(currentWorkOrderId.value, buildDraftSnapshot());
        toast.add({ severity: 'success', summary: t('separateMixedGlue.toast.deleteSuccess'), detail: t('separateMixedGlue.toast.deleteSuccessDetail'), life: 3000 });
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
        const existingCodes = new Set(
          noMixComponents.value.map(item => String(item.materialCode))
        );
        materialsList.value = (data.data || []).filter(
          (item: any) => !existingCodes.has(String(item.materialCode))
        );
      }
    } catch {
      toast.add({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('separateMixedGlue.toast.loadMaterialsFailed'), life: 3000 });
    } finally {
      isLoadingMaterials.value = false;
    }
  };

  const openNewComponentDialog = () => {
    const unweighed = noMixComponents.value.find((item) => !isRowWeighed(item));
    if (unweighed) {
      toast.add({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.notWeighed'),
        detail: t('separateMixedGlue.toast.weighBeforeAdd', { name: unweighed.materialName }),
        life: 6000,
      });
      return;
    }
    productDialog.value = true;
  };

  const handleAddSeparateGlueRow = async () => {
    if (blockIfOrderComplete()) return;

    separateGlueDetails.value.push({
      ...createDefaultSeparateGlueRow(mixGlueMasterId.value),
      glueId: mixGlueMasterId.value,
    });
    await saveDraftToStoreOnly();
  };

  const handleDeleteSeparateGlueRow = async (rowToDelete: any) => {
    if (blockIfOrderComplete()) return;

    separateGlueDetails.value = separateGlueDetails.value.filter(item => item !== rowToDelete);
    await saveDraftToStoreOnly();
  };

  const handleAddNoMixSeparateGlueRow = async () => {
    if (blockIfNoMixOperationLocked()) return;
    if (!headerInfo.value.isNoMixGlue && blockIfOrderComplete()) return;

    noMixSeparateGlueDetails.value.push(
      normalizeNewNoMixSeparateAddRow(
        {
          ...createDefaultSeparateGlueRow(getNoMixGlueId()),
          glueId: getNoMixGlueId(),
        },
        getNoMixGlueId()
      )
    );
    await saveDraftToStoreOnly();
  };

  const handleNoMixSeparateBucketUpdate = async () => {
    if (blockIfNoMixOperationLocked()) return;

    if (headerInfo.value.isNoMixGlue) {
      applyNoMixGlueApiSync();
    }
    await saveDraftToStoreOnly();
  };

  const handleDeleteNoMixSeparateGlueRow = async (rowToDelete: any) => {
    if (blockIfNoMixOperationLocked()) return;
    if (!headerInfo.value.isNoMixGlue && blockIfOrderComplete()) return;

    if (headerInfo.value.isNoMixGlue) {
      apiNoSeparateGlues.value = markApiNoSeparateGlueCancelledByRow(
        apiNoSeparateGlues.value,
        rowToDelete
      );
    }

    noMixSeparateGlueDetails.value = noMixSeparateGlueDetails.value.filter(item => item !== rowToDelete);
    await saveDraftToStoreOnly();
  };

  const createChietGlueRow = () => ({
    ...createDefaultSeparateGlueRow(mixGlueMasterId.value),
    chemicalId: currentChietChemical.value?.materialCode || '',
  });

  const mapExtraChietToRows = (savedData: any[], materialCode: string) => {
    return savedData.map((item) => ({
      ...createDefaultSeparateGlueRow(mixGlueMasterId.value),
      chemicalId: materialCode,
      selectedRequestDetailIds: item.selectedRequestDetailIds ?? [],
      selectedBucketId: item.bucketId ?? null,
      operator: item.operator || '',
      operatorId: item.operatorId || '',
      confirmDate: item.confirmDate || null,
      confirmTime: item.confirmDate ? format.formatDate(item.confirmDate) : null,
    }));
  };

  const loadChietOrderDetails = (materialCode: string, viewOnly: boolean) => {
    if (viewOnly) {
      const saved = extraChietList.value.filter(item => item.glueId === materialCode);
      chietOrderDetails.value = mapExtraChietToRows(saved, materialCode);
      return;
    }

    const pending = chietPendingByMaterial.value[materialCode];
    if (Array.isArray(pending) && pending.length > 0) {
      chietOrderDetails.value = pending.map(row => ({ ...row }));
      return;
    }

    chietOrderDetails.value = [];
  };

  const persistCurrentChietPending = () => {
    const code = currentChietChemical.value?.materialCode;
    if (!code || isViewMode.value) return;

    const next = { ...chietPendingByMaterial.value };
    if (chietOrderDetails.value.length > 0) {
      next[code] = chietOrderDetails.value.map(row => ({ ...row }));
    } else {
      delete next[code];
    }
    chietPendingByMaterial.value = next;
  };

  const saveChietDraftToStoreOnly = async () => {
    persistCurrentChietPending();
    await saveDraftToStoreOnly();
  };

  watch(chietDialog, (visible, wasVisible) => {
    if (wasVisible && !visible) {
      persistCurrentChietPending();
      void saveDraftToStoreOnly();
    }
  });

  const handleAddChietRow = () => {
    chietOrderDetails.value.push(createChietGlueRow());
    void saveChietDraftToStoreOnly();
  };

  const handleDeleteChietRow = (rowToDelete: any) => {
    if (blockIfOrderComplete()) return;

    chietOrderDetails.value = chietOrderDetails.value.filter(item => item !== rowToDelete);
    void saveChietDraftToStoreOnly();
  };

  const handleChietRow = (rowData: any) => {
    if (!isRowWeighed(rowData)) {
      toast.add({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.notWeighed'),
        detail: t('separateMixedGlue.toast.weighBeforeChiet', { name: rowData.materialName || '' }),
        life: 6000,
      });
      return;
    }

    isViewMode.value = false;
    currentChietChemical.value = rowData;
    loadChietOrderDetails(String(rowData.materialCode), false);
    chietDialog.value = true;
  };

  const handleViewRow = (rowData: any) => {
    isViewMode.value = true;
    currentChietChemical.value = rowData;
    loadChietOrderDetails(String(rowData.materialCode), true);
    chietDialog.value = true;
  };

  const confirmChiet = async () => {
    const targetCode = currentChietChemical.value?.materialCode;
    const sourceRow = noMixComponents.value.find(
      (item) => String(item.materialCode) === String(targetCode)
    );
    const keepGlueExtra = !!(sourceRow?.glueExtra ?? currentChietChemical.value?.glueExtra);

    extraChietList.value = extraChietList.value.filter(
      item => item.glueId !== targetCode
    );

    const now = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');
    chietOrderDetails.value.forEach(item => {
      if (item.selectedBucketId) {
        extraChietList.value.push({
          glueId: String(targetCode || item.chemicalId || ''),
          bucketId: item.selectedBucketId,
          selectedRequestDetailIds: item.selectedRequestDetailIds ?? [],
          _sourceLineId: item.selectedBucketId,
          operator: item.operator,
          operatorId: item.operatorId,
          confirmDate: item.confirmDate || now,
          recordStatus: '1',
          glueExtra: keepGlueExtra,
        });
      }
    });

    if (targetCode) {
      const index = noMixComponents.value.findIndex(
        (item) => String(item.materialCode) === String(targetCode)
      );
      if (index !== -1) {
        noMixComponents.value[index].isChietCompleted = true;
        noMixComponents.value[index].recordStatus = 'C';
        noMixComponents.value[index].bucketId = 0;
        noMixComponents.value[index].glueExtra = keepGlueExtra;
      }

      const fullIndex = noMixChemicalsFull.value.findIndex(
        (item) => String(item.materialCode) === String(targetCode)
      );
      if (fullIndex !== -1) {
        noMixChemicalsFull.value[fullIndex].isChietCompleted = true;
        noMixChemicalsFull.value[fullIndex].recordStatus = 'C';
        noMixChemicalsFull.value[fullIndex].bucketId = 0;
        noMixChemicalsFull.value[fullIndex].glueExtra = keepGlueExtra;
      }

      const nextPending = { ...chietPendingByMaterial.value };
      delete nextPending[String(targetCode)];
      chietPendingByMaterial.value = nextPending;
    }

    chietOrderDetails.value = [];
    await draftStore.saveDraft(currentWorkOrderId.value, buildDraftSnapshot());
    toast.add({ severity: 'success', summary: t('separateMixedGlue.toast.chietSaved'), detail: t('separateMixedGlue.toast.chietSavedDetail'), life: 3000 });
    chietDialog.value = false;
  };

  const alertExitPage = (): Promise<boolean> =>
    new Promise(resolve => {
      void (async () => {
        const alert = await alertController.create({
          header: t('separateMixedGlue.exitAlert.header'),
          message: t('separateMixedGlue.exitAlert.message'),
          buttons: [
            { text: t('separateMixedGlue.exitAlert.stay'), role: 'cancel', handler: () => resolve(false) },
            {
              text: t('separateMixedGlue.exitAlert.exit'),
              role: 'confirm',
              cssClass: 'text-red-500',
              handler: () => {
                void (async () => {
                  if (!(await requireOnline())) {
                    resolve(false);
                    return;
                  }
                  try {
                    const payload = buildSeparateGlueExitPayload(getPayloadContext());
                    await separateGlue.postSeparateGlueCommand(payload);
                    // await draftStore.clearAll();
                    isDirty.value = false;
                    resolve(true);
                  } catch (error) {
                    console.error(error);
                    if (notifyOfflineFromError(error)) {
                      resolve(false);
                      return;
                    }
                    toast.add({
                      severity: 'error',
                      summary: t('listMixGlue.toast.error'),
                      detail: t('separateMixedGlue.toast.progressSaveFailed'),
                      life: 6000,
                    });
                    resolve(false);
                  }
                })();
              },
            },
          ],
        });
        await alert.present();
      })();
    });

  const navigateToSeparateList = () => {
    router.replace('/list-separate-mixed-glue-management');
  };

  const goBack = async () => {
    await persistDraftOnLeave();

    if (isDirty.value) {
      const canLeave = await alertExitPage();
      if (canLeave) navigateToSeparateList();
      return;
    }
    navigateToSeparateList();
  };

  useBackButton(10, () => {
    if (!isDirty.value) {
      navigateToSeparateList();
      return;
    }
    void alertExitPage().then(ok => {
      if (ok) navigateToSeparateList();
    });
  });

  onBeforeRouteLeave(async () => {
    if (!isDirty.value) return true;
    return alertExitPage();
  });

  onIonViewDidEnter(async () => {
    await nextTick();
  });

  onIonViewWillLeave(() => {
    releaseScaleConnection();
    void persistDraftOnLeave();
  });

  onIonViewWillEnter(() => {
    selectedTab.value = 'table1';
    const workOrderMasterId = normalizeDraftWorkOrderId(route.query.workOrderMasterId as string);
    if (workOrderMasterId) {
      void fetchWorkOrderDetail(workOrderMasterId);
      return;
    }
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
  });

  return {
    headerInfo,
    totalWeightActualDisplay,
    mixSeparateTargetWeight,
    noMixSeparateTargetWeight,
    selectedTab,
    isLoadingLine,
    isLoadingComponent,
    mixChemicals,
    noMixChemicals,
    hasMixChemicals,
    hasNoMixChemicals,
    mixedGlueTableDetails,
    noMixGlueTableDetails,
    requestDetails,
    separateGlueComplete,
    separateGlueConfirm,
    isNoMixGlue,
    isNoMixGlueOperationLocked,
    saveDraftToStoreOnly,
    saveChietDraftToStoreOnly,
    handleAddSeparateGlueRow,
    handleDeleteSeparateGlueRow,
    handleAddNoMixSeparateGlueRow,
    handleNoMixSeparateBucketUpdate,
    handleDeleteNoMixSeparateGlueRow,
    handleComplete,
    onRowClick,
    handleWeightChange,
    handleConnectionStatus,
    handleConfirmWeight,
    handleSaveNewComponent,
    handleDeleteComponent,
    fetchMaterials,
    openNewComponentDialog,
    handleChietRow,
    handleViewRow,
    confirmChiet,
    handleAddChietRow,
    handleDeleteChietRow,
    goBack,
  };
}
