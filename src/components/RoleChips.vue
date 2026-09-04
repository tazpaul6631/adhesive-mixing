<template>
  <div v-if="chips.length" class="role-chips" :class="isTablet ? 'role-chips--tablet' : 'role-chips--mobile'"
    aria-label="roles">
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
  const chipLabel = (key: 'qip' | 'mixGlueRoom' | 'mixGluePhone') =>
    isTablet.value ? t(`appMenu.roleChips.${key}`) : t(`mobile.appMenu.roleChips.${key}`);

  const next: Array<{ key: string; label: string; className: string }> = [];
  if (authStore.user?.isQip) {
    next.push({ key: 'qip', label: chipLabel('qip'), className: 'role-chip--qip' });
  }
  if (authStore.user?.isMixGlueRoom) {
    next.push({
      key: 'mixGlueRoom',
      label: chipLabel('mixGlueRoom'),
      className: 'role-chip--room',
    });
  }
  if (authStore.user?.isMixGluePhone) {
    next.push({
      key: 'mixGluePhone',
      label: chipLabel('mixGluePhone'),
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
  gap: 4px;
  max-width: min(52vw, 16rem);
}

.role-chips--tablet {
  gap: 6px;
  max-width: none;
}

.role-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
}

.role-chips--mobile .role-chip {
  padding: 2px 7px;
  font-size: 0.65rem;
}

.role-chips--tablet .role-chip {
  padding: 4px 10px;
  font-size: 0.75rem;
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
