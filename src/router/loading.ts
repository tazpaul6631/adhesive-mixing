import { ref } from 'vue';

/** Tự tắt overlay nếu navigation/chunk treo bất thường. */
const ROUTE_LOADING_TIMEOUT_MS = 30_000;

export const isRouteLoading = ref(false);

let loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

export function startRouteLoading() {
  isRouteLoading.value = true;

  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
  }

  loadingTimeoutId = setTimeout(() => {
    console.warn('[router] Route loading timeout — forcing overlay off');
    stopRouteLoading();
  }, ROUTE_LOADING_TIMEOUT_MS);
}

export function stopRouteLoading() {
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
    loadingTimeoutId = null;
  }
  isRouteLoading.value = false;
}
