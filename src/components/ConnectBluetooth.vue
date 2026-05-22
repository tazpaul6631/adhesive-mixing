<template>
  <div class="flex align-items-center gap-2 flex-wrap">
    <span v-if="status === 'connected'" class="text-green-600 font-medium text-sm">
      <i class="pi pi-check-circle"></i> Đã kết nối máy in
    </span>
    <span v-else-if="status === 'scanning'" class="text-orange-500 font-medium text-sm">
      <i class="pi pi-spin pi-spinner"></i> {{ scanningLabel }}
    </span>
    <span v-else class="text-red-500 font-medium text-sm fade-blink">
      <i class="pi pi-bluetooth"></i> Chưa kết nối máy in
    </span>

    <Button v-if="status === 'connected'" icon="pi pi-times" severity="secondary" text rounded size="small"
      title="Ngắt kết nối máy in" aria-label="Ngắt kết nối máy in" @click="disconnect" />

    <Button v-else-if="status === 'scanning'" label="Hủy" icon="pi pi-times" severity="secondary" text size="small"
      @click="cancelConnection" />

    <Button v-else icon="pi pi-refresh" severity="primary" text outlined size="large" class="bt-refresh-btn"
      title="Tìm lại / kết nối máy in" aria-label="Tìm lại máy in" @click="refreshScan" />

    <!-- Nút In — chỉ bật khi đã kết nối máy in -->
    <Button :label="isPrinting ? 'Đang in...' : 'Xác nhận hoàn thành'" icon="pi pi-print" outlined size="large"
      :disabled="!canPrint" @click="printLabel" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue';
import { Button } from 'primevue';
import { Preferences } from '@capacitor/preferences';
import format from '@/mixins/format';
import { useAuthStore } from '@/store/auth';
import mixGlue from '@/api/mixGlue';
import separateGlue from '@/api/separate';

const props = defineProps<{
  templateType?: string;
  printData?: any;
  /** Vào page: tự bật Bluetooth (nếu cần) và tự quét/kết nối máy in. */
  autoEnableOnEnter?: boolean;
  /** Rời page: tắt Bluetooth adapter (Android). Mặc định false. */
  autoDisableOnLeave?: boolean;
  /** Rời page: ngắt kết nối máy in. false = giữ kết nối khi quay list → confirm liên tục. */
  disconnectOnLeave?: boolean;
}>();

const autoEnableOnEnter = props.autoEnableOnEnter ?? true;
const autoDisableOnLeave = props.autoDisableOnLeave ?? false;
const disconnectOnLeave = props.disconnectOnLeave ?? false;

const status = ref<'disconnected' | 'scanning' | 'connected'>('disconnected');
const scanPhase = ref<'saved-mac' | 'discover'>('discover');
const selectedMac = ref<string>('');
const isPrinting = ref(false);
const authStore = useAuthStore();
let autoReconnectInterval: ReturnType<typeof setInterval> | null = null;
let pendingInitTimer: ReturnType<typeof setTimeout> | null = null;
let scanAborted = false;
/** discoverUnpaired trên Android thường chậm — giới hạn thời gian quét. */
const DISCOVER_UNPAIRED_TIMEOUT_MS = 4000;
const SAVED_MAC_CONNECT_TIMEOUT_MS = 6000;
const INIT_RETRY_DELAYS_MS = [0, 400, 900, 1500];

let connectFlowPromise: Promise<void> | null = null;

const scanningLabel = computed(() =>
  scanPhase.value === 'saved-mac'
    ? 'Đang kết nối máy in đã lưu...'
    : 'Đang tìm máy in...'
);

const canPrint = computed(() => status.value === 'connected' && !isPrinting.value);
const emit = defineEmits(['printSuccess']);

const getBluetooth = () => (window as any).bluetoothSerial;

/** Ưu tiên B300, TSC và các tên máy in tem phổ biến. */
const PRINTER_NAME_PATTERNS = [/b300/i, /tsc/i, /printer/i, /label/i, /barcode/i, /spp/i];

