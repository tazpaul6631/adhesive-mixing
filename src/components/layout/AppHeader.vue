<template>
  <header class="app-header" :class="{ 'app-header--borderless': noBorder }">
    <div class="app-header__toolbar" :class="toolbarClass">
      <div v-if="$slots.start" class="app-header__start">
        <slot name="start" />
      </div>
      <div class="app-header__content">
        <slot>
          <h1 v-if="title" class="app-header__title">{{ title }}</h1>
        </slot>
      </div>
      <div class="app-header__end">
        <RoleChips />
        <slot name="end" />
      </div>
    </div>
    <slot name="after" />
  </header>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

/** Async để tránh circular chunk: RoleChips → auth → router → layout → AppHeader. */
const RoleChips = defineAsyncComponent(() => import('@/components/RoleChips.vue'));

defineProps<{
  title?: string;
  noBorder?: boolean;
  toolbarClass?: string | Record<string, boolean> | Array<string | Record<string, boolean>>;
}>();
</script>

<style scoped>
.app-header {
  flex-shrink: 0;
  background: var(--app-header-bg, #0b56d9);
  color: var(--app-header-color, #ffffff);
  padding-top: var(--app-safe-area-top, env(safe-area-inset-top, 0px));
}

.app-header--borderless {
  box-shadow: none;
}

.app-header__toolbar {
  display: flex;
  align-items: center;
  min-height: 50px;
  width: 100%;
  gap: 8px;
}

.app-header__start,
.app-header__end {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.app-header__end {
  margin-inline-start: auto;
  gap: 8px;
}

.app-header__content {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
}

.app-header__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
