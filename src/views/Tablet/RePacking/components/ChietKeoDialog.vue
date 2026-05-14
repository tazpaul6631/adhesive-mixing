<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" header="Chiết keo theo thùng" modal
        :style="{ width: '98vw' }">
        <div class="mb-4">
            <span class="text-700 font-medium">Đang chiết keo: </span>
            <span class="font-bold text-blue-600 text-lg">{{ chemical?.materialName }}</span>
        </div>

        <RepackingGlue :is-loading="false" :order-details="orderDetails" @update-bucket="$emit('update-bucket')" />

        <template #footer>
            <Button label="Hủy" icon="pi pi-times" text @click="$emit('update:visible', false)" />
            <Button label="Xác nhận" icon="pi pi-check" severity="success" @click="$emit('confirm')" />
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import RepackingGlue from '@/views/Tablet/RePacking/components/RepackingGlue.vue';

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
}>();

defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'update-bucket'): void;
    (e: 'confirm'): void;
}>();
</script>