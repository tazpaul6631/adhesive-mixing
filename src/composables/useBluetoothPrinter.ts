import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';

export type BluetoothPrinterStatus = 'disconnected' | 'scanning' | 'connected';

export interface UseBluetoothPrinterOptions {
  autoEnableOnEnter?: boolean;
  autoDisableOnLeave?: boolean;
  disconnectOnLeave?: boolean;
}

const DISCOVER_UNPAIRED_TIMEOUT_MS = 4000;
const SAVED_MAC_CONNECT_TIMEOUT_MS = 6000;
const INIT_RETRY_DELAYS_MS = [0, 400, 900, 1500];
const PRINTER_NAME_PATTERNS = [/b300/i, /tsc/i, /printer/i, /label/i, /barcode/i, /spp/i];
const BT_WRITE_CHUNK_SIZE = 512;
const BT_WRITE_CHUNK_DELAY_MS = 20;
const BT_POST_CONNECT_SETTLE_MS = 350;
const BT_POST_WRITE_SETTLE_MS = 400;

const getBluetooth = () => (window as any).bluetoothSerial;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isLikelyPrinter = (name?: string) => {
  if (!name) return false;
  return PRINTER_NAME_PATTERNS.some((pattern) => pattern.test(name));
};

/** Shared across all pages/components using the printer. */
const status = ref<BluetoothPrinterStatus>('disconnected');
const scanPhase = ref<'saved-mac' | 'discover'>('discover');
const selectedMac = ref('');

let autoReconnectInterval: ReturnType<typeof setInterval> | null = null;
let pendingInitTimer: ReturnType<typeof setTimeout> | null = null;
let scanAborted = false;
let connectFlowPromise: Promise<void> | null = null;
let printInProgress = false;
/** User đã hủy/ngắt — không tự quét lại cho đến refresh hoặc in. */
let autoConnectSuppressed = false;

const collectPrinterCandidates = (devices: any[], preferredMac?: string | null) => {
  const pool = (devices || []).filter((device) => {
    if (!device?.address) return false;
    if (preferredMac && device.address === preferredMac) return true;
    return isLikelyPrinter(device.name);
  });

  const fallbackPool = pool.length > 0 ? pool : (devices || []).filter((device) => device?.address);
  const unique = new Map<string, any>();
  fallbackPool.forEach((device) => unique.set(device.address, device));

  return [...unique.values()].sort((a, b) => {
    if (preferredMac && a.address === preferredMac) return -1;
    if (preferredMac && b.address === preferredMac) return 1;

    const aIsB300 = /b300/i.test(a.name || '') ? 0 : 1;
    const bIsB300 = /b300/i.test(b.name || '') ? 0 : 1;
    if (aIsB300 !== bIsB300) return aIsB300 - bIsB300;

    return (a.name || a.address).localeCompare(b.name || b.address);
  });
};

const tryConnectDirect = (mac: string, timeoutMs: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const bt = getBluetooth();
    if (!bt || !mac) {
      resolve(false);
      return;
    }

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);

    bt.connect(
      mac,
      () => finish(true),
      () => finish(false)
    );
  });
};

const tryConnectCandidates = async (candidates: any[]): Promise<any | null> => {
  const bt = getBluetooth();
  if (!bt || candidates.length === 0) return null;

  for (const device of candidates) {
    if (scanAborted) return null;

    const connected = await tryConnectDirect(device.address, SAVED_MAC_CONNECT_TIMEOUT_MS);
    if (connected) return device;

    await new Promise<void>((resolve) => {
      bt.disconnect(() => resolve(), () => resolve());
    });
  }

  return null;
};

const listPairedDevices = (): Promise<any[]> => {
  return new Promise((resolve) => {
    const bt = getBluetooth();
    if (!bt) {
      resolve([]);
      return;
    }

    bt.list(
      (devices: any[]) => resolve(devices || []),
      () => resolve([])
    );
  });
};