const isLikelyPrinter = (name?: string) => {
  if (!name) return false;
  return PRINTER_NAME_PATTERNS.some((pattern) => pattern.test(name));
};

/** Lấy danh sách máy in có thể thử — ưu tiên MAC đã lưu, sau đó B300/TSC. */
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

const ensureBluetoothEnabled = (onReady: () => void, onFailure?: (err: unknown) => void) => {
  const bt = getBluetooth();
  if (!bt) return;

  bt.isEnabled(
    () => onReady(),
    () => {
      bt.enable(
        () => {
          console.log('Bluetooth đã được bật tự động.');
          onReady();
        },
        (err: any) => {
          console.log('Không thể bật Bluetooth:', err);
          onFailure?.(err);
        }
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

const tryConnectSavedMac = async (savedMac: string): Promise<boolean> => {
  if (!savedMac || scanAborted) return false;

  scanPhase.value = 'saved-mac';
  const connected = await tryConnectDirect(savedMac, SAVED_MAC_CONNECT_TIMEOUT_MS);
  if (scanAborted) return false;

  if (connected) {
    await savePrinterMac(savedMac);
    status.value = 'connected';
    console.log(`Kết nối nhanh MAC đã lưu: ${savedMac}`);
    return true;
  }

  return false;
};

/** Tự tìm máy in — ưu tiên MAC đã lưu, sau đó quét paired/unpaired. */
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
    const savedMac = selectedMac.value || await getSavedPrinterMac();
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
      console.log('Không tìm thấy máy in B300/TSC đang phát Bluetooth.');
      return;
    }

    const connectedDevice = await tryConnectCandidates(candidates);
    if (scanAborted) return;

    if (connectedDevice?.address) {
      await savePrinterMac(connectedDevice.address);
      status.value = 'connected';
      console.log(`MÁY IN ĐÃ SẴN SÀNG: ${connectedDevice.name || connectedDevice.address}`);
      return;
    }

    status.value = 'disconnected';
    console.log('Không kết nối được máy in nào — có thể tất cả đang được dùng bởi thiết bị khác.');
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
      resolve();
      return;
    }

    bt.isConnected(
      () => {
        bt.disconnect(
          () => {
            status.value = 'disconnected';
            console.log('Đã ngắt kết nối máy in.');
            resolve();
          },
          () => resolve()
        );
      },
      () => resolve()
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
          () => {
            console.log('Đã tắt Bluetooth để tiết kiệm pin.');
            resolve();
          },
          (err: any) => {
            console.log('Không thể tắt Bluetooth (có thể bị hạn chế trên thiết bị):', err);
            resolve();
          }
        );
      },
      () => resolve()
    );
  });
};

