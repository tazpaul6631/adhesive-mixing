import { ref, type Ref } from 'vue';
import { useAppToast } from '@/composables/useAppToast';
import dayjs from 'dayjs';

import UI from '@/mixins/present';
import { useAuthStore } from '@/store/auth';
import { useAppLocale } from '@/composables/useAppLocale';
import {
  applyMixGlueMasterId,
  mapNoMixChemicalsFull,
  normalizeRequestDetails,
} from '@/views/Tablet/Separate/separateMixedGlue.mappers';

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
  isCompleting: Ref<boolean>;
  isNavigatingAway: Ref<boolean>;
  saveDraftSnapshot: () => Promise<void>;
  completeNoMixGlue?: () => Promise<void>;
}) {
  const { showToast } = useAppToast();
  const { t } = useAppLocale(() => 'tablet');
  const authStore = useAuthStore();

  const requestDetails = ref<any[]>([]);
  const mixGlueMasterId = ref('');
  const noMixChemicalsFull = ref<NoMixRow[]>([]);
  /** Khóa sớm trước await saveDraft — tránh spam nút Chiết (gọi BE complete). */
  const isChietPending = ref(false);

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
    if (draft.requestDetails?.length) {
      requestDetails.value = draft.requestDetails;
    }
    applyMixGlueMasterId({}, draft.mixGlueMasterId, (value) => {
      mixGlueMasterId.value = value;
    });
  };

  const getNoMixDraftExtras = () => ({
    noMixChemicalsFull: noMixChemicalsFull.value,
    requestDetails: requestDetails.value,
    mixGlueMasterId: mixGlueMasterId.value,
  });

  const resetNoMixSection = () => {
    requestDetails.value = [];
    mixGlueMasterId.value = '';
    noMixChemicalsFull.value = [];
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

  const handleChietRow = async (rowData: NoMixRow) => {
    if (
      isChietPending.value
      || options.isCompleting.value
      || options.isNavigatingAway.value
    ) {
      return;
    }

    if (!isRowWeighed(rowData)) {
      showToast({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.notWeighed'),
        detail: t('separateMixedGlue.toast.weighBeforeChiet', { name: rowData.materialName || '' }),
        life: 6000,
      });
      return;
    }

    isChietPending.value = true;
    try {
      await options.saveDraftSnapshot();
      await options.completeNoMixGlue?.();
    } finally {
      isChietPending.value = false;
    }
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
    noMixChemicalsFull,
    applyNoMixFromWorkOrder,
    restoreNoMixDraft,
    getNoMixDraftExtras,
    resetNoMixSection,
    onNoMixRowClick,
    handleDeleteNoMixComponent,
    handleChietRow,
    handleConfirmNoMixWeight,
    isRowWeighed,
    isChietPending,
  };
}
