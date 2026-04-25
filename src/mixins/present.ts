import { alertController, toastController } from "@ionic/vue";

const Alert = async (h: string, sub: string, m: string, cssClass: string = '') => {
  const alert = await alertController.create({ header: h, subHeader: sub, message: m, buttons: ['OK'], cssClass: cssClass });
  await alert.present();
};

const Toast = async (message: string, color: string) => {
  const toast = await toastController.create({
    message,
    duration: 3000,
    position: 'top',
    color
  });
  await toast.present();
};

export default {
  Alert,
  Toast
}