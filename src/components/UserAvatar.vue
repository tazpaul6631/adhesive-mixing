<template>
  <div class="flex align-items-center gap-3">
    <div class="w-3rem h-3rem flex align-items-center justify-content-center bg-blue-100 border-circle">
      <i class="pi pi-user text-blue-600 text-xl"></i>
    </div>

    <span class="font-bold text-lg text-700">
      {{ authStore.user?.employeeName || 'Chưa xác định' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/store/auth';

// Khởi tạo store
const authStore = useAuthStore();
</script>

<style scoped></style>