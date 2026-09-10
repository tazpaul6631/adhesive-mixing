<template>
  <div class="app-page" :class="pageClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    pageClass?: string | Record<string, boolean> | Array<string | Record<string, boolean>>;
  }>(),
  {
    pageClass: undefined,
  }
);
</script>

<style scoped>
.app-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  contain: layout size style;
  z-index: 0;
  overflow: hidden;
  background: var(--app-page-bg, #ffffff);
}
</style>
