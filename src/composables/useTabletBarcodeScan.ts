import { ref, nextTick, onUnmounted } from 'vue';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import type { PluginListenerHandle } from '@capacitor/core';

type BarcodeLike = { rawValue?: string; displayValue?: string };

export interface ScanPrompt {
  title: string;
  note: string;
}

const DEFAULT_SCAN_PROMPT: ScanPrompt = {
  title: 'Quét mã xác thực QIP',
  note: 'Đưa mã vào khung hình để tiếp tục',
};

const getBarcodeValue = (barcode: BarcodeLike) => barcode.rawValue || barcode.displayValue || '';

const setScannerUiActive = (active: boolean) => {
  document.body.classList.toggle('barcode-scanner-active', active);
  document.documentElement.classList.toggle('barcode-scanner-active', active);
  document.querySelector('ion-app')?.classList.toggle('barcode-scanner-active', active);
};

export function useTabletBarcodeScan() {
  const isScanning = ref(false);
  const scanTitle = ref(DEFAULT_SCAN_PROMPT.title);
  const scanNote = ref(DEFAULT_SCAN_PROMPT.note);

  let scanListener: PluginListenerHandle | null = null;
  let pendingResolve: ((value: string | null) => void) | null = null;

  const setScanPrompt = (prompt: Partial<ScanPrompt>) => {
    if (prompt.title) scanTitle.value = prompt.title;
    if (prompt.note) scanNote.value = prompt.note;
  };

  const resetScanPrompt = () => {
    scanTitle.value = DEFAULT_SCAN_PROMPT.title;
    scanNote.value = DEFAULT_SCAN_PROMPT.note;
  };

  const cleanupScanner = async () => {
    if (scanListener) {
      await scanListener.remove().catch(() => undefined);
      scanListener = null;
    }
    await BarcodeScanner.removeAllListeners().catch(() => undefined);
    await BarcodeScanner.stopScan().catch(() => undefined);
  };

  const finishScan = async (value: string | null) => {
    const resolve = pendingResolve;
    pendingResolve = null;
    isScanning.value = false;
    setScannerUiActive(false);
    await cleanupScanner();
    resetScanPrompt();
    resolve?.(value);
  };

  const cancelScan = async () => {
    if (!isScanning.value && !pendingResolve) return;
    await finishScan(null);
  };

  const scanWithFrontCamera = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      pendingResolve = resolve;

      void (async () => {
        try {
          isScanning.value = true;
          setScannerUiActive(true);
          await nextTick();

          scanListener = await BarcodeScanner.addListener('barcodesScanned', async (event) => {
            const scannedValue = event.barcodes?.[0] ? getBarcodeValue(event.barcodes[0]) : '';
            if (!scannedValue) return;
            await finishScan(scannedValue);
          });

          await BarcodeScanner.startScan({
            lensFacing: LensFacing.Front,
          });
        } catch (error) {
          console.error('Lỗi khi quét mã:', error);
          await finishScan(null);
        }
      })();
    });
  };

  const scanOnce = async (prompt?: Partial<ScanPrompt>): Promise<string | null> => {
    if (prompt) {
      setScanPrompt(prompt);
    }

    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') {
        resetScanPrompt();
        return null;
      }

      if (Capacitor.isNativePlatform()) {
        return await scanWithFrontCamera();
      }

      const { barcodes } = await BarcodeScanner.scan();
      resetScanPrompt();
      if (barcodes?.length) {
        return getBarcodeValue(barcodes[0]) || null;
      }

      return null;
    } catch (error) {
      console.error('Lỗi khi quét mã:', error);
      await finishScan(null);
      return null;
    }
  };

  onUnmounted(() => {
    void cancelScan();
  });

  return {
    scanOnce,
    isScanning,
    cancelScan,
    scanTitle,
    scanNote,
    setScanPrompt,
    resetScanPrompt,
  };
}
