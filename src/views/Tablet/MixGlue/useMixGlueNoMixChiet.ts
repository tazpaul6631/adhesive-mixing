import { ref, watch, type Ref } from 'vue';
import { useAppToast } from '@/composables/useAppToast';
import dayjs from 'dayjs';

import format from '@/mixins/format';
import UI from '@/mixins/present';
import materialApi from '@/api/material';
import { useAuthStore } from '@/store/auth';
import { useAppLocale } from '@/composables/useAppLocale';
import {
  applyMixGlueMasterId,
  createDefaultSeparateGlueRow,
  mapNoMixChemicalsFull,
  normalizeRequestDetails,
} from '@/views/Tablet/Separate/separateMixedGlue.mappers';
import { isGramUnit, normalizeWeightUnit } from '@/utils/weightUnit';

type NoMixRow = Record<string, any>;

export function useMixGlueNoMixChiet(options: {
  headerInfo: Ref<{ totalWeight: string }>;
  mixGlueConfirm: Ref<boolean>;
  isLoadingComponent: Ref<boolean>;
  isNoMixGlue: Ref<boolean>;
  currentWorkOrderId: Ref<string>;
  noMixComponents: Ref<NoMixRow[]>;
  activeNoMixComponent: Ref<NoMixRow | null>;
  selectedItemNoMix: Ref<NoMixRow | null>;
  noMixMixingProcess: Ref<{ component: string; weight: string }>;
  saveDraftSnapshot: () => Promise<void>;
  completeNoMixGlue?: () => Promise<void>;
}) {
  const { showToast } = useAppToast();
  const { t } = useAppLocale(() => 'tablet');
  const authStore = useAuthStore();

  const requestDetails = ref<any[]>([]);
  const mixGlueMasterId = ref('');
  const noMixChemicalsFull = ref<NoMixRow[]>([]);
  const noMixProductDialog = ref(false);
  const noMixMaterialsList = ref<any[]>([]);
  const isLoadingNoMixMaterials = ref(false);
  const isViewMode = ref(false);
  const chietDialog = ref(false);
  const chietOrderDetails = ref<any[]>([]);
  const currentChietChemical = ref<NoMixRow | null>(null);
  const extraChietList = ref<any[]>([]);
  const chietPendingByMaterial = ref<Record<string, any[]>>({});

  const getOperatorInfo = () => ({
    name: authStore.user?.name || authStore.user?.employeeName || authStore.user?.employeeId || t('mixGlueManagement.unknownOperator'),
    id: authStore.user?.employeeId || '',
  });

  const normalizeNoMixGlueExtraFlags = (components: NoMixRow[], apiNoMixChemicals: NoMixRow[]) => {
    const preExistingCodes = new Set(
      (apiNoMixChemicals || []).map((item) => String(item.materialCode))
    );

    return (components || []).map((item) => ({
      ...item,
      glueExtra: preExistingCodes.has(String(item.materialCode)) ? false : true,
    }));
  };

  const isRowWeighed = (row: NoMixRow) =>
    !!row.actualWeight && Number(row.actualWeight) > 0;

  const blockIfLocked = () => {
    if (!options.mixGlueConfirm.value) return false;

    showToast({
      severity: 'warn',
      summary: t('separateMixedGlue.toast.locked'),
      detail: t('separateMixedGlue.toast.completeFirst'),
      life: 6000,
    });
    return true;
  };

  const applyNoMixFromWorkOrder = (respData: any, draft?: Record<string, any>) => {
    applyMixGlueMasterId(respData, draft?.mixGlueMasterId, (value) => {
      mixGlueMasterId.value = value;
    });
    requestDetails.value = draft?.requestDetails?.length
      ? draft.requestDetails
      : normalizeRequestDetails(respData);

    if (!noMixChemicalsFull.value.length) {
      noMixChemicalsFull.value = mapNoMixChemicalsFull(respData.mixChemicals || []);
    }

    if (!options.noMixComponents.value.length) {
      options.noMixComponents.value = normalizeNoMixGlueExtraFlags(
        mapNoMixChemicalsFull(respData.noMixChemicals || []),
        respData.noMixChemicals || []
      );
    } else {
      options.noMixComponents.value = normalizeNoMixGlueExtraFlags(
        options.noMixComponents.value,
        respData.noMixChemicals || []
      );
    }
  };

  const restoreNoMixDraft = (draft: Record<string, any>) => {
    noMixChemicalsFull.value = (draft.noMixChemicalsFull as NoMixRow[]) || [];
    if (Array.isArray(draft.noMixComponents)) {
      options.noMixComponents.value = draft.noMixComponents as NoMixRow[];
    }
    extraChietList.value = (draft.extraChietList as any[]) || [];
    chietPendingByMaterial.value = (draft.chietPendingByMaterial as Record<string, any[]>) || {};
    if (draft.requestDetails?.length) {
      requestDetails.value = draft.requestDetails;
    }
    applyMixGlueMasterId({}, draft.mixGlueMasterId, (value) => {
      mixGlueMasterId.value = value;
    });
  };

  const getNoMixDraftExtras = () => ({
    noMixChemicalsFull: noMixChemicalsFull.value,
    extraChietList: extraChietList.value,
    chietPendingByMaterial: chietPendingByMaterial.value,
    requestDetails: requestDetails.value,
    mixGlueMasterId: mixGlueMasterId.value,
  });

  const resetNoMixSection = () => {
    requestDetails.value = [];
    mixGlueMasterId.value = '';
    noMixChemicalsFull.value = [];
    noMixProductDialog.value = false;
    noMixMaterialsList.value = [];
    isViewMode.value = false;
    chietDialog.value = false;
    chietOrderDetails.value = [];
    currentChietChemical.value = null;
    extraChietList.value = [];
    chietPendingByMaterial.value = {};
  };

  const onNoMixRowClick = (event: { data: NoMixRow }) => {
    if (options.isLoadingComponent.value || !event.data?.materialName) return;

    const row = { ...event.data };
    if (!row.glueWeight && !row.glueExtra) {
      row.glueWeight = row.requiredWeight || options.headerInfo.value.totalWeight;
    }

    options.noMixMixingProcess.value.component = row.materialName;
    options.activeNoMixComponent.value = row;
    options.selectedItemNoMix.value = event.data;
    options.noMixMixingProcess.value.weight = '0.000';
  };

  const calcToleranceGrams = (weight: number, weightUnit: string) => {
    const weightInGrams = isGramUnit(weightUnit) ? weight : weight * 1000;
    return Number((weightInGrams * 0.05).toFixed(3));
  };

  const openNoMixComponentDialog = () => {
    if (blockIfLocked()) return;

    const unweighed = options.noMixComponents.value.find((item) => !isRowWeighed(item));
    if (unweighed) {
      showToast({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.notWeighed'),
        detail: t('separateMixedGlue.toast.weighBeforeAdd', { name: unweighed.materialName }),
        life: 6000,
      });
      return;
    }
    noMixProductDialog.value = true;
  };

  const fetchNoMixMaterials = async () => {
    isLoadingNoMixMaterials.value = true;
    try {
      const { data } = await materialApi.postMaterial({ factoryId: authStore.user?.factoryId || '' });
      if (data?.success) {
        const existingCodes = new Set(
          options.noMixComponents.value.map(item => String(item.materialCode))
        );
        noMixMaterialsList.value = (data.data || [])
          .filter((item: any) => !existingCodes.has(String(item.materialCode)))
          .map((item: any) => ({
            ...item,
            weightUnit: normalizeWeightUnit(item.weightUnit),
          }));
      }
    } catch {
      showToast({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: t('separateMixedGlue.toast.loadMaterialsFailed'),
        life: 6000,
      });
    } finally {
      isLoadingNoMixMaterials.value = false;
    }
  };

  const handleSaveNewNoMixComponent = async (newComponentData: {
    name: string;
    percentage: number | string;
    materialCode: string;
    weightUnit: string;
  }) => {
    if (blockIfLocked()) return;

    const enteredWeight = Number(newComponentData.percentage ?? 0);
    const weightUnit = normalizeWeightUnit(newComponentData.weightUnit);
    const toleranceGrams = calcToleranceGrams(enteredWeight, weightUnit);
    const weightStr = format.formatDisplayWeight(enteredWeight) || '0';

    const newComponent = {
      materialName: newComponentData.name,
      materialCode: newComponentData.materialCode,
      weightUnit,
      glueWeight: weightStr,
      requiredWeight: weightStr,
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
    options.noMixComponents.value.push(newComponent);
    options.selectedItemNoMix.value = newComponent;
    options.activeNoMixComponent.value = { ...newComponent };
    options.noMixMixingProcess.value.component = newComponent.materialName;
    options.noMixMixingProcess.value.weight = '0.000';

    await options.saveDraftSnapshot();
    showToast({
      severity: 'success',
      summary: t('separateMixedGlue.toast.addSuccess'),
      detail: t('separateMixedGlue.toast.addSuccessDetail'),
      life: 3000,
    });
  };

  const handleDeleteNoMixComponent = async (rowToDelete: NoMixRow) => {
    if (blockIfLocked()) return;

    await UI.Confirm(
      t('separateMixedGlue.confirmDelete.title'),
      t('separateMixedGlue.confirmDelete.componentLabel', { name: rowToDelete.materialName ?? '' }),
      t('separateMixedGlue.confirmDelete.message'),
      async () => {
        noMixChemicalsFull.value = noMixChemicalsFull.value.filter(
          item => item.materialCode !== rowToDelete.materialCode
        );
        options.noMixComponents.value = options.noMixComponents.value.filter(
          item => item.materialCode !== rowToDelete.materialCode
        );
        extraChietList.value = extraChietList.value.filter(
          item => item.glueId !== rowToDelete.materialCode
        );
        // await options.saveDraftSnapshot();
        showToast({
          severity: 'success',
          summary: t('separateMixedGlue.toast.deleteSuccess'),
          detail: t('separateMixedGlue.toast.deleteSuccessDetail'),
          life: 3000,
        });
      },
      undefined,
      'custom-error-alert'
    );
  };

  const createChietGlueRow = () => ({
    ...createDefaultSeparateGlueRow(mixGlueMasterId.value),
    chemicalId: currentChietChemical.value?.materialCode || '',
  });

  const mapExtraChietToRows = (savedData: any[], materialCode: string) =>
    savedData.map((item) => ({
      ...createDefaultSeparateGlueRow(mixGlueMasterId.value),
      chemicalId: materialCode,
      selectedRequestDetailIds: item.selectedRequestDetailIds ?? [],
      selectedBucketId: item.bucketId ?? null,
      operator: item.operator || '',
      operatorId: item.operatorId || '',
      confirmDate: item.confirmDate || null,
      confirmTime: item.confirmDate ? format.formatDate(item.confirmDate) : null,
    }));

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
    await options.saveDraftSnapshot();
  };

  watch(chietDialog, (visible, wasVisible) => {
    if (wasVisible && !visible) {
      persistCurrentChietPending();
      void options.saveDraftSnapshot();
    }
  });

  const handleAddChietRow = () => {
    chietOrderDetails.value.push(createChietGlueRow());
    void saveChietDraftToStoreOnly();
  };

  const handleDeleteChietRow = (rowToDelete: any) => {
    if (blockIfLocked()) return;
    chietOrderDetails.value = chietOrderDetails.value.filter(item => item !== rowToDelete);
    void saveChietDraftToStoreOnly();
  };

  const handleChietRow = async (rowData: NoMixRow) => {
    if (!isRowWeighed(rowData)) {
      showToast({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.notWeighed'),
        detail: t('separateMixedGlue.toast.weighBeforeChiet', { name: rowData.materialName || '' }),
        life: 6000,
      });
      return;
    }

    await options.saveDraftSnapshot();

    if (options.isNoMixGlue.value) {
      void options.completeNoMixGlue?.();
      return;
    }

    isViewMode.value = false;
    currentChietChemical.value = rowData;
    loadChietOrderDetails(String(rowData.materialCode), false);
    chietDialog.value = true;
  };

  const handleViewRow = (rowData: NoMixRow) => {
    isViewMode.value = true;
    currentChietChemical.value = rowData;
    loadChietOrderDetails(String(rowData.materialCode), true);
    chietDialog.value = true;
  };

  const confirmChiet = async () => {
    const targetCode = currentChietChemical.value?.materialCode;
    const sourceRow = options.noMixComponents.value.find(
      (item) => String(item.materialCode) === String(targetCode)
    );
    const keepGlueExtra = !!(sourceRow?.glueExtra ?? currentChietChemical.value?.glueExtra);

    extraChietList.value = extraChietList.value.filter(item => item.glueId !== targetCode);

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
      const index = options.noMixComponents.value.findIndex(
        (item) => String(item.materialCode) === String(targetCode)
      );
      if (index !== -1) {
        options.noMixComponents.value[index].isChietCompleted = true;
        options.noMixComponents.value[index].recordStatus = 'C';
        options.noMixComponents.value[index].bucketId = 0;
        options.noMixComponents.value[index].glueExtra = keepGlueExtra;
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
    await options.saveDraftSnapshot();
    showToast({
      severity: 'success',
      summary: t('separateMixedGlue.toast.chietSaved'),
      detail: t('separateMixedGlue.toast.chietSavedDetail'),
      life: 3000,
    });
    chietDialog.value = false;
  };

  const recalculateNoMixRequiredWeights = (baseActualWeight: number) => {
    const baseItem = options.noMixComponents.value[0];
    const baseMixingRatio = Number(baseItem?.mixingRatio || '100');
    if (baseActualWeight <= 0 || !baseItem) return;

    const baseUnit = baseItem.weightUnit?.toLowerCase() || 'kg';

    options.noMixComponents.value.forEach((item, i) => {
      if (i === 0 || item.glueExtra) return;

      const currentRatio = Number(item.mixingRatio || '0');
      let newRequiredWeight = (currentRatio * baseActualWeight) / baseMixingRatio;
      const currentUnit = item.weightUnit?.toLowerCase() || 'kg';

      if (baseUnit === 'kg' && currentUnit === 'g') newRequiredWeight *= 1000;
      else if (baseUnit === 'g' && currentUnit === 'kg') newRequiredWeight /= 1000;

      item.requiredWeight = newRequiredWeight.toFixed(3);
    });
  };

  const handleConfirmNoMixWeight = async (actualWeight: string) => {
    if (!options.activeNoMixComponent.value) return;

    const index = options.noMixComponents.value.findIndex(
      item => item.materialName === options.activeNoMixComponent.value?.materialName
    );
    if (index === -1) return;

    const now = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');
    const weighedMaterialName = options.noMixComponents.value[index].materialName;
    const operator = getOperatorInfo();

    options.noMixComponents.value[index].actualWeight = actualWeight;
    options.noMixComponents.value[index].operator = operator.name;
    options.noMixComponents.value[index].operatorId = operator.id;
    options.noMixComponents.value[index].weighingTime = now;
    options.noMixComponents.value[index].confirmDate = now;

    recalculateNoMixRequiredWeights(Number(options.noMixComponents.value[0].actualWeight || '0'));

    const nextIndex = options.noMixComponents.value.findIndex(item => !item.weighingTime);
    if (nextIndex !== -1) {
      const nextItem = options.noMixComponents.value[nextIndex];
      options.selectedItemNoMix.value = nextItem;
      options.activeNoMixComponent.value = { ...nextItem };
      options.noMixMixingProcess.value.component = nextItem.materialName || '';
      options.noMixMixingProcess.value.weight = '0.000';
    } else {
      options.activeNoMixComponent.value = { ...options.noMixComponents.value[index] };
      // showToast({
      //   severity: 'success',
      //   summary: t('separateMixedGlue.toast.weighingComplete'),
      //   detail: t('separateMixedGlue.toast.weighingCompleteDetail'),
      //   life: 6000,
      // });
    }

    const fullIndex = noMixChemicalsFull.value.findIndex(item => item.materialName === weighedMaterialName);
    if (fullIndex !== -1) {
      noMixChemicalsFull.value[fullIndex].actualWeight = actualWeight;
      noMixChemicalsFull.value[fullIndex].operator = operator.name;
      noMixChemicalsFull.value[fullIndex].operatorId = operator.id;
      noMixChemicalsFull.value[fullIndex].weighingTime = now;
      noMixChemicalsFull.value[fullIndex].confirmDate = now;
    }

    await options.saveDraftSnapshot();
  };

  return {
    requestDetails,
    mixGlueMasterId,
    extraChietList,
    noMixChemicalsFull,
    noMixProductDialog,
    noMixMaterialsList,
    isLoadingNoMixMaterials,
    isViewMode,
    chietDialog,
    chietOrderDetails,
    currentChietChemical,
    applyNoMixFromWorkOrder,
    restoreNoMixDraft,
    getNoMixDraftExtras,
    resetNoMixSection,
    onNoMixRowClick,
    openNoMixComponentDialog,
    fetchNoMixMaterials,
    handleSaveNewNoMixComponent,
    handleDeleteNoMixComponent,
    handleChietRow,
    handleViewRow,
    confirmChiet,
    handleAddChietRow,
    handleDeleteChietRow,
    saveChietDraftToStoreOnly,
    handleConfirmNoMixWeight,
    isRowWeighed,
  };
}
