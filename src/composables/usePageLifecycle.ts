import { nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

export type PageLifecycleHooks = {
  /** Tương đương onIonViewWillEnter */
  onEnter?: () => void | Promise<void>;
  /** Tương đương onIonViewDidEnter (sau nextTick) */
  onAfterEnter?: () => void | Promise<void>;
  /** Tương đương onIonViewWillLeave / DidLeave */
  onLeave?: () => void | Promise<void>;
};

/**
 * Thay Ionic onIonView* — dùng Vue lifecycle.
 * Hỗ trợ keep-alive (onActivated / onDeactivated) và đổi route khi instance được giữ.
 */
export function usePageLifecycle(hooks: PageLifecycleHooks) {
  const route = useRoute();
  const pagePath = route.path;
  let isActive = false;
  let enterGeneration = 0;

  const runEnter = async () => {
    if (isActive) return;
    isActive = true;
    const gen = ++enterGeneration;
    await hooks.onEnter?.();
    if (gen !== enterGeneration) return;
    await nextTick();
    await nextTick();
    if (gen !== enterGeneration) return;
    await hooks.onAfterEnter?.();
  };

  const runLeave = async () => {
    if (!isActive) return;
    isActive = false;
    enterGeneration += 1;
    await hooks.onLeave?.();
  };

  onMounted(() => {
    void runEnter();
  });

  // keep-alive: mount lần đầu cũng gọi onActivated — isActive guard tránh double enter.
  onActivated(() => {
    void runEnter();
  });

  onDeactivated(() => {
    void runLeave();
  });

  onBeforeUnmount(() => {
    void runLeave();
  });

  watch(
    () => route.path,
    (path, prevPath) => {
      if (path === pagePath && prevPath !== pagePath) {
        void runEnter();
        return;
      }
      if (prevPath === pagePath && path !== pagePath) {
        void runLeave();
      }
    },
  );
}