const discoverUnpairedWithTimeout = (timeoutMs: number): Promise<any[]> => {
  return new Promise((resolve) => {
    const bt = getBluetooth();
    if (!bt || typeof bt.discoverUnpaired !== 'function') {
      resolve([]);
      return;
    }

    let settled = false;
    const finish = (devices: any[]) => {
      if (settled) return;
      settled = true;
      resolve(devices || []);
    };

    const timer = setTimeout(() => finish([]), timeoutMs);

    bt.discoverUnpaired(
      (devices: any[]) => {
        clearTimeout(timer);
        finish(devices);
      },
      () => {
        clearTimeout(timer);
        finish([]);
      }
    );
  });
};

const ensureBluetoothEnabled = (onReady: () => void, onFailure?: (err: unknown) => void) => {
  const bt = getBluetooth();
  if (!bt) return;

  bt.isEnabled(
    () => onReady(),
    () => {
      bt.enable(
        () => onReady(),
        (err: any) => onFailure?.(err)
      );
    }
  );
};

const getSavedPrinterMac = async () => {
  const { value } = await Preferences.get({ key: 'SAVED_PRINTER_MAC' });
  return value || '';
};

const savePrinterMac = async (mac: string) => {
  selectedMac.value = mac;
  await Preferences.set({ key: 'SAVED_PRINTER_MAC', value: mac });
};

const isAlreadyConnected = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const bt = getBluetooth();
    if (!bt) {
      resolve(false);
      return;
    }

    bt.isConnected(
      () => resolve(true),
      () => resolve(false)
    );
  });
};

const stopAutoReconnectWatchdog = () => {
  if (autoReconnectInterval) {
    clearInterval(autoReconnectInterval);
    autoReconnectInterval = null;
  }
};

const tryConnectSavedMac = async (savedMac: string): Promise<boolean> => {
  if (!savedMac || scanAborted) return false;

  scanPhase.value = 'saved-mac';
  const connected = await tryConnectDirect(savedMac, SAVED_MAC_CONNECT_TIMEOUT_MS);
  if (scanAborted) return false;

  if (connected) {
    await sleep(BT_POST_CONNECT_SETTLE_MS);
    if (!(await isAlreadyConnected())) {
      return false;
    }
    await savePrinterMac(savedMac);
    status.value = 'connected';
    return true;
  }

  return false;
};

const autoConnectPrinter = async () => {
  const bt = getBluetooth();
  if (!bt) return;

  if (status.value === 'connected') return;

  if (status.value === 'scanning') {
    scanAborted = true;
    await new Promise<void>((resolve) => {
      bt.disconnect(() => resolve(), () => resolve());
    });
  }

  scanAborted = false;
  status.value = 'scanning';

  try {
    const savedMac = selectedMac.value || (await getSavedPrinterMac());
    if (savedMac) {
      selectedMac.value = savedMac;
      const connectedByMac = await tryConnectSavedMac(savedMac);
      if (connectedByMac || scanAborted) return;
    }

    scanPhase.value = 'discover';

    const paired = await listPairedDevices();
    if (scanAborted) return;

    const unpaired = await discoverUnpairedWithTimeout(DISCOVER_UNPAIRED_TIMEOUT_MS);
    if (scanAborted) return;

    const allDevices = [...paired];
    unpaired.forEach((device) => {
      if (device?.address && !allDevices.some((item) => item.address === device.address)) {
        allDevices.push(device);
      }
    });

    const candidates = collectPrinterCandidates(allDevices, savedMac || selectedMac.value);
    if (candidates.length === 0) {
      status.value = 'disconnected';
      return;
    }

    const connectedDevice = await tryConnectCandidates(candidates);
    if (scanAborted) return;

    if (connectedDevice?.address) {
      await sleep(BT_POST_CONNECT_SETTLE_MS);
      if (!(await isAlreadyConnected())) {
        status.value = 'disconnected';
        return;
      }
      await savePrinterMac(connectedDevice.address);
      status.value = 'connected';
      return;
    }

    status.value = 'disconnected';
  } catch (error) {
    console.error('Lỗi autoConnectPrinter:', error);
    if (!scanAborted && status.value === 'scanning') {
      status.value = 'disconnected';
    }
  }
};

const disconnectDevice = (): Promise<void> => {
  return new Promise((resolve) => {
    const bt = getBluetooth();
    if (!bt) {
      status.value = 'disconnected';
      resolve();
      return;
    }

    bt.isConnected(
      () => {
        bt.disconnect(
          () => {
            status.value = 'disconnected';
            resolve();
          },
          () => {
            status.value = 'disconnected';
            resolve();
          }
        );
      },
      () => {
        status.value = 'disconnected';
        resolve();
      }
    );
  });
};

