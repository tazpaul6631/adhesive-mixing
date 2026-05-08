<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :style="{ width: '450px' }"
    header="Thêm thành phần" :modal="true" class="p-fluid">

    <div class="flex flex-column gap-4 pt-3">
      <div class="flex flex-column gap-2">
        <label for="name" class="font-bold text-900">Tên thành phần</label>
        <Select id="name" v-model="product.name" :options="materialsList" optionLabel="materialName"
          optionValue="materialName" placeholder="Chọn thành phần" class="w-full" :invalid="submitted && !product.name"
          :loading="isLoadingMaterials" @show="$emit('fetch-materials')" showClear />
        <small v-if="submitted && !product.name" class="text-red-500">
          Tên thành phần là bắt buộc.
        </small>
      </div>

      <div class="flex flex-column gap-2">
        <label for="percentage" class="font-bold text-900">Phần trăm (%)</label>
        <InputNumber id="percentage" v-model="product.percentage" suffix=" %"
          :invalid="submitted && product.percentage === null" class="w-full" />
        <small v-if="submitted && product.percentage === null" class="text-red-500">
          Vui lòng nhập phần trăm.
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

const product = ref<{ name?: string; percentage?: number | null }>({ name: '', percentage: null });
const submitted = ref(false);

// Reset form mỗi khi mở lại modal
watch(() => props.visible, (newVal) => {
  if (newVal) {
    product.value = { name: '', percentage: null };
    submitted.value = false;
  }
});

const hideDialog = () => {
  emit('update:visible', false);
};

const saveForm = () => {
  submitted.value = true;
  if (product.value.name?.trim() && product.value.percentage != null) {
    emit('save', { name: product.value.name, percentage: product.value.percentage });
    hideDialog();
  }
};
</script>