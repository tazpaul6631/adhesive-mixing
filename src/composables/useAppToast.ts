import { useToast } from 'primevue/usetoast';
import type { ToastMessageOptions } from 'primevue/toast';

const TOAST_LIFE_SUCCESS = 3000;
const TOAST_LIFE_DEFAULT = 6000;

const resolveToastLife = (severity?: ToastMessageOptions['severity']): number =>
  severity === 'success' ? TOAST_LIFE_SUCCESS : TOAST_LIFE_DEFAULT;

/**
 * Toast chuẩn app: success 3s, warn/error/info/... 6s.
 */
export function useAppToast() {
  const toast = useToast();

  const showToast = (options: ToastMessageOptions) => {
    const severity = options.severity ?? 'info';
    toast.add({
      ...options,
      life: resolveToastLife(severity),
    });
  };

  return { showToast };
}
