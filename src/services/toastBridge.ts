import type { ToastMessageOptions } from 'primevue/toast';

type ShowToastFn = (options: ToastMessageOptions) => void;

let showToastFn: ShowToastFn | null = null;
let lastServerMaintenanceAt = 0;

const SERVER_MAINTENANCE_TOAST_COOLDOWN_MS = 4000;

export function registerAppToast(fn: ShowToastFn) {
  showToastFn = fn;
}

export function unregisterAppToast(fn?: ShowToastFn) {
  if (!fn || showToastFn === fn) {
    showToastFn = null;
  }
}

export function showAppToast(options: ToastMessageOptions) {
  showToastFn?.(options);
}

/** Debounced toast when BE is unreachable / 5xx — safe to call from Axios. */
export function notifyServerMaintenanceToast(detail: string, summary = 'Server') {
  const now = Date.now();
  if (now - lastServerMaintenanceAt < SERVER_MAINTENANCE_TOAST_COOLDOWN_MS) {
    return;
  }
  lastServerMaintenanceAt = now;

  showAppToast({
    severity: 'warn',
    summary,
    detail,
    life: 6000,
  });
}
