import type { ConfirmationOptions } from 'primevue/confirmationoptions';

type ConfirmRequireFn = (options: ConfirmationOptions) => void;

let confirmRequire: ConfirmRequireFn | null = null;

export function registerAppConfirm(requireFn: ConfirmRequireFn) {
  confirmRequire = requireFn;
}

export function unregisterAppConfirm(requireFn?: ConfirmRequireFn) {
  if (!requireFn || confirmRequire === requireFn) {
    confirmRequire = null;
  }
}

export type AppConfirmOptions = {
  header: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptClass?: string;
  rejectClass?: string;
  /** Chỉ nút OK (alert). */
  alertOnly?: boolean;
};

/**
 * Confirm/Alert dùng PrimeVue ConfirmationService (đã register ở App).
 * Trả về true khi accept, false khi reject/đóng.
 */
export function showAppConfirm(options: AppConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!confirmRequire) {
      console.warn('[showAppConfirm] Confirm service chưa sẵn sàng');
      resolve(false);
      return;
    }

    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    if (options.alertOnly) {
      confirmRequire({
        header: options.header,
        message: options.message,
        acceptLabel: options.acceptLabel || 'OK',
        acceptClass: options.acceptClass || 'p-button-primary',
        rejectProps: { style: { display: 'none' } },
        accept: () => finish(true),
        reject: () => finish(true),
        onHide: () => finish(true),
      });
      return;
    }

    confirmRequire({
      header: options.header,
      message: options.message,
      acceptLabel: options.acceptLabel || 'OK',
      rejectLabel: options.rejectLabel || 'Hủy',
      acceptClass: options.acceptClass || 'p-button-danger',
      rejectClass: options.rejectClass || 'p-button-secondary p-button-text',
      accept: () => finish(true),
      reject: () => finish(false),
      onHide: () => finish(false),
    });
  });
}