const disableBluetoothAdapter = (): Promise<void> => {
  return new Promise((resolve) => {
    const bt = getBluetooth();
    if (!bt || typeof bt.disable !== 'function') {
      resolve();
      return;
    }

    bt.isEnabled(
      () => {
        bt.disable(
          () => resolve(),
          () => resolve()
        );
      },
      () => resolve()
    );
  });
};

const startAutoReconnectWatchdog = () => {
  if (autoConnectSuppressed) return;

  if (autoReconnectInterval) {
    clearInterval(autoReconnectInterval);
    autoReconnectInterval = null;
  }

  autoReconnectInterval = setInterval(() => {
    const bt = getBluetooth();
    if (!bt || printInProgress || scanAborted || autoConnectSuppressed) return;

    bt.isConnected(
      () => {
        if (status.value !== 'connected') status.value = 'connected';
      },
      () => {
        if (status.value === 'connected') {
          status.value = 'disconnected';
        }

        if (status.value === 'disconnected' && !scanAborted && !autoConnectSuppressed) {
          bt.isEnabled(
            () => {
              void (async () => {
                const savedMac = selectedMac.value || (await getSavedPrinterMac());
                if (savedMac) selectedMac.value = savedMac;
                await autoConnectPrinter();
              })();
            },
            () => undefined
          );
        }
      }
    );
  }, 5000);
};

const startBluetoothAutoFlow = (
  onEnableFailed?: () => void,
  flowOptions?: { force?: boolean },
  pluginRetry = 0
): Promise<void> => {
  if (connectFlowPromise) {
    return connectFlowPromise;
  }

  connectFlowPromise = new Promise((resolve) => {
    const finish = () => {
      connectFlowPromise = null;
      resolve();
    };

    const bt = getBluetooth();
    if (!bt) {
      if (pluginRetry < 8) {
        setTimeout(() => {
          startBluetoothAutoFlow(onEnableFailed, flowOptions, pluginRetry + 1).then(finish);
        }, 400);
      } else {
        finish();
      }
      return;
    }

    ensureBluetoothEnabled(
      () => {
        void (async () => {
          try {
            const force = flowOptions?.force ?? false;

            if (!force && (await isAlreadyConnected())) {
              if (!selectedMac.value) {
                selectedMac.value = await getSavedPrinterMac();
              }
              status.value = 'connected';
              startAutoReconnectWatchdog();
              return;
            }

            await autoConnectPrinter();
            startAutoReconnectWatchdog();
          } finally {
            finish();
          }
        })();
      },
      () => {
        status.value = 'disconnected';
        onEnableFailed?.();
        finish();
      }
    );
  });

  return connectFlowPromise;
};

const syncStatusFromHardware = async (): Promise<boolean> => {
  if (!(await isAlreadyConnected())) {
    status.value = 'disconnected';
    return false;
  }

  status.value = 'connected';
  if (!selectedMac.value) {
    selectedMac.value = await getSavedPrinterMac();
  }
  startAutoReconnectWatchdog();
  return true;
};

const runConnectWithRetry = async () => {
  for (let attempt = 0; attempt < INIT_RETRY_DELAYS_MS.length; attempt++) {
    if (scanAborted) return;

    const delayMs = INIT_RETRY_DELAYS_MS[attempt];
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (await syncStatusFromHardware()) {
      return;
    }

    await startBluetoothAutoFlow(undefined, { force: attempt > 0 });
    if (status.value === 'connected' || scanAborted) {
      return;
    }
  }
};

const isConnected = () => status.value === 'connected';

const verifyHardwareConnected = async (): Promise<boolean> => {
  if (!(await isAlreadyConnected())) {
    status.value = 'disconnected';
    return false;
  }

  status.value = 'connected';
  return true;
};

const setPrintInProgress = (value: boolean) => {
  printInProgress = value;
};

