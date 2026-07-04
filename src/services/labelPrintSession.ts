/**
 * Quản lý phiên in TSPL: GAP/SIZE chỉ gửi một lần; sau hết giấy chờ user xác nhận đã căn gap.
 */

type GapConfirmHandler = () => Promise<boolean>;

let mediaSetupSent = false;
/** Tem đầu sau khi user xác nhận căn gap tay — SIZE không kèm GAP. */
let omitGapOnNextSetup = false;
let awaitingGapConfirm = false;
let gapConfirmHandler: GapConfirmHandler | null = null;

const TSPL_MEDIA_WITH_GAP = `SIZE 69 mm, 49 mm
GAP 3 mm, 0 mm
REFERENCE 0,0
DIRECTION 1
CODEPAGE UTF-8
`;

const TSPL_MEDIA_NO_GAP = `SIZE 69 mm, 49 mm
REFERENCE 0,0
DIRECTION 1
CODEPAGE UTF-8
`;

export function isAwaitingGapConfirm(): boolean {
  return awaitingGapConfirm;
}

export function isMediaSetupSent(): boolean {
  return mediaSetupSent;
}

/** Đầu phiên / sau reset — gọi khi vào list hoặc ngắt kết nối máy in. */
export function resetLabelPrintSession(): void {
  mediaSetupSent = false;
  omitGapOnNextSetup = false;
  awaitingGapConfirm = false;
}

/** Gọi khi in bị gián đoạn (hết giấy, lỗi giữa chừng). Dừng queue cho đến khi user xác nhận gap. */
export function enterPaperOutWait(): void {
  awaitingGapConfirm = true;
  mediaSetupSent = false;
  omitGapOnNextSetup = false;
}

/**
 * Lấy header media cho tem sắp in. Tem đầu phiên (hoặc sau reset) trả SIZE[+GAP];
 * các tem sau trả chuỗi rỗng — chỉ CLS + nội dung + PRINT.
 */
export function takeTsplMediaPrefix(): string {
  if (mediaSetupSent) {
    return '';
  }

  mediaSetupSent = true;

  if (omitGapOnNextSetup) {
    omitGapOnNextSetup = false;
    return TSPL_MEDIA_NO_GAP;
  }

  return TSPL_MEDIA_WITH_GAP;
}

/** User đã căn gap thủ công — tem tiếp theo in ngay tờ đầu, không gửi GAP. */
export function confirmManualGapAligned(): void {
  awaitingGapConfirm = false;
  mediaSetupSent = false;
  omitGapOnNextSetup = true;
}

export function registerGapConfirmHandler(handler: GapConfirmHandler | null): void {
  gapConfirmHandler = handler;
}

/**
 * Nếu đang chờ xác nhận gap, hiện dialog (qua handler đăng ký từ List).
 * Trả false → caller dừng in / không chạy queue tiếp.
 */
export async function ensureGapConfirmed(): Promise<boolean> {
  if (!awaitingGapConfirm) {
    return true;
  }
  if (!gapConfirmHandler) {
    return false;
  }
  const ok = await gapConfirmHandler();
  if (ok) {
    confirmManualGapAligned();
  }
  return ok;
}

/** Gọi sau khi job in lỗi hoặc in một phần — kích hoạt chờ căn gap. */
export function notifyPrintInterrupted(): void {
  enterPaperOutWait();
}