/** Bật BT (nếu cần) rồi tự quét + kết nối máy in. */
const startBluetoothAutoFlow = (
  onEnableFailed?: () => void,
  options?: { force?: boolean },
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
          startBluetoothAutoFlow(onEnableFailed, options, pluginRetry + 1).then(finish);
        }, 400);
      } else {
        console.error('Plugin bluetoothSerial chưa load sau nhiều lần thử.');
        finish();
      }
      return;
    }

    ensureBluetoothEnabled(
      () => {
        void (async () => {
          try {
            const force = options?.force ?? false;

            if (!force && await isAlreadyConnected()) {
              status.value = 'connected';
              if (!selectedMac.value) {
                selectedMac.value = await getSavedPrinterMac();
              }
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

const refreshScan = () => {
  scanAborted = false;
  void startBluetoothAutoFlow(undefined, { force: true });
};

// --- User bấm refresh / thử lại khi auto-connect thất bại ---
const turnOnAndScan = () => {
  const bt = getBluetooth();
  if (!bt) return console.error('Plugin bluetoothSerial chưa load.');

  scanAborted = false;
  void startBluetoothAutoFlow(() => bt.showBluetoothSettings?.(), { force: true });
};

const cancelConnection = () => {
  scanAborted = true;
  status.value = 'disconnected';

  const bt = getBluetooth();
  if (bt) {
    bt.disconnect(() => console.log('Đã hủy kết nối/quét.'));
  }
};

// --- Cơ chế theo dõi và tự động kết nối lại ---
const startAutoReconnectWatchdog = () => {
  if (autoReconnectInterval) {
    clearInterval(autoReconnectInterval);
    autoReconnectInterval = null;
  }

  autoReconnectInterval = setInterval(() => {
    const bt = getBluetooth();
    if (!bt) return;

    // Kiểm tra xem máy in thực tế còn kết nối không
    bt.isConnected(
      () => {
        // Vẫn đang kết nối ổn định -> Cập nhật UI cho chắc chắn
        if (status.value !== 'connected') status.value = 'connected';
      },
      () => {
        // Phát hiện rớt kết nối
        if (status.value === 'connected') {
          console.log("Phát hiện rớt kết nối Bluetooth!");
          status.value = 'disconnected';
        }

        // Tự động thử kết nối lại nếu đang ngắt và Bluetooth đang bật
        if (status.value === 'disconnected') {
          bt.isEnabled(
            () => {
              void (async () => {
                const savedMac = selectedMac.value || await getSavedPrinterMac();
                if (savedMac) selectedMac.value = savedMac;
                console.log('Đang tự động thử kết nối lại máy in...');
                await autoConnectPrinter();
              })();
            },
            () => { }
          );
        }
      }
    );
  }, 5000); // Kiểm tra mỗi 5 giây (bạn có thể điều chỉnh 3000ms hoặc 5000ms)
};

const syncStatusFromHardware = async (): Promise<boolean> => {
  if (!await isAlreadyConnected()) {
    if (status.value === 'connected') {
      status.value = 'disconnected';
    }
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

    const delay = INIT_RETRY_DELAYS_MS[attempt];
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
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

// --- Vào page: tự bật BT (nếu cần) + tự kết nối MAC đã lưu / quét máy in ---
const initBluetooth = async () => {
  if (!autoEnableOnEnter) return;

  scanAborted = false;

  if (pendingInitTimer) {
    clearTimeout(pendingInitTimer);
    pendingInitTimer = null;
  }

  const savedMac = await getSavedPrinterMac();
  if (savedMac) {
    selectedMac.value = savedMac;
  }

  void runConnectWithRetry();
};

// --- 4. Ngắt kết nối thủ công ---
const disconnect = () => {
  const bt = getBluetooth();
  if (bt) {
    bt.disconnect(() => {
      status.value = 'disconnected';
      console.log('Đã ngắt kết nối.');
    });
  }
};

/** Tạm dừng watchdog khi rời page — giữ kết nối máy in nếu disconnectOnLeave=false. */
const pauseBluetooth = () => {
  scanAborted = true;

  if (pendingInitTimer) {
    clearTimeout(pendingInitTimer);
    pendingInitTimer = null;
  }
  if (autoReconnectInterval) {
    clearInterval(autoReconnectInterval);
    autoReconnectInterval = null;
  }
};

// --- Rời page: mặc định chỉ pause; hard disconnect khi unmount hoặc disconnectOnLeave=true ---
const cleanupBluetooth = (hard = disconnectOnLeave) => {
  pauseBluetooth();

  if (!hard) {
    return;
  }

  status.value = 'disconnected';
  scanPhase.value = 'discover';

  void (async () => {
    await disconnectDevice();

    if (autoDisableOnLeave) {
      await disableBluetoothAdapter();
    }
  })();
};

onMounted(() => {
  void initBluetooth();
});

onActivated(() => {
  void initBluetooth();
});

onUnmounted(() => {
  cleanupBluetooth(true);
});

defineExpose({
  initBluetooth,
  pauseBluetooth,
  cleanupBluetooth,
  refreshScan,
});

// --- TSPL chữ đậm: TSC không có "font-weight"; dùng font đậm trong máy hoặc in 2 lớp lệch dot ---
const TSPL_FONT_REGULAR = "3";
// Đặt true nếu đã nạp font đậm (ARIALBD.TTF) vào máy. Tên file .TTF phải khớp đúng máy in.
const USE_TSPL_BOLD_FONT_FILE = false;
const TSPL_FONT_BOLD = '3';
const TSPL_TEXT_XMUL = 11;
const TSPL_TEXT_YMUL = 11;
/** Khi không dùng font đậm: in lệnh TEXT lần 2 lệch N dot theo trục X để nét dày hơn. */
const TSPL_BOLD_SIM_OFFSET_DOTS = 2;

const tsplEscapeForQuote = (s: string) => String(s).replace(/"/g, "'");

/**
 * Trả về 1–2 dòng lệnh TEXT (đậm). Không áp dụng cho QRCODE.
 */
const tsplBoldText = (x: number, y: number, text: string, xMul = TSPL_TEXT_XMUL, yMul = TSPL_TEXT_YMUL) => {
  const inner = tsplEscapeForQuote(text);
  const font = USE_TSPL_BOLD_FONT_FILE ? TSPL_FONT_BOLD : TSPL_FONT_REGULAR;
  if (USE_TSPL_BOLD_FONT_FILE) {
    return `TEXT ${x},${y},"${font}",0,${xMul},${yMul},"${inner}"\n`;
  }
  return (
    `TEXT ${x},${y},"${font}",0,${xMul},${yMul},"${inner}"\n` +
    `TEXT ${x + TSPL_BOLD_SIM_OFFSET_DOTS},${y},"${font}",0,${xMul},${yMul},"${inner}"\n`
  );
};

const TSPL_LINE_HEIGHT = 40;
const TSPL_LEFT_X = 15;
const TSPL_TEXT_MAX_Y = 370;
/** QR phải thường ở x=420; dòng 1 gồm nhãn + nội dung phải nằm trước vị trí này. */
const TSPL_MAX_CHARS_FIRST_LINE = 24;
/** Các dòng tiếp theo in tại x=15, rộng hơn vì không có nhãn. */
const TSPL_MAX_CHARS_CONTINUATION = 26;

const splitTsplTextSegments = (rawText: string): string[] => {
  if (!rawText) return [];

  return rawText
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const expandLongTsplSegments = (segments: string[], maxCharsPerLine: number): string[] => {
  const expanded: string[] = [];

  segments.forEach((segment) => {
    if (segment.length <= maxCharsPerLine) {
      expanded.push(segment);
      return;
    }

    let remaining = segment;
    while (remaining.length > maxCharsPerLine) {
      let cutAt = remaining.lastIndexOf(' ', maxCharsPerLine);
      if (cutAt <= 0) cutAt = maxCharsPerLine;

      expanded.push(remaining.slice(0, cutAt).trim());
      remaining = remaining.slice(cutAt).trim();
    }

    if (remaining) expanded.push(remaining);
  });

  return expanded;
};

const wrapTsplLabeledLines = (
  rawText: string,
  label: string,
  maxCharsFirstLine: number,
  maxCharsContinuation: number,
  maxLines: number
): string[] => {
  const labelPrefix = `${label} `;
  const trimmedText = rawText.trim();

  if (!trimmedText) {
    return [label];
  }

  const firstLineContentLimit = Math.max(1, maxCharsFirstLine - labelPrefix.length);
  const segments = expandLongTsplSegments(splitTsplTextSegments(trimmedText), maxCharsContinuation);
  const contentLines: string[] = [];
  let currentLine = '';
  let isFirstContentLine = true;

  const getCurrentLimit = () => (isFirstContentLine ? firstLineContentLimit : maxCharsContinuation);

  segments.forEach((segment) => {
    const testLine = currentLine.length === 0 ? segment : `${currentLine}, ${segment}`;
    if (testLine.length > getCurrentLimit()) {
      if (currentLine) {
        contentLines.push(currentLine);
        isFirstContentLine = false;
      }
      currentLine = segment;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) contentLines.push(currentLine);

  const displayLines = [`${labelPrefix}${contentLines[0]}`];
  for (let i = 1; i < contentLines.length; i++) {
    displayLines.push(contentLines[i]);
  }

  if (displayLines.length > maxLines) {
    const truncated = displayLines.slice(0, maxLines);
    truncated[maxLines - 1] = `${truncated[maxLines - 1]}`;
    return truncated;
  }

  return displayLines;
};

const appendTsplLabeledBlock = (
  baseTspl: string,
  x: number,
  startY: number,
  label: string,
  rawText: string,
  maxCharsFirstLine: number,
  maxCharsContinuation: number,
  maxLines: number,
  maxEndY = TSPL_TEXT_MAX_Y
): { tspl: string; nextY: number } => {
  const lines = wrapTsplLabeledLines(
    rawText,
    label,
    maxCharsFirstLine,
    maxCharsContinuation,
    maxLines
  );
  let tspl = baseTspl;
  let y = startY;

  lines.forEach((lineText) => {
    if (y + TSPL_LINE_HEIGHT > maxEndY) return;
    tspl += tsplBoldText(x, y, lineText);
    y += TSPL_LINE_HEIGHT;
  });

  return { tspl, nextY: y };
};

// --- 6. Logic In TSPL ---
const printLabel = async () => {
  const bt = getBluetooth();
  if (!bt || status.value !== 'connected') return alert("Máy in chưa sẵn sàng!");
  if (!props.printData) return alert("Không tìm thấy dữ liệu để in!");

  isPrinting.value = true;
  let tspl = '';

  try {
    if (props.templateType === 'mix_glue') {
      const { workOrderMasterId, mixGlueMasterId } = props.printData;

      const payload = {
        factoryId: authStore.user?.factoryId,
        workOrderMasterId: workOrderMasterId,
        mixGlueMasterId: mixGlueMasterId
      };

      const response = await mixGlue.postMGMQIPConfirm(payload);

      if (response.data?.success) {
        const { styleName, startDate, endDate, domainApi, action, productLineName } = response.data.data;

        const formattedStart = format.formatDate(startDate);
        const formattedEnd = format.formatDate(endDate);

        // 1. Khởi tạo TSPL: phần cố định + mã QR; chữ dùng tsplBoldText
        tspl = `
SIZE 69 mm, 49 mm
GAP 3 mm, 0 mm
REFERENCE 0,0
DIRECTION 1
CODEPAGE UTF-8
CLS
QRCODE 15,40,H,4,A,0,"${domainApi}${action}/${payload.factoryId}/${mixGlueMasterId}"
QRCODE 380,240,H,4,A,0,"${domainApi}${action}/${payload.factoryId}/${mixGlueMasterId}"
`;
        tspl += tsplBoldText(180, 40, 'Từ ngày:');
        tspl += tsplBoldText(180, 80, formattedStart);
        tspl += tsplBoldText(180, 120, 'Đến ngày:');
        tspl += tsplBoldText(180, 160, formattedEnd);

        const chuyenBlock = appendTsplLabeledBlock(
          tspl,
          TSPL_LEFT_X,
          200,
          'Chuyền:',
          productLineName || '',
          TSPL_MAX_CHARS_FIRST_LINE,
          TSPL_MAX_CHARS_CONTINUATION,
          3
        );
        tspl = chuyenBlock.tspl;

        const styleBlock = appendTsplLabeledBlock(
          tspl,
          TSPL_LEFT_X,
          chuyenBlock.nextY,
          'Hình thể:',
          styleName || '',
          TSPL_MAX_CHARS_FIRST_LINE,
          TSPL_MAX_CHARS_CONTINUATION,
          3
        );
        tspl = styleBlock.tspl;

        tspl += `PRINT 1,1\n`;

      } else {
        alert(`Lỗi API: ${response.data?.message}`);
        isPrinting.value = false;
        return;
      }
    }
    else if (props.templateType === 'separate') {
      const printData = props.printData;
      let response;
      let qrCodeParams = '';

      // 1. Phân loại Keo Trộn (Mixed) hay Keo Không Trộn (No Mix) dựa vào key của printData
      if (printData.separateGlueId) {
        // --- LOGIC CHO KEO CHIẾT ---
        const payloadMix = {
          factoryId: authStore.user?.factoryId,
          separateGlueId: printData.separateGlueId
        };

        response = await separateGlue.postConfirmSG(payloadMix);
        qrCodeParams = `${payloadMix.factoryId}/${payloadMix.separateGlueId}`;

      } else if (printData.noSeparateGlueId) {
        // --- LOGIC CHO KEO KHÔNG CHIẾT ---
        const payloadNoMix = {
          factoryId: authStore.user?.factoryId,
          noSeparateGlueId: printData.noSeparateGlueId
        };

        response = await separateGlue.postConfirmNSG(payloadNoMix);
        qrCodeParams = `${payloadNoMix.factoryId}/${payloadNoMix.noSeparateGlueId}`;
      } else {
        alert("Dữ liệu in không hợp lệ!");
        isPrinting.value = false;
        return;
      }

      // 2. Xử lý kết quả trả về từ API (Chung cho cả 2 loại)
      if (response && response.data?.success) {
        const { styleName, startDate, endDate, domainApi, action, productLineName } = response.data.data;

        const formattedStart = format.formatDate(startDate);
        const formattedEnd = format.formatDate(endDate);

        // Khởi tạo TSPL với tọa độ chuẩn
        tspl = `
SIZE 69 mm, 49 mm
GAP 3 mm, 0 mm
REFERENCE 0,0
DIRECTION 1
CODEPAGE UTF-8
CLS
QRCODE 15,40,H,4,A,0,"${domainApi}${action}/${qrCodeParams}"
QRCODE 380,240,H,4,A,0,"${domainApi}${action}/${qrCodeParams}"
`;
        tspl += tsplBoldText(180, 40, 'Từ ngày:');
        tspl += tsplBoldText(180, 80, formattedStart);
        tspl += tsplBoldText(180, 120, 'Đến ngày:');
        tspl += tsplBoldText(180, 160, formattedEnd);

        const productLineBlock = appendTsplLabeledBlock(
          tspl,
          TSPL_LEFT_X,
          200,
          'Chuyền:',
          productLineName || '',
          TSPL_MAX_CHARS_FIRST_LINE,
          TSPL_MAX_CHARS_CONTINUATION,
          3
        );
        tspl = productLineBlock.tspl;

        const styleBlock = appendTsplLabeledBlock(
          tspl,
          TSPL_LEFT_X,
          productLineBlock.nextY,
          'Hình thể:',
          styleName || '',
          TSPL_MAX_CHARS_FIRST_LINE,
          TSPL_MAX_CHARS_CONTINUATION,
          3
        );
        tspl = styleBlock.tspl;

        tspl += `PRINT 1,1\n`;

      } else {
        alert(`Lỗi API: ${response?.data?.message || 'Không thể xác nhận'}`);
        isPrinting.value = false;
        return;
      }
    }

    if (!tspl) {
      alert("Lỗi mẫu tem hoặc không có dữ liệu!");
      isPrinting.value = false;
      return;
    }

    // Gửi lệnh in qua Bluetooth
    const dataArray = new TextEncoder().encode(tspl);
    bt.write(dataArray.buffer, () => {
      console.log(`Đã in thành công mẫu: ${props.templateType}`);
      isPrinting.value = false;
      emit('printSuccess');
    }, (err: any) => {
      console.log("Lỗi in: " + JSON.stringify(err));
      status.value = 'disconnected';
      isPrinting.value = false;
    });

  } catch (error) {
    console.error("Lỗi khi xử lý in:", error);
    alert("Đã xảy ra lỗi khi gọi API in. Vui lòng kiểm tra kết nối mạng!");
    isPrinting.value = false;
  }
};
</script>

<style scoped>
.fade-blink {
  animation: fadeBlink 1.5s infinite;
}

@keyframes fadeBlink {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }
}

.bt-refresh-btn {
  width: 2rem;
  height: 2rem;
  padding: 0;
}
</style>