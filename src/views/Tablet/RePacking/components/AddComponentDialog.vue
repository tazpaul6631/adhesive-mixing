<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :style="{ width: '450px' }"
    header="Thêm thành phần" :modal="true" class="p-fluid">

    <div class="flex flex-column gap-4 pt-3">
      <div class="flex flex-column gap-2">
        <label for="name" class="font-bold text-900">Tên thành phần</label>
        <Select id="name" v-model="selectedMaterial" :options="materialsList" optionLabel="materialName"
          placeholder="Chọn thành phần" class="w-full" :invalid="submitted && !selectedMaterial"
          :loading="isLoadingMaterials" @show="$emit('fetch-materials')" showClear />
        <small v-if="submitted && !selectedMaterial" class="text-red-500">
          Tên thành phần là bắt buộc.
        </small>
      </div>

      <div class="flex flex-column gap-2">
        <label for="percentage" class="font-bold text-900">Trọng lượng thực tế</label>
        <InputNumber id="percentage" v-model="percentage" :invalid="submitted && percentage === null" class="w-full" />
        <small v-if="submitted && percentage === null" class="text-red-500">
          Vui lòng nhập số (KG)
        </small>
      </div>
    </div>

    <template #footer>
      <Button label="Hủy" icon="pi pi-times" text severity="secondary" @click="hideDialog" />
      <Button label="Lưu" icon="pi pi-check" @click="saveForm" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  materialsList: any[];
  isLoadingMaterials: boolean;
}>();

const emit = defineEmits(['update:visible', 'save', 'fetch-materials']);

const selectedMaterial = ref<any>(null);
const percentage = ref<number | null>(null);
const submitted = ref(false);

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
      weightUnit: selectedMaterial.value.weightUnit || 'Kg'
    });
    hideDialog();
  }
};
</script>