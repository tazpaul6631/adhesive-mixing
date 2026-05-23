import mixGlue from '@/api/mixGlue';

export interface MixGluePrintItem {
  workOrderMasterId: string;
  mixGlueMasterId: string;
  workOrderMasterName?: string;
}

export interface MixGluePrintBatchResult {
  ok: boolean;
  printedCount: number;
  errorStage?: 'empty' | 'tspl' | 'bluetooth';
  errorMessage?: string;
  failedItem?: MixGluePrintItem;
}

const TSPL_FONT_REGULAR = '3';
const USE_TSPL_BOLD_FONT_FILE = false;
const TSPL_FONT_BOLD = '3';
const TSPL_TEXT_XMUL = 12;
const TSPL_TEXT_YMUL = 12;
const TSPL_TEXT_DATE_XMUL = 15;
const TSPL_TEXT_DATE_YMUL = 15;
const TSPL_BOLD_SIM_OFFSET_DOTS = 2;
const TSPL_LINE_HEIGHT = 40;
const TSPL_LEFT_X = 15;
const TSPL_TEXT_MAX_Y = 370;
const TSPL_MAX_CHARS_FIRST_LINE = 24;
const TSPL_MAX_CHARS_CONTINUATION = 26;
const BATCH_CHUNK_SIZE = 10;
/** 69mm @ 203dpi — khớp tọa độ QR/text hiện có (x≈380). */
const TSPL_LABEL_WIDTH = 555;
const TSPL_PASTE_QR_MARGIN = 15;
const TSPL_PASTE_QR_BOTTOM_Y = 365;
const TSPL_PASTE_QR_XMUL = 9;
const TSPL_PASTE_QR_YMUL = 9;