const writeBufferChunked = async (buffer: ArrayBufferLike): Promise<boolean> => {
  const bt = getBluetooth();
  if (!bt || !(await verifyHardwareConnected())) {
    return false;
  }

  const bytes = new Uint8Array(buffer);

  for (let offset = 0; offset < bytes.length; offset += BT_WRITE_CHUNK_SIZE) {
    if (!(await isAlreadyConnected())) {
      status.value = 'disconnected';
      return false;
    }

    const chunkEnd = Math.min(offset + BT_WRITE_CHUNK_SIZE, bytes.length);
    const chunk = bytes.slice(offset, chunkEnd);
    const chunkOk = await new Promise<boolean>((resolve) => {
      bt.write(
        chunk.buffer,
        () => resolve(true),
        () => {
          status.value = 'disconnected';
          resolve(false);
        }
      );
    });

    if (!chunkOk) {
      return false;
    }

    if (chunkEnd < bytes.length) {
      await sleep(BT_WRITE_CHUNK_DELAY_MS);
    }
  }

  await sleep(BT_POST_WRITE_SETTLE_MS);

  if (!(await isAlreadyConnected())) {
    status.value = 'disconnected';
    return false;
  }

  return true;
};

const writeTspl = async (tspl: string): Promise<boolean> => {
  if (!getBluetooth()) {
    return false;
  }

  printInProgress = true;
  try {
    if (!(await verifyHardwareConnected())) {
      return false;
    }

    const dataArray = new TextEncoder().encode(tspl);
    return writeBufferChunked(dataArray.buffer);
  } finally {
    printInProgress = false;
  }
};

export function useBluetoothPrinter(options: UseBluetoothPrinterOptions = {}) {
  const autoEnableOnEnter = options.autoEnableOnEnter ?? true;
  const autoDisableOnLeave = options.autoDisableOnLeave ?? false;
  const disconnectOnLeave = options.disconnectOnLeave ?? false;

  const initBluetooth = async () => {
    if (!autoEnableOnEnter) return;

    if (pendingInitTimer) {
      clearTimeout(pendingInitTimer);
      pendingInitTimer = null;
    }

    const savedMac = await getSavedPrinterMac();
    if (savedMac) {
      selectedMac.value = savedMac;
    }

    if (await syncStatusFromHardware()) {
      return;
    }

    if (autoConnectSuppressed) {
      status.value = 'disconnected';
      return;
    }

    scanAborted = false;
    void runConnectWithRetry();
  };

  const refreshScan = () => {
    autoConnectSuppressed = false;
    scanAborted = false;
    void startBluetoothAutoFlow(undefined, { force: true });
  };

  const disconnect = () => {
    autoConnectSuppressed = true;
    scanAborted = true;
    stopAutoReconnectWatchdog();

    const bt = getBluetooth();
    status.value = 'disconnected';
    if (bt) {
      bt.disconnect(() => {
        status.value = 'disconnected';
      }, () => {
        status.value = 'disconnected';
      });
    }
  };

  const cancelConnection = () => {
    autoConnectSuppressed = true;
    scanAborted = true;
    stopAutoReconnectWatchdog();
    status.value = 'disconnected';

    const bt = getBluetooth();
    if (bt) {
      bt.disconnect(() => undefined, () => undefined);
    }
  };

  const connectForPrint = async (): Promise<boolean> => {
    if (await verifyHardwareConnected()) {
      return true;
    }

    autoConnectSuppressed = false;
    scanAborted = false;
    await startBluetoothAutoFlow(undefined, { force: true });
    return verifyHardwareConnected();
  };

  const pauseBluetooth = () => {
    scanAborted = true;

    if (pendingInitTimer) {
      clearTimeout(pendingInitTimer);
      pendingInitTimer = null;
    }

    stopAutoReconnectWatchdog();
  };

  const cleanupBluetooth = (hard = disconnectOnLeave) => {
    pauseBluetooth();

    if (!hard) return;

    status.value = 'disconnected';
    scanPhase.value = 'discover';

    void (async () => {
      await disconnectDevice();

      if (autoDisableOnLeave) {
        await disableBluetoothAdapter();
      }
    })();
  };

  return {
    status,
    scanPhase,
    initBluetooth,
    pauseBluetooth,
    cleanupBluetooth,
    refreshScan,
    disconnect,
    cancelConnection,
    connectForPrint,
    isConnected,
    verifyHardwareConnected,
    setPrintInProgress,
    writeTspl,
  };
}
