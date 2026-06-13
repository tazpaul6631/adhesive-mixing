<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :style="{ width: '450px' }"
    :header="t('mixGlueManagement.addComponentDialog.title')" :modal="true" class="p-fluid">

    <div class="flex flex-column gap-4 pt-3">
      <div class="flex flex-column gap-2">
        <label for="name" class="font-bold text-900">{{ t('mixGlueManagement.addComponentDialog.nameLabel') }}</label>

        <Select id="name" v-model="selectedMaterial" :options="materialsList" optionLabel="materialName"
          :placeholder="t('mixGlueManagement.addComponentDialog.namePlaceholder')" class="w-full" filter
          :invalid="submitted && !selectedMaterial" :loading="isLoadingMaterials" @show="$emit('fetch-materials')"
          showClear />

        <small v-if="submitted && !selectedMaterial" class="text-red-500">
          {{ t('mixGlueManagement.addComponentDialog.nameRequired') }}
        </small>
      </div>

      <div class="flex flex-column gap-2">
        <label for="weight" class="font-bold text-900">{{ t('mixGlueManagement.addComponentDialog.weightLabel', {
          unit:
            weightUnitSuffix
        })
        }}</label>
        <InputNumber id="weight" v-model="weight" suffix=" Kg" :min="0" :invalid="submitted && weight === null"
          class="w-full" />
        <small v-if="submitted && weight === null" class="text-red-500">
          {{ t('mixGlueManagement.addComponentDialog.weightRequired', { unit: weightUnitSuffix }) }}
        </small>
      </div>

      <div class="flex flex-column gap-2">
        <label for="toleranceGrams" class="font-bold text-900">
          {{ t('mixGlueManagement.addComponentDialog.toleranceGramsLabel') }}
        </label>
        <InputNumber id="toleranceGrams" v-model="toleranceGrams" suffix=" g" :min="0"
          :invalid="submitted && (toleranceGrams === null || toleranceGrams <= 0)" class="w-full" />
        <small v-if="submitted && (toleranceGrams === null || toleranceGrams <= 0)" class="text-red-500">
          {{ t('mixGlueManagement.addComponentDialog.toleranceGramsRequired') }}
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
const weight = ref<number | null>(null);
const submitted = ref(false);
const toleranceGrams = ref<number | null>(null);

const selectedWeightUnit = computed(() => selectedMaterial.value?.weightUnit || 'Kg');
const weightUnitSuffix = computed(() => ` ${selectedWeightUnit.value}`);

watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedMaterial.value = null;
    weight.value = null;
    toleranceGrams.value = null;
    submitted.value = false;
  }
});

const hideDialog = () => {
  emit('update:visible', false);
};

const saveForm = () => {
  submitted.value = true;
  const grams = Number(toleranceGrams.value);
  if (selectedMaterial.value && weight.value != null && grams > 0) {
    emit('save', {
      name: selectedMaterial.value.materialName,
      percentage: weight.value,
      materialCode: selectedMaterial.value.materialCode,
      weightUnit: 'Kg',
      toleranceGrams: grams,
    });
    hideDialog();
  }
};
</script>
