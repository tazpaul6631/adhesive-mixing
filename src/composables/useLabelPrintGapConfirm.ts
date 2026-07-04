import { onMounted, onUnmounted } from 'vue';
import { alertController } from '@ionic/vue';
import { registerGapConfirmHandler } from '@/services/labelPrintSession';
import { useAppLocale } from '@/composables/useAppLocale';

type LabelPrintLocaleScope = 'listMixGlue' | 'listSeparateMixedGlue';

export function useLabelPrintGapConfirm(localeScope: LabelPrintLocaleScope) {
  const { t } = useAppLocale(() => 'tablet');

  const showGapConfirm = (): Promise<boolean> =>
    new Promise(async (resolve) => {
      const alert = await alertController.create({
        header: t(`${localeScope}.print.gapConfirmTitle`),
        message: t(`${localeScope}.print.gapConfirmMessage`),
        backdropDismiss: false,
        buttons: [
          {
            text: t(`${localeScope}.print.gapConfirmCancel`),
            role: 'cancel',
            handler: () => resolve(false),
          },
          {
            text: t(`${localeScope}.print.gapConfirmOk`),
            handler: () => resolve(true),
          },
        ],
      });
      await alert.present();
    });

  onMounted(() => registerGapConfirmHandler(showGapConfirm));
  onUnmounted(() => registerGapConfirmHandler(null));

  return { showGapConfirm };
}
