<template>
  <div v-if="isTablet && chips.length" class="role-chips" aria-label="roles">
    <span v-for="chip in chips" :key="chip.key" class="role-chip" :class="chip.className">
      {{ chip.label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useAppLocale } from '@/composables/useAppLocale';

const authStore = useAuthStore();
const isTablet = ref(window.innerWidth >= 768);
const { t, syncLocaleForDevice } = useAppLocale(() => (isTablet.value ? 'tablet' : 'mobile'));

const chips = computed(() => {
  if (!isTablet.value) return [];

  const next: Array<{ key: string; label: string; className: string }> = [];
  if (authStore.user?.isQip) {
    next.push({ key: 'qip', label: t('appMenu.roleChips.qip'), className: 'role-chip--qip' });
  }
  if (authStore.user?.isMixGlueRoom) {
    next.push({
      key: 'mixGlueRoom',
      label: t('appMenu.roleChips.mixGlueRoom'),
      className: 'role-chip--room',
    });
  }
  if (authStore.user?.isMixGluePhone) {
    next.push({
      key: 'mixGluePhone',
      label: t('appMenu.roleChips.mixGluePhone'),
      className: 'role-chip--phone',
    });
  }
  return next;
});

const onResize = () => {
  const nextTablet = window.innerWidth >= 768;
  if (nextTablet !== isTablet.value) {
    isTablet.value = nextTablet;
    void syncLocaleForDevice();
  }
};

onMounted(() => {
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<style scoped>
.role-chips {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.role-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
}

.role-chip--qip {
  color: #cf8618;
  background: #f1e866;
}

.role-chip--room {
  color: #1d4ed8;
  background: #dbeafe;
}

.role-chip--phone {
  color: #51a107;
  background: #e4fec7;
}
</style>
