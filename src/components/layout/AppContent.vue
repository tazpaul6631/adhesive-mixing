<template>
  <main
    class="app-content"
    :class="{
      'app-content--scroll': scroll,
      'app-content--padding': padding,
    }"
  >
    <slot />
  </main>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Cho phép scroll nội dung (giống ion-content mặc định). */
    scroll?: boolean;
    /** Thêm padding + safe-area ngang. */
    padding?: boolean;
  }>(),
  {
    scroll: true,
    padding: false,
  }
);
</script>

<style scoped>
.app-content {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  position: relative;
  background: var(--app-content-bg, transparent);
  overflow: hidden;
}

.app-content--scroll {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

.app-content--padding {
  padding:
    var(--app-padding, 16px)
    calc(var(--app-padding, 16px) + var(--app-safe-area-right, env(safe-area-inset-right, 0px)))
    calc(var(--app-padding, 16px) + var(--app-safe-area-bottom, env(safe-area-inset-bottom, 0px)))
    calc(var(--app-padding, 16px) + var(--app-safe-area-left, env(safe-area-inset-left, 0px)));
}
</style>
