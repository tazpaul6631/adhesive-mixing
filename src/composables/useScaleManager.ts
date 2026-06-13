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

  async connect(options?: ConnectOptions) {
    await this.disconnect();

    const nav = (navigator as any).serial;
    if (!nav) {
      throw new Error('Web Serial API không được hỗ trợ trên trình duyệt này');
    }

    if (options?.pickPort) {
      this.port = await nav.requestPort();
    } else if (options?.deviceId != null && options.deviceId !== '') {
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
      const ports = await nav.getPorts();
      this.grantedPorts = ports;
      if (ports.length !== 1) {
        throw new Error('Vui lòng chọn cân USB trước khi kết nối.');
      }
      this.port = ports[0];
    }

    await this.port.open({ baudRate: 9600 });
    void this.readLoop();
    return { deviceId: options?.deviceId ?? '0', value: 'connected' };
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

const DATA_WATCHDOG_MS = 4000;
const PORT_HANDSHAKE_MS = 6000;
const AUTO_RETRY_MS = 3000;

let dataListener: any = null;
let errorListener: any = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
let handshakeTimeout: ReturnType<typeof setTimeout> | null = null;
let autoConnectInterval: ReturnType<typeof setInterval> | null = null;
let connectInProgress = false;
let dataBuffer = '';
let lastDataAt = 0;

const sessionDeviceIds = new Map<string | number | symbol, string>();

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
  await disconnectHardware();
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
    return devices[0].id;
  }

  const preferred = explicitDeviceId || sessionDeviceIds.get(sessionId);
  if (preferred && devices.some((device) => device.id === preferred)) {
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

  const internalStop = async () => {
    if (autoConnectInterval) {
      clearInterval(autoConnectInterval);
      autoConnectInterval = null;
    }
    pendingSelectionSessionId.value = null;
    activeScaleSessionId.value = null;
    await disconnectHardware();
  };

  const connectHardware = async (deviceId: string) => {
    errorListener = await SerialScale.addListener('onScaleError', () => {
      void handleStaleConnection();
    });

    dataListener = await SerialScale.addListener('onScaleData', (result: any) => {
      parseScalePayload(String(result?.data ?? ''));
    });

    const result = await SerialScale.connect({ deviceId });
    connectedScaleDeviceId.value = result?.deviceId ?? deviceId;

    clearHandshakeTimeout();
    handshakeTimeout = setTimeout(() => {
      if (!isGlobalConnected.value) {
        void handleStaleConnection();
      }
    }, PORT_HANDSHAKE_MS);
  };

  const connectToScale = async (options?: {
    force?: boolean;
    pickPort?: boolean;
    deviceId?: string;
    sessionId?: string | number | symbol;
  }) => {
    const sessionId = options?.sessionId ?? activeScaleSessionId.value;
    if (sessionId == null) return;

    const force = options?.force ?? false;

    if (connectInProgress) return;
    if (isGlobalConnected.value && !force && pendingSelectionSessionId.value === null) return;

    connectInProgress = true;
    isScaleConnecting.value = true;

    try {
      if (force || dataListener || errorListener) {
        await forceDisconnect();
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      if (options?.pickPort) {
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

      pendingSelectionSessionId.value = null;
      sessionDeviceIds.set(sessionId, deviceId);
      await connectHardware(deviceId);
    } catch (e) {
      console.error('Lỗi kết nối cân:', e);
      await forceDisconnect();
    } finally {
      connectInProgress = false;
      isScaleConnecting.value = false;
    }
  };

  const selectScaleDevice = async (
    sessionId: string | number | symbol,
    deviceId: string
  ) => {
    if (!deviceId) return;

    activeScaleSessionId.value = sessionId;
    sessionDeviceIds.set(sessionId, deviceId);
    pendingSelectionSessionId.value = null;
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
    await new Promise((resolve) => setTimeout(resolve, 350));

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

  const startAutoConnect = (sessionId: string | number | symbol) => {
    if (activeScaleSessionId.value !== null && activeScaleSessionId.value !== sessionId) {
      void internalStop();
    }

    activeScaleSessionId.value = sessionId;
    void connectToScale({ sessionId });

    if (!autoConnectInterval) {
      autoConnectInterval = setInterval(() => {
        if (activeScaleSessionId.value === null || connectInProgress) return;
        if (pendingSelectionSessionId.value !== null) return;

        const stale = isGlobalConnected.value
          && lastDataAt > 0
          && Date.now() - lastDataAt > DATA_WATCHDOG_MS;

        if (!isGlobalConnected.value || stale) {
          void connectToScale({ sessionId: activeScaleSessionId.value!, force: stale });
        }
      }, AUTO_RETRY_MS);
    }
  };

  const stopAutoConnect = (sessionId: string | number | symbol) => {
    if (activeScaleSessionId.value !== sessionId) return;

    if (pendingSelectionSessionId.value === sessionId) {
      pendingSelectionSessionId.value = null;
    }

    activeScaleSessionId.value = null;
    void internalStop();
  };

  const releaseScaleConnection = () => {
    pendingSelectionSessionId.value = null;
    activeScaleSessionId.value = null;
    void internalStop();
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