const tsplEscapeForQuote = (s: string) => String(s).replace(/"/g, "'");

const tsplBoldText = (
  x: number,
  y: number,
  text: string,
  xMul = TSPL_TEXT_XMUL,
  yMul = TSPL_TEXT_YMUL,
  rotation = 0
) => {
  const inner = tsplEscapeForQuote(text);
  const font = USE_TSPL_BOLD_FONT_FILE ? TSPL_FONT_BOLD : TSPL_FONT_REGULAR;
  const line = `TEXT ${x},${y},"${font}",${rotation},${xMul},${yMul},"${inner}"\n`;
  if (USE_TSPL_BOLD_FONT_FILE || rotation !== 0) {
    return line;
  }
  return (
    line +
    `TEXT ${x + TSPL_BOLD_SIM_OFFSET_DOTS},${y},"${font}",${rotation},${xMul},${yMul},"${inner}"\n`
  );
};

const tsplBoldDate = (
  x: number,
  y: number,
  text: string,
  xMul = TSPL_TEXT_DATE_XMUL,
  yMul = TSPL_TEXT_DATE_YMUL,
  rotation = 0
) => {
  const inner = tsplEscapeForQuote(text);
  const font = USE_TSPL_BOLD_FONT_FILE ? TSPL_FONT_BOLD : TSPL_FONT_REGULAR;
  const line = `TEXT ${x},${y},"${font}",${rotation},${xMul},${yMul},"${inner}"\n`;
  if (USE_TSPL_BOLD_FONT_FILE || rotation !== 0) {
    return line;
  }
  return (
    line +
    `TEXT ${x + TSPL_BOLD_SIM_OFFSET_DOTS},${y},"${font}",${rotation},${xMul},${yMul},"${inner}"\n`
  );
};

const appendPasteQrCodeTspl = (baseTspl: string, pasteQrCode?: string): string => {
  const code = pasteQrCode?.trim();
  if (!code) return baseTspl;

  let tspl = baseTspl;

  // Góc phải trên — chữ dọc (rotation 90°)
  tspl += tsplBoldText(
    TSPL_LABEL_WIDTH - 30,
    40,
    code,
    TSPL_PASTE_QR_XMUL,
    TSPL_PASTE_QR_YMUL,
    90
  );

  // Góc trái dưới — chữ ngang
  tspl += tsplBoldText(
    TSPL_PASTE_QR_MARGIN,
    TSPL_PASTE_QR_BOTTOM_Y,
    code,
    TSPL_PASTE_QR_XMUL,
    TSPL_PASTE_QR_YMUL,
    0
  );

  return tspl;
};

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
    return displayLines.slice(0, maxLines);
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

export async function buildMixGlueLabelTspl(
  printData: MixGluePrintItem,
  factoryId: string,
  confirmBy: string
): Promise<string | null> {
  const { workOrderMasterId, mixGlueMasterId } = printData;

  const payload = {
    factoryId,
    workOrderMasterId,
    mixGlueMasterId,
    confirmBy,
  };

  const response = await mixGlue.postMGMQIPConfirm(payload);
  if (!response.data?.success) {
    console.error('[mixGlueLabelPrint] postMGMQIPConfirm fail', {
      payload,
      response: response.data,
    });
    return null;
  }

  const { glueName, startDate, endDate, domainApi, action, productLineName, pasteQrCode } = response.data.data;

  let tspl = `
SIZE 69 mm, 49 mm
GAP 0 mm, 0 mm
REFERENCE 0,0
DIRECTION 1
CODEPAGE UTF-8
CLS
QRCODE 15,40,H,4,A,0,"${domainApi}${action}/${payload.factoryId}/${mixGlueMasterId}"
QRCODE 380,240,H,4,A,0,"${domainApi}${action}/${payload.factoryId}/${mixGlueMasterId}"
`;
  tspl += tsplBoldText(180, 40, `Từ:`);
  tspl += tsplBoldDate(230, 37, `${startDate}`);
  tspl += tsplBoldText(180, 100, `Đến:`);
  tspl += tsplBoldDate(250, 97, `${endDate}`);
  tspl = appendPasteQrCodeTspl(tspl, pasteQrCode);

  const styleBlock = appendTsplLabeledBlock(
    tspl,
    TSPL_LEFT_X,
    200,
    'Keo:',
    glueName || '',
    TSPL_MAX_CHARS_FIRST_LINE,
    TSPL_MAX_CHARS_CONTINUATION,
    3
  );
  tspl = styleBlock.tspl;

  const chuyenBlock = appendTsplLabeledBlock(
    tspl,
    TSPL_LEFT_X,
    styleBlock.nextY,
    'Chuyền:',
    productLineName || '',
    TSPL_MAX_CHARS_FIRST_LINE,
    TSPL_MAX_CHARS_CONTINUATION,
    3
  );
  tspl = chuyenBlock.tspl;


  tspl += 'PRINT 1,1\n';

  return tspl;
}

export async function buildMixGlueBatchTspl(
  items: MixGluePrintItem[],
  factoryId: string,
  confirmBy: string
): Promise<{ tspl: string | null; failedItem?: MixGluePrintItem; errorMessage?: string }> {
  const parts: string[] = [];

  for (const item of items) {
    const tspl = await buildMixGlueLabelTspl(item, factoryId, confirmBy);
    if (!tspl) {
      return {
        tspl: null,
        failedItem: item,
        errorMessage: 'postMGMQIPConfirm không trả dữ liệu tem (xem console).',
      };
    }
    parts.push(tspl);
  }

  return { tspl: parts.join('') };
}

export function parsePrintQueueFromBe(
  scanData: any,
  respData: any,
  row: Partial<MixGluePrintItem>
): MixGluePrintItem[] {
  const data = scanData?.data;
  const fromBe = data?.items ?? data?.printList ?? data?.mixGlues;

  if (Array.isArray(fromBe) && fromBe.length > 0) {
    return fromBe
      .map((item: any) => ({
        workOrderMasterId: String(item.workOrderMasterId || row.workOrderMasterId || ''),
        mixGlueMasterId: String(item.mixGlueMasterId || ''),
        workOrderMasterName: item.workOrderMasterName || row.workOrderMasterName,
      }))
      .filter((item) => item.workOrderMasterId && item.mixGlueMasterId);
  }

  const ids = new Set<string>();
  if (respData?.mixGlueMasterId) ids.add(String(respData.mixGlueMasterId));
  (respData?.mixGlues || []).forEach((item: any) => {
    if (item.mixGlueMasterId) ids.add(String(item.mixGlueMasterId));
  });

  return [...ids].map((mixGlueMasterId) => ({
    workOrderMasterId: String(row.workOrderMasterId || respData?.workOrderMasterId || ''),
    mixGlueMasterId,
    workOrderMasterName: row.workOrderMasterName || respData?.workOrderMasterName,
  }));
}

export async function printMixGlueBatch(
  writeFn: (tspl: string) => Promise<boolean>,
  items: MixGluePrintItem[],
  factoryId: string,
  confirmBy: string
): Promise<MixGluePrintBatchResult> {
  if (!items.length) {
    return {
      ok: false,
      printedCount: 0,
      errorStage: 'empty',
      errorMessage: 'Không có tem trong hàng đợi in.',
    };
  }

  let printedCount = 0;

  for (let i = 0; i < items.length; i += BATCH_CHUNK_SIZE) {
    const chunk = items.slice(i, i + BATCH_CHUNK_SIZE);
    const batchResult = await buildMixGlueBatchTspl(chunk, factoryId, confirmBy);
    if (!batchResult.tspl) {
      console.error('[mixGlueLabelPrint] build TSPL fail', {
        chunk,
        failedItem: batchResult.failedItem,
        errorMessage: batchResult.errorMessage,
      });
      return {
        ok: false,
        printedCount,
        errorStage: 'tspl',
        errorMessage: batchResult.errorMessage,
        failedItem: batchResult.failedItem,
      };
    }

    console.info('[mixGlueLabelPrint] gửi TSPL batch', {
      chunkSize: chunk.length,
      tsplLength: batchResult.tspl.length,
      chunk,
    });

    const ok = await writeFn(batchResult.tspl);
    if (!ok) {
      console.error('[mixGlueLabelPrint] Bluetooth write fail', { chunk });
      return {
        ok: false,
        printedCount,
        errorStage: 'bluetooth',
        errorMessage: 'Gửi lệnh in qua Bluetooth thất bại hoặc máy in đã ngắt kết nối.',
        failedItem: chunk[0],
      };
    }

    printedCount += chunk.length;
  }

  return { ok: true, printedCount };
}
