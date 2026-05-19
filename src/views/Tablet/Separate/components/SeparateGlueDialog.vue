<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" header="Chiết keo theo thùng" modal
    :style="{ width: '98vw' }">
    <div>
      <span class="text-700 font-medium">Đang chiết keo: </span>
      <span class="font-bold text-blue-600 text-lg">{{ chemical?.materialName }}</span>
    </div>

    <SeparateGlue :is-loading="false" :order-details="orderDetails" :is-view-mode="isViewMode"
      @update-bucket="$emit('update-bucket')" />

    <template #footer>
      <Button label="Đóng" icon="pi pi-times" text @click="$emit('update:visible', false)" />
      <Button v-if="!isViewMode" label="Xác nhận" icon="pi pi-check" severity="success" @click="$emit('confirm')" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import SeparateGlue from '@/views/Tablet/Separate/components/SeparateGlue.vue';

interface OrderDetails {
  workOrderDetailId?: string;
  factoryName?: string;
  workOrderMasterName?: string;
  requestDetailName?: string;
  styleName?: string;
  requestTime?: string;
  operator?: string;
  selectedBucketId?: any;
  chemicalId?: string;
}

interface ChemicalComponent {
  materialCode?: string;
  materialName?: string;
}

defineProps<{
  visible: boolean;
  chemical: ChemicalComponent | null;
  orderDetails: OrderDetails[];
  isViewMode?: boolean;
}>();

defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update-bucket'): void;
  (e: 'confirm'): void;
}>();
</script>