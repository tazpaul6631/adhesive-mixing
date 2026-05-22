import { ref, computed, watch, nextTick } from 'vue';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import { onIonViewDidEnter, onIonViewWillEnter, onIonViewWillLeave, useBackButton, alertController } from '@ionic/vue';
import { useToast } from 'primevue/usetoast';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import UI from '@/mixins/present';
import format from '@/mixins/format';
import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore, isSeparateDraftRestorable } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import materialApi from '@/api/material';
import separateGlue from '@/api/separate';
import bucketApi from '@/api/bucket';
import { validateSeparateGlueAllocation, type BucketOption } from './separateGlue.bucket';
import { toastMsg } from '@/utils/toastFormat';

import type { HeaderInfo, MixingProcess, NewComponentFormData, PayloadBuildContext } from './separateMixedGlue.types';
import {
  applyMixGlueMasterId,
  createDefaultSeparateGlueRow,
  mapNoMixChemicalsFull,
  normalizeRequestDetails,
  resolveSeparateGlueDetails,
  syncSeparateGlueRowGlueIds,
} from './separateMixedGlue.mappers';
import { buildSeparateGlueCommandPayload, buildSeparateGlueExitPayload } from './separateMixedGlue.payload';
import { useScaleManager } from '@/composables/useScaleManager';

dayjs.extend(customParseFormat);

