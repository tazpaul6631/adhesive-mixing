<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :style="{ width: '450px' }"
    :header="t('separateMixedGlue.addComponentDialog.title')" :modal="true" class="p-fluid">

    <div class="flex flex-column gap-4 pt-3">
      <div class="flex flex-column gap-2">
        <label for="name" class="font-bold text-900">{{ t('separateMixedGlue.addComponentDialog.nameLabel') }}</label>
        <Select id="name" v-model="selectedMaterial" :options="materialsList" optionLabel="materialName"
          :placeholder="t('separateMixedGlue.addComponentDialog.namePlaceholder')" class="w-full"
          :invalid="submitted && !selectedMaterial" :loading="isLoadingMaterials" @show="$emit('fetch-materials')"
          showClear />
        <small v-if="submitted && !selectedMaterial" class="text-red-500">
          {{ t('separateMixedGlue.addComponentDialog.nameRequired') }}
        </small>
      </div>

      <div class="flex flex-column gap-2">
        <label for="percentage" class="font-bold text-900">{{ t('separateMixedGlue.addComponentDialog.weightLabel') }}</label>
        <InputNumber id="percentage" v-model="percentage" :suffix="weightUnitSuffix"
          :invalid="submitted && percentage === null" class="w-full" />
        <small v-if="submitted && percentage === null" class="text-red-500">
          {{ t('separateMixedGlue.addComponentDialog.weightRequired', { unit: selectedWeightUnit }) }}
        </small>
      </div>
    </div>

    <template #footer>
      <Button :label="t('common.cancel')" icon="pi pi-times" text severity="secondary" @click="hideDialog" />
      <Button :label="t('common.save')" icon="pi pi-check" @click="saveForm" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useAppLocale } from '@/composables/useAppLocale';

const props = defineProps<{
  visible: boolean;
  materialsList: any[];
  isLoadingMaterials: boolean;
}>();

const emit = defineEmits(['update:visible', 'save', 'fetch-materials']);

const { t } = useAppLocale(() => 'tablet');

const selectedMaterial = ref<any>(null);
const percentage = ref<number | null>(null);
const submitted = ref(false);

const selectedWeightUnit = computed(() => selectedMaterial.value?.weightUnit || 'Kg');
const weightUnitSuffix = computed(() => ` ${selectedWeightUnit.value}`);

watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedMaterial.value = null;
    percentage.value = null;
    submitted.value = false;
  }
});

const hideDialog = () => {
  emit('update:visible', false);
};

const saveForm = () => {
  submitted.value = true;
  if (selectedMaterial.value && percentage.value != null) {
    emit('save', {
      name: selectedMaterial.value.materialName,
      percentage: percentage.value,
      materialCode: selectedMaterial.value.materialCode,
      weightUnit: selectedWeightUnit.value
    });
    hideDialog();
  }
};
</script>
