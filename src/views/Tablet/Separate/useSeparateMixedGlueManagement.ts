import { ref, computed, watch, nextTick } from 'vue';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import { useAppBackButton } from '@/composables/useAppBackButton';
import { usePageLifecycle } from '@/composables/usePageLifecycle';
import { useAppToast } from '@/composables/useAppToast';
import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore, isSeparateDraftRestorable, hasDraftSeparateTableData, normalizeDraftWorkOrderId } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import separateGlue from '@/api/separate';
import {
  validateChietBucketCapacity,
  pruneStaleBucketIds,
  getRowActiveBucketId,
  type BucketOption,
} from './separateGlue.bucket';
import { getCachedBucketOptions } from './bucketOptionsCache';
import { useAppLocale } from '@/composables/useAppLocale';
import { useRequireOnline } from '@/composables/useRequireOnline';

import type { HeaderInfo, PayloadBuildContext } from './separateMixedGlue.types';
import {
  applyMixGlueMasterId,
  createDefaultSeparateGlueRow,
  mapSeparateHeaderInfo,
  normalizeRequestDetails,
  resolveSplitSeparateGlueDetails,
  resolveNoMixGlueWeightFromApi,
  syncSeparateGlueRowGlueIds,
} from './separateMixedGlue.mappers';
import { buildSeparateGlueCommandPayload, buildSeparateGlueExitPayload } from './separateMixedGlue.payload';
import {
  isRecordStatusCancelled,
  markNoMixSeparateRowCancelledInApi,
  markApiSeparateGlueCancelledByRow,
  normalizeNewMixSeparateAddRow,
  normalizeNewNoMixSeparateAddRow,
  appendCancelledSeparateGlueDetail,
  applyInPlaceSeparateRowBucketUpdate,
  syncApiSeparateGlueBucketByRow,
  syncNoMixSeparateGlueBucketInApi,
  stampSubmittedSeparateRowBuckets,
  shouldPersistCancelledSeparateRow,
  type SeparateBucketUpdatePayload,
} from './noSeparateGlueSync';
import {
  mapMixSeparateRowsWithApiBySeq,
  mapNoMixSeparateRowsWithApiBySeq,
  resolveNoMixApiItemsForSeqMap,
  resolveNoMixApiFallbackForSeqMap,
  resolveMixApiItemsForSeqMap,
  filterMixApiSeparateGlues,
  getNextSeparateTableSeq,
} from './separateGlueSeqSync';

