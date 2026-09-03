<template>
  <Teleport to="body">
    <div v-if="isOpen" class="offline-loading-overlay">
      <div class="offline-loading-panel">
        <i class="pi pi-spin pi-spinner offline-loading-spinner" aria-hidden="true"></i>
        <p class="offline-loading-title">{{ title }}</p>
        <p v-if="note" class="offline-loading-note">{{ note }}</p>

        <div v-if="hasProgress" class="offline-loading-progress">
          <div class="offline-loading-progress__bar">
            <div class="offline-loading-progress__value" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <p class="offline-loading-progress__text">{{ current }}/{{ total }}</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    required: true,
  },
  note: {
    type: String,
    default: '',
  },
  current: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
});

const hasProgress = computed(() => props.total > 0);
const progressPercent = computed(() => {
  if (!props.total) return 0;
  return Math.min(100, Math.max(0, Math.round((props.current / props.total) * 100)));
});
</script>

<style scoped>
.offline-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    calc(24px + var(--app-safe-area-top, env(safe-area-inset-top, 0px)))
    calc(24px + var(--app-safe-area-right, env(safe-area-inset-right, 0px)))
    calc(24px + var(--app-safe-area-bottom, env(safe-area-inset-bottom, 0px)))
    calc(24px + var(--app-safe-area-left, env(safe-area-inset-left, 0px)));
  background: rgba(15, 23, 42, 0.72);
  pointer-events: auto;
}

.offline-loading-panel {
  width: min(100%, 360px);
  padding: 28px 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  text-align: center;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
}

.offline-loading-spinner {
  font-size: 42px;
  color: #2563eb;
}

.offline-loading-title {
  margin: 18px 0 8px;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
}

.offline-loading-note {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
  line-height: 1.45;
}

.offline-loading-progress {
  margin-top: 18px;
}

.offline-loading-progress__bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #e2e8f0;
}

.offline-loading-progress__value {
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
  transition: width 0.2s ease;
}

.offline-loading-progress__text {
  margin: 10px 0 0;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
