import { showAppConfirm } from '@/services/confirmBridge';
import { showAppToast } from '@/services/toastBridge';

const Alert = async (h: string, sub: string, m: string, _cssClass: string = '') => {
  const message = [sub, m].filter(Boolean).join('\n');
  await showAppConfirm({
    header: h,
    message,
    acceptLabel: 'OK',
    acceptClass: 'p-button-primary',
    alertOnly: true,
  });
};

const Toast = async (
  message: string,
  color: 'success' | 'danger' | 'warning' | 'primary' = 'success',
) => {
  const severity =
    color === 'danger' ? 'error'
      : color === 'warning' ? 'warn'
        : color === 'primary' ? 'info'
          : 'success';

  showAppToast({
    severity,
    summary: severity === 'success' ? 'Success' : 'Notice',
    detail: message,
  });
};

const Confirm = async (
  header: string,
  sub: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  _cssClass: string = '',
) => {
  const detail = [sub, message].filter(Boolean).join('\n');
  const ok = await showAppConfirm({
    header,
    message: detail,
    acceptLabel: 'Xóa',
    rejectLabel: 'Hủy',
    acceptClass: 'p-button-danger',
    rejectClass: 'p-button-secondary p-button-text',
  });

  if (ok) {
    onConfirm();
  } else {
    onCancel?.();
  }
};

export default {
  Alert,
  Toast,
  Confirm,
};
