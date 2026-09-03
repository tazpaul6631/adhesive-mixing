import { Capacitor } from '@capacitor/core';
import { preloadMenuRouteChunks } from '@/views/AppMenu/menuRouteChunks';

const TABLET_MENU_PATHS = [
  '/list-mix-glue',
  '/list-separate-mixed-glue-management',
  '/glue-return-log',
];

const MOBILE_MENU_PATHS = [
  '/mobile',
  '/mobile/glue-return',
  '/mobile/glue-return-in-room',
  '/mobile/glue-info-check',
  '/mobile/glue-check-list',
];

const loadListMixGlueIcons = () =>
  import('@kalimahapps/vue-icons/bs').then(({ BsBucket, BsPaintBucket }) => {
    void BsBucket;
    void BsPaintBucket;
  });

/** Warm print/scale chunk song song với list (manualChunks: feature-print). */
const warmPrintFeatureChunk = () => {
  void import('@/components/BluetoothPrinterStatus.vue');
  void import('@/components/BatchPrintRetryDialog.vue');
  void import('@/components/ElectronicScale.vue');
  void import('@/components/ScaleDevicePicker.vue');
  void import('@/composables/useMixGlueLabelBatchPrint');
  void import('@/composables/useSeparateLabelBatchPrint');
  void import('@/composables/usePrintQueue');
  void import('@/composables/useTabletBarcodeScan');
};

/**
 * Prefetch ngay trên màn login / sau login — không đợi idle.
 * Mục tiêu: lúc user vào AppMenu rồi bấm list, chunk đã warm → ~2–3s hoặc nhanh hơn.
 */
export function warmNativeMenuChunks(isTablet = typeof window !== 'undefined' && window.innerWidth >= 768) {
  const paths = isTablet ? TABLET_MENU_PATHS : MOBILE_MENU_PATHS;
  if (isTablet) {
    void loadListMixGlueIcons();
    warmPrintFeatureChunk();
  }
  return preloadMenuRouteChunks(paths);
}

/**
 * Gọi sớm (login mount / sau login). Native only.
 */
export function prefetchPostLoginRoute(isNative = Capacitor.isNativePlatform()) {
  if (!isNative) {
    return Promise.resolve();
  }
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768;
  return warmNativeMenuChunks(isTablet);
}

/** @deprecated dùng warmNativeMenuChunks — giữ tên để login cũ không gãy. */
export function prefetchTabletRoutesIdle() {
  return warmNativeMenuChunks(true);
}
