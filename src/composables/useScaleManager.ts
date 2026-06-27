import { ref } from 'vue';
import { registerPlugin, WebPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export type ScaleDevice = {
  id: string;
  label: string;
  serial?: string;
  deviceName?: string;
  vendorId?: number;
  productId?: number;
  hasPermission?: boolean;
};

type ScaleSizeKey = 'small' | 'large';
type ScaleLabelRegistry = Record<string, ScaleSizeKey>;

const SCALE_LABEL_REGISTRY_KEY = 'scale-device-labels';
const LAST_SELECTED_SCALE_DEVICE_KEY = 'last-selected-scale-device-id';
const SCALE_LABELS: Record<ScaleSizeKey, string> = {
  small: 'Cân Nhỏ',
  large: 'Cân Lớn',
};

type ConnectOptions = {
  pickPort?: boolean;
  deviceId?: string;
};

class SerialScaleWeb extends WebPlugin {
  private port: any = null;
  private reader: any = null;
  private readLoopActive = false;
  private grantedPorts: any[] = [];
  private connectedDeviceId: string | null = null;

  private buildWebPortId(port: any, index: number) {
    const info = port?.getInfo?.() ?? {};
    const serial = String(info.serialNumber ?? '').trim();
    if (serial) return serial;
    const vendorId = info.usbVendorId ?? 0;
    const productId = info.usbProductId ?? 0;
    return `web-${vendorId}-${productId}-${index}`;
  }

  async listDevices() {
    const nav = (navigator as any).serial;
    if (!nav) {
      return { devices: [] as ScaleDevice[] };
    }

    this.grantedPorts = await nav.getPorts();
    const devices = this.grantedPorts.map((port: any, index: number) => {
      const info = port?.getInfo?.() ?? {};
      const id = this.buildWebPortId(port, index);
      return {
        id,
        label: id,
        serial: String(info.serialNumber ?? '').trim() || undefined,
        vendorId: info.usbVendorId,
        productId: info.usbProductId,
      };
    });

    return { devices };
  }

  async requestPermissions() {
    const { devices } = await this.listDevices();
    return { requested: 0, total: devices.length, granted: devices.length };
  }

  async connect(options?: ConnectOptions) {
    const nav = (navigator as any).serial;
    if (!nav) {
      throw new Error('Web Serial API không được hỗ trợ trên trình duyệt này');
    }

    let targetDeviceId = options?.deviceId ?? '';

    if (options?.pickPort) {
      await this.disconnect();
      this.port = await nav.requestPort();
      const ports = await nav.getPorts();
      this.grantedPorts = ports;
      const matchedIndex = ports.findIndex((port: any) => port === this.port);
      targetDeviceId = matchedIndex >= 0 ? this.buildWebPortId(this.port, matchedIndex) : '0';
    } else if (options?.deviceId != null && options.deviceId !== '') {
      targetDeviceId = options.deviceId;
      if (
        this.port
        && this.connectedDeviceId === targetDeviceId
        && this.readLoopActive
      ) {
        return { deviceId: targetDeviceId, value: 'connected' };
      }

      await this.disconnect();
      const ports = await nav.getPorts();
      this.grantedPorts = ports;
      const matchedIndex = ports.findIndex((port: any, index: number) =>
        this.buildWebPortId(port, index) === options.deviceId
      );
      if (matchedIndex >= 0) {
        this.port = ports[matchedIndex];
      } else {
        throw new Error('Không tìm thấy cân đã chọn. Hãy refresh danh sách USB.');
      }
    } else {
      await this.disconnect();
      const ports = await nav.getPorts();
      this.grantedPorts = ports;
      if (ports.length !== 1) {
        throw new Error('Vui lòng chọn cân USB trước khi kết nối.');
      }
      this.port = ports[0];
      targetDeviceId = this.buildWebPortId(this.port, 0);
    }

    await this.port.open({ baudRate: 9600 });
    this.connectedDeviceId = targetDeviceId;
    void this.readLoop();
    return { deviceId: targetDeviceId, value: 'connected' };
  }

  async readLoop() {
    if (this.readLoopActive) return;
    this.readLoopActive = true;

    while (this.port?.readable) {
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          this.notifyListeners('onScaleData', { data: new TextDecoder().decode(value) });
        }
      } catch (e) {
        this.notifyListeners('onScaleError', { error: e });
        break;
      } finally {
        if (this.reader) {
          await this.reader.cancel().catch(() => { });
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    }

    this.readLoopActive = false;
  }

  async disconnect() {
    this.readLoopActive = false;

    if (this.reader) {
      await this.reader.cancel().catch(() => { });
      this.reader.releaseLock().catch?.(() => { });
      this.reader = null;
    }

    if (this.port) {
      await this.port.close().catch(() => { });
      this.port = null;
    }

    this.connectedDeviceId = null;
  }
}

const SerialScale = registerPlugin<any>('SerialScale', {
  web: () => new SerialScaleWeb(),
});

const globalWeight = ref('0.000');
const isGlobalConnected = ref(false);
const isGlobalStable = ref(false);
const isScaleConnecting = ref(false);
const availableScales = ref<ScaleDevice[]>([]);
const pendingSelectionSessionId = ref<string | number | symbol | null>(null);
const activeScaleSessionId = ref<string | number | symbol | null>(null);
const connectedScaleDeviceId = ref<string | null>(null);

const DATA_WATCHDOG_MS = 15000;
const PORT_HANDSHAKE_MS = 10000;
const AUTO_RETRY_MS = 4000;
const DEVICE_SWITCH_DELAY_MS = 600;

let dataListener: any = null;
let errorListener: any = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
let handshakeTimeout: ReturnType<typeof setTimeout> | null = null;
let autoConnectInterval: ReturnType<typeof setInterval> | null = null;
let connectInProgress = false;
let dataBuffer = '';
let lastDataAt = 0;
let connectMutex: Promise<void> = Promise.resolve();
let sessionReadyPromise: Promise<void> | null = null;

const sessionDeviceIds = new Map<string | number | symbol, string>();
let lastSelectedDeviceId: string | null = null;
let lastSelectedDeviceLoaded = false;

const loadLastSelectedDeviceId = async (): Promise<string | null> => {
  if (lastSelectedDeviceLoaded) return lastSelectedDeviceId;
  const { value } = await Preferences.get({ key: LAST_SELECTED_SCALE_DEVICE_KEY });
  lastSelectedDeviceId = value || null;
  lastSelectedDeviceLoaded = true;
  return lastSelectedDeviceId;
};

const saveLastSelectedDeviceId = async (deviceId: string) => {
  lastSelectedDeviceId = deviceId;
  lastSelectedDeviceLoaded = true;
  await Preferences.set({ key: LAST_SELECTED_SCALE_DEVICE_KEY, value: deviceId });
};

const loadScaleLabelRegistry = async (): Promise<ScaleLabelRegistry> => {
  const { value } = await Preferences.get({ key: SCALE_LABEL_REGISTRY_KEY });
  if (!value) return {};
  try {
    return JSON.parse(value) as ScaleLabelRegistry;
  } catch {
    return {};
  }
};

const saveScaleLabelRegistry = async (registry: ScaleLabelRegistry) => {
  await Preferences.set({ key: SCALE_LABEL_REGISTRY_KEY, value: JSON.stringify(registry) });
};

/** Gán Cân Nhỏ / Cân Lớn theo ID ổn định (serial), không theo thứ tự cắm hub. */
const applyScaleLabels = async (devices: ScaleDevice[]): Promise<ScaleDevice[]> => {
  if (devices.length === 0) return [];

  const registry = await loadScaleLabelRegistry();
  const unmapped = devices.filter((device) => !registry[device.id]);

  if (devices.length === 2 && unmapped.length > 0) {
    if (!registry[devices[0].id]) registry[devices[0].id] = 'small';
    if (!registry[devices[1].id]) registry[devices[1].id] = 'large';
    await saveScaleLabelRegistry(registry);
  }

  return devices.map((device) => {
    const size = registry[device.id];
    if (size) {
      return { ...device, label: SCALE_LABELS[size] };
    }
    const suffix = device.serial?.slice(-6) || device.id.slice(-6);
    return { ...device, label: `Cân USB (${suffix})` };
  });
};

const pruneSessionDeviceIds = (devices: ScaleDevice[]) => {
  const connectedIds = new Set(devices.map((device) => device.id));
  for (const [sessionId, deviceId] of sessionDeviceIds.entries()) {
    if (!connectedIds.has(deviceId)) {
      sessionDeviceIds.delete(sessionId);
    }
  }
};

const disconnectHardware = async () => {
  isGlobalConnected.value = false;
  isGlobalStable.value = false;
  connectedScaleDeviceId.value = null;
  lastDataAt = 0;
  dataBuffer = '';
  clearWatchdog();
  clearHandshakeTimeout();

  try {
    if (dataListener) {
      await dataListener.remove();
      dataListener = null;
    }
    if (errorListener) {
      await errorListener.remove();
      errorListener = null;
    }
    await SerialScale.disconnect();
  } catch (e) {
    console.error('Lỗi ngắt kết nối cân:', e);
  }
};

const handleStaleConnection = async () => {
  if (staleReconnectHandler) {
    await staleReconnectHandler();
    return;
  }
  await disconnectHardware();
};

let staleReconnectHandler: (() => Promise<void>) | null = null;

const withConnectLock = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = connectMutex.then(fn, fn);
  connectMutex = next.then(() => undefined, () => undefined);
  return next;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const requestAllUsbPermissions = async () => {
  try {
    await SerialScale.requestPermissions?.();
  } catch (e) {
    console.warn('Không thể xin quyền USB cho cân:', e);
  }
};

const clearWatchdog = () => {
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
};

const clearHandshakeTimeout = () => {
  if (handshakeTimeout) {
    clearTimeout(handshakeTimeout);
    handshakeTimeout = null;
  }
};

const scheduleWatchdog = () => {
  clearWatchdog();
  watchdog = setTimeout(() => {
    void handleStaleConnection();
  }, DATA_WATCHDOG_MS);
};

const markDataReceived = () => {
  lastDataAt = Date.now();
  clearHandshakeTimeout();

  if (!isGlobalConnected.value) {
    isGlobalConnected.value = true;
  }

  scheduleWatchdog();
};

const parseScalePayload = (raw: string) => {
  let cleanRaw = '';
  if (raw.length > 15) {
    for (let i = 0; i < raw.length; i += 3) cleanRaw += raw[i];
  } else {
    cleanRaw = raw;
  }

  dataBuffer += cleanRaw;

  if (!dataBuffer.includes('\n') && !dataBuffer.includes('\r')) {
    return;
  }

  const line = dataBuffer.trim();
  dataBuffer = '';

  const upperLine = line.toUpperCase();
  isGlobalStable.value = upperLine.includes('ST') || !upperLine.includes('US');

  const matches = line.match(/[-+]?\d*\.?\d+/);
  if (!matches) return;

  let rawValue = parseFloat(matches[0]);
  const lowerLine = line.toLowerCase();
  if (!lowerLine.includes('kg') && lowerLine.includes('g')) {
    rawValue = rawValue / 1000;
  }

  const val = rawValue.toFixed(3);
  if (globalWeight.value !== val) {
    globalWeight.value = val;
  }

  markDataReceived();
};

const fetchAvailableScales = async (): Promise<ScaleDevice[]> => {
  try {
    await requestAllUsbPermissions();
    const result = await SerialScale.listDevices();
    const raw = Array.isArray(result?.devices) ? result.devices : [];
    const devices = await applyScaleLabels(raw);
    pruneSessionDeviceIds(devices);
    availableScales.value = devices;
    return devices;
  } catch (e) {
    console.warn('Không thể liệt kê cân USB:', e);
    availableScales.value = [];
    return [];
  }
};

const resolveDeviceIdForSession = (
  sessionId: string | number | symbol,
  devices: ScaleDevice[],
  explicitDeviceId?: string
): string | null => {
  if (devices.length === 0) return null;

  if (devices.length === 1) {
    sessionDeviceIds.set(sessionId, devices[0].id);
    void saveLastSelectedDeviceId(devices[0].id);
    return devices[0].id;
  }

  const preferred = explicitDeviceId
    || sessionDeviceIds.get(sessionId)
    || lastSelectedDeviceId
    || connectedScaleDeviceId.value;
  if (preferred && devices.some((device) => device.id === preferred)) {
    sessionDeviceIds.set(sessionId, preferred);
    return preferred;
  }

  if (preferred) {
    sessionDeviceIds.delete(sessionId);
  }

  return null;
};

export function useScaleManager() {
  const forceDisconnect = async () => {
    await disconnectHardware();
  };

  const pauseMonitoring = () => {
    if (autoConnectInterval) {
      clearInterval(autoConnectInterval);
      autoConnectInterval = null;
    }
    activeScaleSessionId.value = null;
  };

  const internalStop = async () => {
    pauseMonitoring();
    pendingSelectionSessionId.value = null;
    await disconnectHardware();
  };

  const ensureHardwareListeners = async () => {
    if (dataListener) {
      await dataListener.remove();
      dataListener = null;
    }
    if (errorListener) {
      await errorListener.remove();
      errorListener = null;
    }

    errorListener = await SerialScale.addListener('onScaleError', () => {
      void handleStaleConnection();
    });

    dataListener = await SerialScale.addListener('onScaleData', (result: any) => {
      parseScalePayload(String(result?.data ?? ''));
    });
  };

  const connectHardware = async (deviceId: string) => {
    await ensureHardwareListeners();

    const result = await SerialScale.connect({ deviceId });
    connectedScaleDeviceId.value = result?.deviceId ?? deviceId;

    clearHandshakeTimeout();
    handshakeTimeout = setTimeout(() => {
      if (!isGlobalConnected.value) {
        void handleStaleConnection();
      }
    }, PORT_HANDSHAKE_MS);
  };

  const runConnectToScale = async (options?: {
    force?: boolean;
    pickPort?: boolean;
    deviceId?: string;
    sessionId?: string | number | symbol;
  }) => {
    const sessionId = options?.sessionId ?? activeScaleSessionId.value;
    if (sessionId == null) return;

    const force = options?.force ?? false;

    await loadLastSelectedDeviceId();

    if (
      isGlobalConnected.value
      && !force
      && pendingSelectionSessionId.value === null
      && connectedScaleDeviceId.value
    ) {
      sessionDeviceIds.set(sessionId, connectedScaleDeviceId.value);
      return;
    }

    connectInProgress = true;
    isScaleConnecting.value = true;

    try {
      if (options?.pickPort) {
        if (force || dataListener || errorListener) {
          await forceDisconnect();
          await sleep(DEVICE_SWITCH_DELAY_MS);
        }

        pendingSelectionSessionId.value = null;
        await connectHardware('');
        return;
      }

      const devices = await fetchAvailableScales();

      if (devices.length === 0) {
        pendingSelectionSessionId.value = null;
        throw new Error('Không tìm thấy cân USB nào');
      }

      const deviceId = resolveDeviceIdForSession(sessionId, devices, options?.deviceId);

      if (!deviceId) {
        pendingSelectionSessionId.value = sessionId;
        return;
      }

      if (
        isGlobalConnected.value
        && connectedScaleDeviceId.value === deviceId
        && !force
      ) {
        pendingSelectionSessionId.value = null;
        sessionDeviceIds.set(sessionId, deviceId);
        return;
      }

      if (force || dataListener || errorListener) {
        await forceDisconnect();
        await sleep(DEVICE_SWITCH_DELAY_MS);
      }

      pendingSelectionSessionId.value = null;
      sessionDeviceIds.set(sessionId, deviceId);
      await saveLastSelectedDeviceId(deviceId);
      await connectHardware(deviceId);
    } catch (e) {
      console.error('Lỗi kết nối cân:', e);
      await forceDisconnect();
      throw e;
    } finally {
      connectInProgress = false;
      isScaleConnecting.value = false;
    }
  };

  const connectToScale = (options?: {
    force?: boolean;
    pickPort?: boolean;
    deviceId?: string;
    sessionId?: string | number | symbol;
  }) => withConnectLock(() => runConnectToScale(options));

  staleReconnectHandler = async () => {
    const sessionId = activeScaleSessionId.value;
    const deviceId = connectedScaleDeviceId.value
      || lastSelectedDeviceId
      || (sessionId != null ? sessionDeviceIds.get(sessionId) : null);

    if (sessionId && deviceId) {
      isGlobalConnected.value = false;
      isGlobalStable.value = false;
      lastDataAt = 0;
      clearWatchdog();
      await connectToScale({ sessionId, deviceId, force: true });
      return;
    }

    await disconnectHardware();
  };

  const selectScaleDevice = async (
    sessionId: string | number | symbol,
    deviceId: string
  ) => {
    if (!deviceId) return;

    activeScaleSessionId.value = sessionId;
    sessionDeviceIds.set(sessionId, deviceId);
    pendingSelectionSessionId.value = null;
    await saveLastSelectedDeviceId(deviceId);

    if (isGlobalConnected.value && connectedScaleDeviceId.value === deviceId) {
      return;
    }

    globalWeight.value = '0.000';
    await connectToScale({ sessionId, deviceId, force: true });
  };

  const forceReconnect = async (
    sessionId: string | number | symbol,
    options?: { pickPort?: boolean; deviceId?: string }
  ) => {
    activeScaleSessionId.value = sessionId;
    globalWeight.value = '0.000';

    if (options?.pickPort) {
      await connectToScale({ sessionId, force: true, pickPort: true });
      return;
    }

    const devices = await fetchAvailableScales();
    if (devices.length > 1 && !options?.deviceId) {
      pendingSelectionSessionId.value = sessionId;
      return;
    }

    await connectToScale({
      sessionId,
      force: true,
      deviceId: options?.deviceId,
    });
  };

  /** Quét lại USB hub, cập nhật dropdown và kết nối lại cân đã chọn (nếu còn). */
  const refreshScaleDevices = async (sessionId: string | number | symbol) => {
    activeScaleSessionId.value = sessionId;
    globalWeight.value = '0.000';

    await forceDisconnect();
    await sleep(DEVICE_SWITCH_DELAY_MS);

    await requestAllUsbPermissions();
    const devices = await fetchAvailableScales();
    const saved = sessionDeviceIds.get(sessionId);

    if (devices.length === 0) {
      pendingSelectionSessionId.value = null;
      return { devices, connected: false, needsSelection: false };
    }

    const deviceId = resolveDeviceIdForSession(sessionId, devices, saved ?? undefined);

    if (!deviceId) {
      pendingSelectionSessionId.value = sessionId;
      return { devices, connected: false, needsSelection: true };
    }

    pendingSelectionSessionId.value = null;
    await connectToScale({ sessionId, deviceId, force: true });
    return { devices, connected: true, needsSelection: false, deviceId };
  };

  const startAutoConnectInterval = () => {
    if (autoConnectInterval) return;

    autoConnectInterval = setInterval(() => {
      if (activeScaleSessionId.value === null || connectInProgress) return;
      if (pendingSelectionSessionId.value !== null) return;

      const stale = isGlobalConnected.value
        && lastDataAt > 0
        && Date.now() - lastDataAt > DATA_WATCHDOG_MS;

      if (!isGlobalConnected.value || stale) {
        void connectToScale({
          sessionId: activeScaleSessionId.value!,
          force: stale,
        });
      }
    }, AUTO_RETRY_MS);
  };

  const ensureSessionReady = (sessionId: string | number | symbol): Promise<void> => {
    activeScaleSessionId.value = sessionId;

    if (!sessionReadyPromise) {
      sessionReadyPromise = withConnectLock(async () => {
        await loadLastSelectedDeviceId();
        await fetchAvailableScales();

        if (isGlobalConnected.value && connectedScaleDeviceId.value) {
          sessionDeviceIds.set(sessionId, connectedScaleDeviceId.value);
          return;
        }

        const deviceId = resolveDeviceIdForSession(sessionId, availableScales.value);
        if (deviceId) {
          await runConnectToScale({ sessionId, deviceId });
          return;
        }

        pendingSelectionSessionId.value = sessionId;
      }).finally(() => {
        sessionReadyPromise = null;
        startAutoConnectInterval();
      });
    }

    return sessionReadyPromise;
  };

  const startAutoConnect = (sessionId: string | number | symbol) => {
    void ensureSessionReady(sessionId);
  };

  const stopAutoConnect = (sessionId: string | number | symbol) => {
    if (activeScaleSessionId.value !== sessionId) return;

    if (pendingSelectionSessionId.value === sessionId) {
      pendingSelectionSessionId.value = null;
    }

    pauseMonitoring();
  };

  const releaseScaleConnection = () => {
    pendingSelectionSessionId.value = null;
    pauseMonitoring();
  };

  const isSessionPendingSelection = (sessionId: string | number | symbol) =>
    pendingSelectionSessionId.value === sessionId;

  const isSessionActive = (sessionId: string | number | symbol) =>
    activeScaleSessionId.value === sessionId;

  const getSessionSelectedDeviceId = (sessionId: string | number | symbol) =>
    sessionDeviceIds.get(sessionId) ?? null;

  return {
    globalWeight,
    isGlobalConnected,
    isGlobalStable,
    isScaleConnecting,
    availableScales,
    pendingSelectionSessionId,
    activeScaleSessionId,
    connectedScaleDeviceId,
    ensureSessionReady,
    startAutoConnect,
    stopAutoConnect,
    releaseScaleConnection,
    forceReconnect,
    refreshScaleDevices,
    selectScaleDevice,
    fetchAvailableScales,
    isSessionPendingSelection,
    isSessionActive,
    getSessionSelectedDeviceId,
  };
}