export function useSeparateMixedGlueManagement() {
  const { showToast } = useAppToast();
  const { t } = useAppLocale(() => 'tablet');
  const { requireOnline, notifyOfflineFromError } = useRequireOnline();
  const authStore = useAuthStore();
  const draftStore = useMixGlueDraftStore();
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
  const separateGlueComplete = ref(false);
  const separateGlueConfirm = ref(false);
  /** isNoMixGlue: đã submit ít nhất 1 lần (dùng cho kiểm tra thay đổi, không khóa UI). */
  const noMixGlueSubmitLocked = ref(false);
  /** false sau submit/load đã submit; true khi có add/update/delete hoặc chưa từng submit. */
  const separateChangedSinceLastSubmit = ref(true);
  const isCompleting = ref(false);
  const headerInfo = ref<HeaderInfo>({
    orderNo: '',
    glue: '',
    totalWeight: '',
    totalMixGlueWeight: '0.000',
    totalNoMixGlueWeight: '0.000',
    isNoMixGlue: false,
  });
  const isLoadingLine = ref(true);

  // --- Tab keo trộn (bảng 1) ---
  const orderDetails = ref<any[]>([]);
  const requestDetails = ref<any[]>([]);
  const separateGlueDetails = ref<any[]>([]);
  const noMixSeparateGlueDetails = ref<any[]>([]);
  const apiNoSeparateGlues = ref<any[]>([]);
  const apiSeparateGlues = ref<any[]>([]);
  const cancelledSeparateGlueDetails = ref<any[]>([]);
  const mixChemicals = ref<any[]>([]);
  const noMixChemicals = ref<any[]>([]);

  const hasMixChemicals = computed(() => mixChemicals.value.length > 0);
  const hasNoMixChemicals = computed(() => noMixChemicals.value.length > 0);
  const isNoMixGlue = computed(() => headerInfo.value.isNoMixGlue);

  const hasSeparateBeenSubmittedBefore = () =>
    separateGlueComplete.value
    || (headerInfo.value.isNoMixGlue && (noMixGlueSubmitLocked.value || separateGlueConfirm.value));

  const isCompleteButtonDisabled = computed(
    () => isCompleting.value
      || isNavigatingAway.value
      || isLoadingLine.value
      || (hasSeparateBeenSubmittedBefore() && !separateChangedSinceLastSubmit.value)
  );

  const markSeparateTableChanged = () => {
    separateChangedSinceLastSubmit.value = true;
  };

  const syncSeparateChangeTrackingAfterLoad = () => {
    separateChangedSinceLastSubmit.value = !hasSeparateBeenSubmittedBefore();
  };

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

    const mixApiForSeqMap = resolveMixApiItemsForSeqMap(respData, mixGlueMasterId.value);
    const mixApiSource = mixApiForSeqMap.length > 0
      ? mixApiForSeqMap
      : filterMixApiSeparateGlues(
        apiSeparateGlues.value.filter((item) => !isRecordStatusCancelled(item?.recordStatus)),
        mixGlueMasterId.value
      );

    let mappedMixRows = syncSeparateGlueRowGlueIds(mixRows, mixGlueMasterId.value);
    if (mappedMixRows.length > 0 && mixApiSource.length > 0) {
      mappedMixRows = mapMixSeparateRowsWithApiBySeq(mappedMixRows, mixApiSource);
    }

    const noMixGlueId = getNoMixGlueId();
    const noMixApiForSeqMap = resolveNoMixApiItemsForSeqMap(respData, noMixGlueId);
    const noMixApiSource = noMixApiForSeqMap.length > 0
      ? noMixApiForSeqMap
      : resolveNoMixApiFallbackForSeqMap(
        apiNoSeparateGlues.value,
        apiSeparateGlues.value,
        noMixGlueId
      );

    let mappedNoMixRows = noMixRows.map((row) => ({
      ...row,
      glueId: getNoMixGlueId() || row.glueId,
    }));
    if (mappedNoMixRows.length > 0 && noMixApiSource.length > 0) {
      mappedNoMixRows = mapNoMixSeparateRowsWithApiBySeq(mappedNoMixRows, noMixApiSource);
    }

    separateGlueDetails.value = mappedMixRows;
    noMixSeparateGlueDetails.value = mappedNoMixRows;
  };

  watch(separateGlueDetails, () => {
    if (!isLoadingLine.value) isDirty.value = true;
  }, { deep: true });

  watch(noMixSeparateGlueDetails, () => {
    if (!isLoadingLine.value) isDirty.value = true;
  }, { deep: true });

  const resetState = () => {
    isDirty.value = false;
    isNavigatingAway.value = false;
    isCompleting.value = false;
    separateGlueComplete.value = false;
    separateGlueConfirm.value = false;
    noMixGlueSubmitLocked.value = false;
    separateChangedSinceLastSubmit.value = true;
    apiSeparateGlues.value = [];
    cancelledSeparateGlueDetails.value = [];
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
    hourlyValidity.value = '0';
    mixGlueMasterId.value = '';
  };

  const buildDraftSnapshot = () => ({
    headerInfo: headerInfo.value,
    separateGlueDetails: separateGlueDetails.value,
    noMixSeparateGlueDetails: noMixSeparateGlueDetails.value,
    apiNoSeparateGlues: apiNoSeparateGlues.value,
    apiSeparateGlues: apiSeparateGlues.value,
    cancelledSeparateGlueDetails: cancelledSeparateGlueDetails.value,
    requestDetails: requestDetails.value,
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

  const syncApiSeparateGlues = (respData: any, draft?: any) => {
    if (Array.isArray(draft?.apiSeparateGlues) && draft.apiSeparateGlues.length > 0) {
      apiSeparateGlues.value = draft.apiSeparateGlues.map((item: any) => ({ ...item }));
      return;
    }

    apiSeparateGlues.value = Array.isArray(respData?.separateGlues)
      ? respData.separateGlues.map((item: any) => ({ ...item }))
      : [];
  };

  const restoreCancelledSeparateGlueDetailsFromDraft = (draft?: any) => {
    cancelledSeparateGlueDetails.value = Array.isArray(draft?.cancelledSeparateGlueDetails)
      ? draft.cancelledSeparateGlueDetails.map((item: any) => ({
        ...item,
        recordStatus: 'C',
      }))
      : [];
  };

  const clearCancelledSeparateGlueSubmitState = () => {
    cancelledSeparateGlueDetails.value = [];
    apiNoSeparateGlues.value = apiNoSeparateGlues.value.filter(
      (item) => !isRecordStatusCancelled(item?.recordStatus)
    );
    apiSeparateGlues.value = apiSeparateGlues.value.filter(
      (item) => !isRecordStatusCancelled(item?.recordStatus)
    );
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
    noMixComponents: [],
    isNoMixGlue: headerInfo.value.isNoMixGlue,
    apiNoSeparateGlues: apiNoSeparateGlues.value,
    apiSeparateGlues: apiSeparateGlues.value,
    cancelledSeparateGlueDetails: cancelledSeparateGlueDetails.value,
    totalNoMixGlueWeight: resolveNoMixGlueWeightDisplay(),
  });

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

  const blockIfNoChangesOnResubmit = (): boolean => {
    if (!hasSeparateBeenSubmittedBefore() || separateChangedSinceLastSubmit.value) {
      return false;
    }

    showToast({
      severity: 'info',
      summary: t('separateMixedGlue.toast.incomplete'),
      detail: t('separateMixedGlue.toast.separateNoChangesToSubmit'),
      life: 6000,
    });
    return true;
  };

  const restoreDraftBranch = async (id: string, existingDraft: any) => {
    restoreNoMixSubmitLockFromDraft(existingDraft);
    restoreCancelledSeparateGlueDetailsFromDraft(existingDraft);
    const factoryId = authStore.user?.factoryId || '';
    applyMixGlueMasterId({}, existingDraft.mixGlueMasterId, (v) => { mixGlueMasterId.value = v; });

    const { data } = await workOrder.getWorkOrder(factoryId, id, 3);
    if (!data?.success) {
      syncApiNoSeparateGlues({}, existingDraft);
      syncApiSeparateGlues({}, existingDraft);
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
    syncApiSeparateGlues(respData, existingDraft);
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

    showToast({ severity: 'info', summary: t('separateMixedGlue.toast.restore'), detail: t('separateMixedGlue.toast.restoreDetail'), life: 6000 });
  };

  const loadFreshBranch = async (id: string, existingDraft?: any) => {
    restoreNoMixSubmitLockFromDraft(existingDraft);
    restoreCancelledSeparateGlueDetailsFromDraft(existingDraft);
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
    syncApiSeparateGlues(respData, existingDraft);

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
  };

  const fetchWorkOrderDetail = async (id: string) => {
    const normalizedId = normalizeDraftWorkOrderId(id);
    if (!normalizedId) return;

    resetState();
    isLoadingLine.value = true;
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
      showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('separateMixedGlue.toast.loadFailed'), life: 6000 });
    } finally {
      isLoadingLine.value = false;
      await nextTick();
      isDirty.value = false;
      syncSeparateChangeTrackingAfterLoad();
    }
  };

  const isSeparateGlueRowFilled = (row: any) => getRowActiveBucketId(row) != null;

  /** isNoMixGlue: validate toàn bộ dòng bảng (thùng + khớp TL) giống keo trộn. */
  const shouldValidateNoMixSeparateRows = () => hasNoMixChemicals.value;

  const bucketListForValidation = ref<BucketOption[]>([]);

  /** Complete chỉ đọc cache từ Select — không gọi API bucket. */
  const getBucketListForCapacityCheck = (): BucketOption[] | null => {
    const list = getCachedBucketOptions(authStore.user?.factoryId || '');
    bucketListForValidation.value = list;
    return list.length > 0 ? list : null;
  };

  const validateBeforeComplete = async (): Promise<string | null> => {
    // Rule: không có row → không submit; có row → đủ bucket + đủ kg (cache từ Select)
    if (hasMixChemicals.value) {
      pruneStaleBucketIds(separateGlueDetails.value);

      if (separateGlueDetails.value.length === 0) {
        return t('separateMixedGlue.toast.mixAddRowRequired');
      }

      for (let i = 0; i < separateGlueDetails.value.length; i++) {
        if (!isSeparateGlueRowFilled(separateGlueDetails.value[i])) {
          return t('separateMixedGlue.toast.mixedGlueSelectBucket', { row: i + 1 });
        }
      }

      const bucketList = getBucketListForCapacityCheck();
      if (!bucketList) {
        return t('separateMixedGlue.toast.bucketListRequired');
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
      const rowsToValidate = noMixSeparateGlueDetails.value;

      if (rowsToValidate.length === 0) {
        return t('separateMixedGlue.toast.noMixAddRowRequired');
      }

      pruneStaleBucketIds(rowsToValidate);

      for (let i = 0; i < rowsToValidate.length; i++) {
        if (!isSeparateGlueRowFilled(rowsToValidate[i])) {
          return t('separateMixedGlue.toast.noMixSelectBucket', { row: i + 1 });
        }
      }

      const bucketList = getBucketListForCapacityCheck();
      if (!bucketList) {
        return t('separateMixedGlue.toast.bucketListRequired');
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

    return null;
  };

  const handleComplete = async () => {
    if (isCompleting.value || isNavigatingAway.value || isLoadingLine.value) return;

    isCompleting.value = true;
    try {
      if (blockIfNoChangesOnResubmit()) return;

      if (!(await requireOnline())) return;

      const validationError = await validateBeforeComplete();
      if (validationError) {
        showToast({
          severity: 'warn',
          summary: t('separateMixedGlue.toast.incomplete'),
          detail: validationError,
          life: 3000,
        });
        return;
      }

      const payload = buildSeparateGlueCommandPayload(getPayloadContext(), '1', { forComplete: true });

      await separateGlue.postSeparateGlueCommand(payload);

      stampSubmittedSeparateRowBuckets(separateGlueDetails.value);
      stampSubmittedSeparateRowBuckets(noMixSeparateGlueDetails.value);
      clearCancelledSeparateGlueSubmitState();
      separateChangedSinceLastSubmit.value = false;
      if (headerInfo.value.isNoMixGlue) {
        noMixGlueSubmitLocked.value = true;
        separateGlueConfirm.value = true;
      } else {
        separateGlueComplete.value = true;
      }

      const draftKey = normalizeDraftWorkOrderId(currentWorkOrderId.value);
      if (draftKey) {
        await draftStore.saveDraft(draftKey, buildDraftSnapshot());
      }

      isNavigatingAway.value = true;
      isDirty.value = false;
      showToast({ severity: 'success', summary: t('separateMixedGlue.toast.completeSuccess'), detail: t('separateMixedGlue.toast.completeSuccessDetail'), life: 3000 });
      await router.push('/list-separate-mixed-glue-management');
    } catch (error) {
      if (notifyOfflineFromError(error)) {
        return;
      }
      showToast({ severity: 'error', summary: t('listMixGlue.toast.error'), detail: t('separateMixedGlue.toast.completeFailed'), life: 6000 });
    } finally {
      if (!isNavigatingAway.value) {
        isCompleting.value = false;
      }
    }
  };

  const handleAddSeparateGlueRow = async () => {
    const newRow = normalizeNewMixSeparateAddRow(
      {
        ...createDefaultSeparateGlueRow(mixGlueMasterId.value),
        glueId: mixGlueMasterId.value,
        seq: getNextSeparateTableSeq(separateGlueDetails.value),
      },
      mixGlueMasterId.value
    );
    separateGlueDetails.value.push(newRow);
    markSeparateTableChanged();
    await saveDraftToStoreOnly();
  };

  const handleDeleteSeparateGlueRow = async (rowToDelete: any) => {
    let cancelled: any = null;
    if (shouldPersistCancelledSeparateRow(rowToDelete)) {
      cancelled = { ...rowToDelete, recordStatus: 'C' };
      cancelledSeparateGlueDetails.value = appendCancelledSeparateGlueDetail(
        cancelledSeparateGlueDetails.value,
        cancelled
      );
      apiSeparateGlues.value = markApiSeparateGlueCancelledByRow(
        apiSeparateGlues.value,
        rowToDelete
      );
    }

    separateGlueDetails.value = separateGlueDetails.value.filter(item => item !== rowToDelete);
    markSeparateTableChanged();
    await saveDraftToStoreOnly();
  };

  const handleMixSeparateBucketUpdate = async (payload?: SeparateBucketUpdatePayload) => {
    if (!payload?.row) return;

    applyInPlaceSeparateRowBucketUpdate(payload.row, payload.newBucketId);

    if (shouldPersistCancelledSeparateRow(payload.row)) {
      apiSeparateGlues.value = syncApiSeparateGlueBucketByRow(
        apiSeparateGlues.value,
        payload.row,
        payload.newBucketId
      );
    }

    markSeparateTableChanged();
    await saveDraftToStoreOnly();
  };

  const handleAddNoMixSeparateGlueRow = async () => {
    const newRow = normalizeNewNoMixSeparateAddRow(
      {
        ...createDefaultSeparateGlueRow(getNoMixGlueId()),
        glueId: getNoMixGlueId(),
        seq: getNextSeparateTableSeq(noMixSeparateGlueDetails.value),
      },
      getNoMixGlueId()
    );
    noMixSeparateGlueDetails.value.push(newRow);
    markSeparateTableChanged();
    await saveDraftToStoreOnly();
  };

  const handleNoMixSeparateBucketUpdate = async (payload?: SeparateBucketUpdatePayload) => {
    if (!payload?.row) return;

    applyInPlaceSeparateRowBucketUpdate(payload.row, payload.newBucketId);

    if (shouldPersistCancelledSeparateRow(payload.row)) {
      const synced = syncNoMixSeparateGlueBucketInApi(
        apiNoSeparateGlues.value,
        apiSeparateGlues.value,
        payload.row,
        payload.newBucketId
      );
      apiNoSeparateGlues.value = synced.apiNoSeparateGlues;
      apiSeparateGlues.value = synced.apiSeparateGlues;
    }

    markSeparateTableChanged();
    await saveDraftToStoreOnly();
  };

  const handleDeleteNoMixSeparateGlueRow = async (rowToDelete: any) => {
    let cancelled: any = null;
    if (shouldPersistCancelledSeparateRow(rowToDelete)) {
      cancelled = {
        ...rowToDelete,
        glueId: getNoMixGlueId() || rowToDelete.glueId,
        recordStatus: 'C',
      };
      const marked = markNoMixSeparateRowCancelledInApi(
        apiNoSeparateGlues.value,
        apiSeparateGlues.value,
        cancelled
      );
      apiNoSeparateGlues.value = marked.apiNoSeparateGlues;
      apiSeparateGlues.value = marked.apiSeparateGlues;

      cancelledSeparateGlueDetails.value = appendCancelledSeparateGlueDetail(
        cancelledSeparateGlueDetails.value,
        cancelled
      );
    }

    noMixSeparateGlueDetails.value = noMixSeparateGlueDetails.value.filter(item => item !== rowToDelete);
    markSeparateTableChanged();
    await saveDraftToStoreOnly();
  };

  const showExitDialog = ref(false);
  const isExitConfirming = ref(false);
  let exitResolve: ((ok: boolean) => void) | null = null;

  const alertExitPage = (): Promise<boolean> =>
    new Promise(resolve => {
      exitResolve = resolve;
      showExitDialog.value = true;
    });

  const settleExitDialog = (ok: boolean) => {
    showExitDialog.value = false;
    isExitConfirming.value = false;
    const resolve = exitResolve;
    exitResolve = null;
    resolve?.(ok);
  };

  const onExitStay = () => {
    settleExitDialog(false);
  };

  const onExitConfirm = async () => {
    if (isExitConfirming.value) return;
    isExitConfirming.value = true;

    if (!(await requireOnline())) {
      settleExitDialog(false);
      return;
    }

    // Navigate ngay, không chờ API — tránh delay
    isDirty.value = false;
    settleExitDialog(true);

    try {
      const payload = buildSeparateGlueExitPayload(getPayloadContext());
      await separateGlue.postSeparateGlueCommand(payload);
    } catch (error) {
      console.error(error);
    }
  };

  const onExitDialogHide = () => {
    if (exitResolve) {
      settleExitDialog(false);
    }
  };

  const navigateToSeparateList = () => {
    router.replace('/list-separate-mixed-glue-management');
  };

  const goBack = async () => {
    if (isDirty.value) {
      const canLeave = await alertExitPage();
      if (canLeave) navigateToSeparateList();
      return;
    }
    // Không có dirty data — lưu draft background, navigate ngay
    void persistDraftOnLeave();
    navigateToSeparateList();
  };

  useAppBackButton(10, () => {
    if (!isDirty.value) {
      void persistDraftOnLeave();
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

  usePageLifecycle({
    onEnter: () => {
      const workOrderMasterId = normalizeDraftWorkOrderId(route.query.workOrderMasterId as string);
      if (workOrderMasterId) {
        void fetchWorkOrderDetail(workOrderMasterId);
        return;
      }
      isLoadingLine.value = false;
    },
    onLeave: async () => {
      await persistDraftOnLeave();
      await draftStore.flushPersist();
    },
  });

  watch(
    () => normalizeDraftWorkOrderId(route.query.workOrderMasterId as string),
    (workOrderMasterId, prev) => {
      if (!workOrderMasterId || workOrderMasterId === prev) return;
      void fetchWorkOrderDetail(workOrderMasterId);
    },
  );

  return {
    headerInfo,
    totalWeightActualDisplay,
    mixSeparateTargetWeight,
    noMixSeparateTargetWeight,
    isLoadingLine,
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
    saveDraftToStoreOnly,
    handleAddSeparateGlueRow,
    handleDeleteSeparateGlueRow,
    handleMixSeparateBucketUpdate,
    handleAddNoMixSeparateGlueRow,
    handleNoMixSeparateBucketUpdate,
    handleDeleteNoMixSeparateGlueRow,
    handleComplete,
    isCompleting,
    isCompleteButtonDisabled,
    goBack,
    showExitDialog,
    isExitConfirming,
    onExitStay,
    onExitConfirm,
    onExitDialogHide,
  };
}
