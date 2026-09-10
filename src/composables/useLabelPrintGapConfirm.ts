import { onMounted, onUnmounted } from 'vue';
import { registerGapConfirmHandler } from '@/services/labelPrintSession';
import { useAppLocale } from '@/composables/useAppLocale';
import { showAppConfirm } from '@/services/confirmBridge';

type LabelPrintLocaleScope = 'listMixGlue' | 'listSeparateMixedGlue';

export function useLabelPrintGapConfirm(localeScope: LabelPrintLocaleScope) {
  const { t } = useAppLocale(() => 'tablet');

  const showGapConfirm = (): Promise<boolean> =>
    showAppConfirm({
      header: t(`${localeScope}.print.gapConfirmTitle`),
      message: t(`${localeScope}.print.gapConfirmMessage`),
      acceptLabel: t(`${localeScope}.print.gapConfirmOk`),
      rejectLabel: t(`${localeScope}.print.gapConfirmCancel`),
      acceptClass: 'p-button-success',
      rejectClass: 'p-button-secondary p-button-text',
    });

  onMounted(() => registerGapConfirmHandler(showGapConfirm));
  onUnmounted(() => registerGapConfirmHandler(null));

  return { showGapConfirm };
}
