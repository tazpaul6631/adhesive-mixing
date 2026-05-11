import { alertController, toastController } from "@ionic/vue";

const Alert = async (h: string, sub: string, m: string, cssClass: string = '') => {
  const alert = await alertController.create({
    header: h,
    subHeader: sub,
    message: m,
    buttons: ['OK'],
    cssClass: cssClass
  });
  await alert.present();
};

const Toast = async (message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'success') => {
  const toast = await toastController.create({
    message,
    duration: 3000,
    position: 'top',
    color
  });
  await toast.present();
};

const Confirm = async (
  header: string,
  sub: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  cssClass: string = ''
) => {
  const alert = await alertController.create({
    header: header,
    subHeader: sub,
    message: message,
    buttons: [
      {
        text: 'Hủy',
        role: 'cancel',
        cssClass: 'text-gray-500',
        handler: () => {
          if (onCancel) onCancel();
        }
      },
      {
        text: 'Xóa',
        role: 'confirm',
        cssClass: 'text-red-500 font-bold',
        handler: onConfirm
      }
    ],
    cssClass: cssClass
  });

  await alert.present();
};

export default {
  Alert,
  Toast,
  Confirm
};