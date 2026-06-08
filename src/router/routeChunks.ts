import { Capacitor } from '@capacitor/core';

const loadListMixGlue = () => import('@/views/Tablet/MixGlue/ListMixGlue.vue');

/**
 * LoginPage + AppMenu đã eager-import trong router.
 * Giữ hook để có thể mở rộng prefetch sau này (web dashboard, v.v.).
 */
export function prefetchPostLoginRoute(isNative = Capacitor.isNativePlatform()) {
  void isNative;
  return Promise.resolve();
}

/** Tải nền màn tablet hay dùng sau khi vào app-menu. */
export function prefetchTabletRoutesIdle() {
  const run = () => {
    void loadListMixGlue();
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}