export function useSeparateMixedGlueManagement() {
  const toast = useToast();
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

  const headerInfo = ref<HeaderInfo>({ orderNo: '', glue: '', totalWeight: '' });
  const isLoadingLine = ref(true);
  const isLoadingComponent = ref(true);

  // --- Tab keo trộn (bảng 1) ---
  const orderDetails = ref<any[]>([]);
  const requestDetails = ref<any[]>([]);
  const separateGlueDetails = ref<any[]>([]);
  const mixChemicals = ref<any[]>([]);

  const mixedGlueTableDetails = computed(() => (
    mixChemicals.value.length > 0 ? separateGlueDetails.value : []
  ));

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

  watch(noMixChemicalsFull, () => {
    if (!isLoadingComponent.value) isDirty.value = true;
  }, { deep: true });

  watch(noMixComponents, () => {
    if (!isLoadingComponent.value) isDirty.value = true;
  }, { deep: true });

  const resetState = () => {
    isDirty.value = false;
    isNavigatingAway.value = false;
    startDate.value = '';
    endDate.value = '';
    headerInfo.value = { orderNo: '', glue: '', totalWeight: '' };
    orderDetails.value = [];
    requestDetails.value = [];
    separateGlueDetails.value = [];
    mixChemicals.value = [];
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
    requestDetails: requestDetails.value,
    extraChietList: extraChietList.value,
    chietPendingByMaterial: chietPendingByMaterial.value,
    mixGlueMasterId: mixGlueMasterId.value,
  });

  const saveDraftToStoreOnly = async () => {
    if (isNavigatingAway.value) return;
    await draftStore.saveDraft(currentWorkOrderId.value, buildDraftSnapshot());
  };

  const getPayloadContext = (): PayloadBuildContext => ({
    factoryId: authStore.user?.factoryId || '',
    employeeId: authStore.user?.employeeId || '',
    workOrderMasterId: currentWorkOrderId.value,
    startDate: startDate.value,
    endDate: endDate.value,
    mixGlueMasterId: mixGlueMasterId.value,
    mixChemicals: mixChemicals.value,
    separateGlueDetails: separateGlueDetails.value,
    extraChietList: extraChietList.value,
    noMixComponents: noMixComponents.value,
  });

  const getOperatorInfo = () => ({
    name: authStore.user?.name || authStore.user?.employeeName || authStore.user?.employeeId || 'Chưa xác định',
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

  const restoreDraftBranch = async (id: string, existingDraft: any) => {
    headerInfo.value = existingDraft.headerInfo as HeaderInfo;
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

    const { data } = await workOrder.getWorkOrder(id, 3);
    if (!data?.success) return;

    const respData = data.data;
    startDate.value = respData.startDate || new Date().toISOString();
    endDate.value = respData.endDate || new Date().toISOString();
    hourlyValidity.value = respData.hourlyValidity || '0';
    applyMixGlueMasterId(respData, existingDraft.mixGlueMasterId, (v) => { mixGlueMasterId.value = v; });
    mixChemicals.value = respData.mixChemicals || [];
    orderDetails.value = respData.orderDetails || [];
    requestDetails.value = existingDraft.requestDetails?.length
      ? existingDraft.requestDetails
      : normalizeRequestDetails(respData);
    separateGlueDetails.value = resolveSeparateGlueDetails(existingDraft, respData, mixGlueMasterId.value);
    separateGlueDetails.value = syncSeparateGlueRowGlueIds(separateGlueDetails.value, mixGlueMasterId.value);

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

    toast.add({ severity: 'info', summary: 'Khôi phục', detail: 'Đã tải lại dữ liệu đã lưu', life: 3000 });
  };

  const loadFreshBranch = async (id: string) => {
    const { data } = await workOrder.getWorkOrder(id, 3);
    if (!data?.success) return;

    const respData = data.data;
    startDate.value = respData.startDate || new Date().toISOString();
    endDate.value = respData.endDate || new Date().toISOString();
    hourlyValidity.value = respData.hourlyValidity || '0';
    applyMixGlueMasterId(respData, undefined, (v) => { mixGlueMasterId.value = v; });

    headerInfo.value = {
      orderNo: respData.workOrderMasterName || '',
      glue: respData.chemicalMasterName || '',
      totalWeight: respData.workOrderWeight?.toString() || '',
    };

    mixChemicals.value = respData.mixChemicals || [];
    orderDetails.value = respData.orderDetails || [];
    requestDetails.value = normalizeRequestDetails(respData);
    separateGlueDetails.value = resolveSeparateGlueDetails(null, respData, mixGlueMasterId.value);
    separateGlueDetails.value = syncSeparateGlueRowGlueIds(separateGlueDetails.value, mixGlueMasterId.value);

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
    resetState();
    isLoadingLine.value = true;
    isLoadingComponent.value = true;
    currentWorkOrderId.value = id;

    try {
      await draftStore.ensureHydrated();
      const existingDraft = draftStore.getDraft(id);

      if (isSeparateDraftRestorable(existingDraft)) {
        await restoreDraftBranch(id, existingDraft);
      } else {
        await loadFreshBranch(id);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu chi tiết:', error);
      toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu đơn hàng', life: 3000 });
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
    const hasRequest =
      (Array.isArray(row.selectedRequestDetailIds) && row.selectedRequestDetailIds.length > 0)
      || (Array.isArray(row.requestDetailIds) && row.requestDetailIds.length > 0);
    const hasBucket = !!row.selectedBucketId || !!row.bucketId;
    return hasRequest && hasBucket;
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
    for (let i = 0; i < separateGlueDetails.value.length; i++) {
      if (!isSeparateGlueRowFilled(separateGlueDetails.value[i])) {
        return toastMsg`Keo trộn ở dòng ${i + 1}: vui lòng chọn đơn yêu cầu và thùng chứa.`;
      }
    }

    const bucketList = await ensureBucketListForValidation();
    const tab1AllocationError = validateSeparateGlueAllocation(
      separateGlueDetails.value,
      requestDetails.value,
      bucketList,
      headerInfo.value.totalWeight,
      'Kg'
    );
    if (tab1AllocationError) {
      return `Keo trộn: ${tab1AllocationError}`;
    }

    const unweighed = noMixComponents.value.find((item) => !isRowWeighed(item));
    if (unweighed) {
      return toastMsg`Keo không trộn ${unweighed.materialName}: vui lòng cân trước khi hoàn thành.`;
    }

    const hasPendingChiet = Object.values(chietPendingByMaterial.value).some(
      (rows) => Array.isArray(rows) && rows.length > 0
    );
    if (hasPendingChiet) {
      return 'Còn thông tin chiết thùng chưa xác nhận. Vui lòng hoàn tất modal chiết.';
    }

    for (const row of noMixComponents.value) {
      if (!row.isChietCompleted) continue;

      const extras = extraChietList.value.filter(
        (item) => String(item.glueId) === String(row.materialCode)
      );
      for (let i = 0; i < extras.length; i++) {
        if (!isSeparateGlueRowFilled(extras[i])) {
          return toastMsg`Keo ${row.materialName} ở dòng chiết thùng ${i + 1}: vui lòng chọn đơn yêu cầu và thùng chứa.`;
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
        return toastMsg`Keo ${row.materialName} chiết thùng: ` + (chietAllocationError || '');
      }
    }

    return null;
  };

  const handleComplete = async () => {
    const validationError = await validateBeforeComplete();
    if (validationError) {
      toast.add({
        severity: 'warn',
        summary: 'Chưa hoàn thành',
        detail: validationError,
        life: 6000,
      });
      return;
    }

    try {
      const payload = buildSeparateGlueCommandPayload(getPayloadContext(), '1', { forComplete: true });
      await separateGlue.postSeparateGlueCommand(payload);
      console.log(payload);

      isNavigatingAway.value = true;
      await draftStore.clearDraft(currentWorkOrderId.value);
      isDirty.value = false;
      toast.add({ severity: 'success', summary: 'Hoàn thành', detail: 'Đã gửi dữ liệu thành công', life: 3000 });
      router.push('/list-separate-mixed-glue-management');
    } catch {
      toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xác nhận hoàn thành', life: 3000 });
    }
  };

  const onSegmentIonChange = (event: CustomEvent) => {
    const v = (event.detail as { value?: string })?.value;
    if (v) selectedTab.value = v;
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
      toast.add({ severity: 'success', summary: 'Hoàn tất', detail: 'Đã cân xong tất cả các thành phần.', life: 4000 });
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

  const handleConnectionStatus = (status: boolean) => {
    console.log(status ? 'Cân đã kết nối!' : 'Mất kết nối với cân!');
  };

  const calcToleranceGrams = (weight: number, weightUnit: string) => {
    const unit = weightUnit.toLowerCase();
    const weightInGrams = unit === 'kg' ? weight * 1000 : weight;
    return Number((weightInGrams * 0.05).toFixed(3));
  };

  const handleSaveNewComponent = async (newComponentData: NewComponentFormData) => {
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
    toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã thêm thành phần mới', life: 3000 });
  };

  const handleDeleteComponent = async (rowToDelete: any) => {
    await UI.Confirm(
      'Xác nhận xóa',
      `Thành phần: ${rowToDelete.materialName}`,
      'Bạn có chắc chắn muốn xóa thành phần này?',
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
        toast.add({ severity: 'success', summary: 'Đã xóa', detail: 'Xóa thành phần thành công', life: 3000 });
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
      toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải thành phần', life: 3000 });
    } finally {
      isLoadingMaterials.value = false;
    }
  };

  const openNewComponentDialog = () => {
    const unweighed = noMixComponents.value.find((item) => !isRowWeighed(item));
    if (unweighed) {
      toast.add({
        severity: 'warn',
        summary: 'Chưa cân',
        detail: toastMsg`Vui lòng cân keo ${unweighed.materialName} trước khi thêm thành phần mới.`,
        life: 4000,
      });
      return;
    }
    productDialog.value = true;
  };

  const handleAddSeparateGlueRow = async () => {
    separateGlueDetails.value.push({
      ...createDefaultSeparateGlueRow(mixGlueMasterId.value),
      glueId: mixGlueMasterId.value,
    });
    await saveDraftToStoreOnly();
  };

  const handleDeleteSeparateGlueRow = async (rowToDelete: any) => {
    separateGlueDetails.value = separateGlueDetails.value.filter(item => item !== rowToDelete);
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
    chietOrderDetails.value = chietOrderDetails.value.filter(item => item !== rowToDelete);
    void saveChietDraftToStoreOnly();
  };

  const handleChietRow = (rowData: any) => {
    if (!isRowWeighed(rowData)) {
      toast.add({
        severity: 'warn',
        summary: 'Chưa cân',
        detail: toastMsg`Vui lòng cân keo ${rowData.materialName || ''} trước khi chiết thùng.`,
        life: 4000,
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
          glueId: item.chemicalId || '',
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
      const index = noMixComponents.value.findIndex(item => item.materialCode === targetCode);
      if (index !== -1) {
        noMixComponents.value[index].isChietCompleted = true;
        noMixComponents.value[index].recordStatus = 'C';
        noMixComponents.value[index].bucketId = 0;
        noMixComponents.value[index].glueExtra = keepGlueExtra;
      }

      const fullIndex = noMixChemicalsFull.value.findIndex(item => item.materialCode === targetCode);
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
    toast.add({ severity: 'success', summary: 'Đã lưu chiết', detail: 'Thông tin chiết thùng được tạm lưu', life: 3000 });
    chietDialog.value = false;
  };

  const alertExitPage = (): Promise<boolean> =>
    new Promise(resolve => {
      void (async () => {
        const alert = await alertController.create({
          header: 'Cảnh báo chưa lưu',
          message: 'Bạn có chắc chắn thoát không?',
          buttons: [
            { text: 'Ở lại', role: 'cancel', handler: () => resolve(false) },
            {
              text: 'Thoát',
              role: 'confirm',
              cssClass: 'text-red-500',
              handler: () => {
                void (async () => {
                  try {
                    const payload = buildSeparateGlueExitPayload(getPayloadContext());
                    await separateGlue.postSeparateGlueCommand(payload);
                    // await draftStore.clearDraft(currentWorkOrderId.value);
                    isDirty.value = false;
                    resolve(true);
                  } catch (error) {
                    console.error(error);
                    toast.add({
                      severity: 'error',
                      summary: 'Lỗi',
                      detail: 'Không thể gửi lưu tiến độ (C) lên server.',
                      life: 3500,
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

  const goBack = async () => {
    if (isDirty.value) {
      const canLeave = await alertExitPage();
      if (canLeave) router.back();
      return;
    }
    router.back();
  };

  useBackButton(10, processNextHandler => {
    if (!isDirty.value) {
      processNextHandler();
      return;
    }
    void alertExitPage().then(ok => {
      if (ok) processNextHandler();
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
  });

  onIonViewWillEnter(() => {
    selectedTab.value = 'table1';
    const workOrderMasterId = route.query.workOrderMasterId as string;
    if (workOrderMasterId) {
      void fetchWorkOrderDetail(workOrderMasterId);
      return;
    }
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
  });

  return {
    headerInfo,
    selectedTab,
    isLoadingLine,
    isLoadingComponent,
    mixedGlueTableDetails,
    requestDetails,
    mixingProcess,
    activeComponent,
    noMixComponents,
    selectedItem,
    productDialog,
    materialsList,
    isLoadingMaterials,
    chietDialog,
    chietOrderDetails,
    currentChietChemical,
    isViewMode,
    onSegmentIonChange,
    saveDraftToStoreOnly,
    saveChietDraftToStoreOnly,
    handleAddSeparateGlueRow,
    handleDeleteSeparateGlueRow,
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
