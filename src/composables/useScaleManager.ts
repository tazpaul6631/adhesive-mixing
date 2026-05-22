import { ref } from 'vue';
import { registerPlugin, WebPlugin } from '@capacitor/core';

type ConnectOptions = { pickPort?: boolean };

class SerialScaleWeb extends WebPlugin {
  private port: any = null;
  private reader: any = null;
  private readLoopActive = false;

  async connect(options?: ConnectOptions) {
    await this.disconnect();

    const nav = (navigator as any).serial;
    if (!nav) {
      throw new Error('Web Serial API không được hỗ trợ trên trình duyệt này');
    }

    if (options?.pickPort) {
      this.port = await nav.requestPort();
    } else {
      const ports = await nav.getPorts();
      this.port = ports.length > 0 ? ports[0] : await nav.requestPort();
    }

    await this.port.open({ baudRate: 9600 });
    void this.readLoop();
    return { value: 'connected' };
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
let activeScaleSessionId: string | number | symbol | null = null;

const disconnectHardware = async () => {
  isGlobalConnected.value = false;
  isGlobalStable.value = false;
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

export function useScaleManager() {
  const forceDisconnect = async () => {
    await disconnectHardware();
  };

  const internalStop = async () => {
    if (autoConnectInterval) {
      clearInterval(autoConnectInterval);
      autoConnectInterval = null;
    }
    activeScaleSessionId = null;
    await disconnectHardware();
  };

  const connectToScale = async (options?: { force?: boolean; pickPort?: boolean }) => {
    const force = options?.force ?? false;

    if (connectInProgress) return;
    if (isGlobalConnected.value && !force) return;

    connectInProgress = true;
    isScaleConnecting.value = true;

    try {
      if (force || dataListener || errorListener) {
        await forceDisconnect();
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      errorListener = await SerialScale.addListener('onScaleError', () => {
        void handleStaleConnection();
      });

      dataListener = await SerialScale.addListener('onScaleData', (result: any) => {
        parseScalePayload(String(result?.data ?? ''));
      });

      await SerialScale.connect({ pickPort: options?.pickPort ?? false });

      clearHandshakeTimeout();
      handshakeTimeout = setTimeout(() => {
        if (!isGlobalConnected.value) {
          void handleStaleConnection();
        }
      }, PORT_HANDSHAKE_MS);
    } catch (e) {
      console.error('Lỗi kết nối cân:', e);
      await forceDisconnect();
    } finally {
      connectInProgress = false;
      isScaleConnecting.value = false;
    }
  };

  const forceReconnect = async (
    sessionId: string | number | symbol,
    options?: { pickPort?: boolean }
  ) => {
    activeScaleSessionId = sessionId;
    globalWeight.value = '0.000';
    await connectToScale({ force: true, pickPort: options?.pickPort ?? false });
  };

  const startAutoConnect = (sessionId: string | number | symbol) => {
    if (activeScaleSessionId !== null && activeScaleSessionId !== sessionId) {
      void internalStop();
    }

    activeScaleSessionId = sessionId;
    void connectToScale();

    if (!autoConnectInterval) {
      autoConnectInterval = setInterval(() => {
        if (activeScaleSessionId === null || connectInProgress) return;

        const stale = isGlobalConnected.value
          && lastDataAt > 0
          && Date.now() - lastDataAt > DATA_WATCHDOG_MS;

        if (!isGlobalConnected.value || stale) {
          void connectToScale({ force: stale });
        }
      }, AUTO_RETRY_MS);
    }
  };

  const stopAutoConnect = (sessionId: string | number | symbol) => {
    if (activeScaleSessionId !== sessionId) return;

    activeScaleSessionId = null;
    void internalStop();
  };

  const releaseScaleConnection = () => {
    activeScaleSessionId = null;
    void internalStop();
  };

  return {
    globalWeight,
    isGlobalConnected,
    isGlobalStable,
    isScaleConnecting,
    startAutoConnect,
    stopAutoConnect,
    releaseScaleConnection,
    forceReconnect,
  };
}
