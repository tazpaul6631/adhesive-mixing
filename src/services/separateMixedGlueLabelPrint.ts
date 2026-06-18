import separateApi from '@/api/separate';

export type PrintFailureReason =
  | 'bluetooth_disconnect'
  | 'out_of_battery'
  | 'out_of_paper'
  | 'tspl_build'
  | 'skipped_after_error';

export interface SeparateLabelDto {
  glueName?: string;
  styleName?: string;
  productLineName?: string;
  startDate?: string;
  endDate?: string;
  action?: string;
  pasteQrCode?: string;
  separateGlueId?: string | number;
  noSeparateGlueId?: string | number;
  glueWeight?: string;
  startHour?: string;
  startDay?: string;
  endHour?: string;
  endDay?: string;
}

export interface SeparatePrintItem {
  id: string;
  workOrderMasterId: string;
  workOrderMasterName?: string;
  chemicalMasterName?: string;
  separateGlueId?: string;
  noSeparateGlueId?: string;
  labelIndex: number;
  isSeparateGlue: boolean;
  glueId: string;
  qrPath: string;
  startHour?: string;
  startDay?: string;
  endHour?: string;
  endDay?: string;
  labelDto: SeparateLabelDto;
}

export interface FailedPrintItem {
  item: SeparatePrintItem;
  reason: PrintFailureReason;
  message?: string;
}

export interface SeparatePrintBatchResult {
  ok: boolean;
  printedCount: number;
  failedItems: FailedPrintItem[];
  stoppedReason?: PrintFailureReason;
}

export interface PrintSeparateLabelsOptions {
  writeFn: (tspl: string) => Promise<boolean>;
  items: SeparatePrintItem[];
  factoryId: string;
  onProgress?: (current: number, total: number) => void;
  shouldAbort?: () => boolean;
  isConnected?: () => boolean;
}

const LABEL_PRINT_SETTLE_MS = 1200;
const LABEL_PRINT_SETTLE_LARGE_BATCH_MS = 1500;
const LARGE_LABEL_BATCH_THRESHOLD = 15;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const getLabelPrintSettleMs = (batchSize: number) =>
  batchSize >= LARGE_LABEL_BATCH_THRESHOLD
    ? LABEL_PRINT_SETTLE_LARGE_BATCH_MS
    : LABEL_PRINT_SETTLE_MS;

export interface FetchSeparatePrintBatchOptions {
  workOrderMasterId: string;
  isSeparateGlue: boolean;
  confirmBy: string;
  factoryId: string;
  workOrderMasterName?: string;
  chemicalMasterName?: string;
}

const TSPL_FONT_REGULAR = '3';
const TSPL_TEXT_XMUL = 12;
const TSPL_TEXT_YMUL = 12;
const TSPL_TEXT_DATE_XMUL = 12;
const TSPL_TEXT_DATE_YMUL = 12;
const TSPL_TEXT_TIME_XMUL = 20;
const TSPL_TEXT_TIME_YMUL = 20;
const TSPL_BOLD_SIM_OFFSET_DOTS = 2;
const TSPL_LINE_HEIGHT = 40;
const TSPL_LEFT_X = 15;
const TSPL_TEXT_MAX_Y = 370;
const TSPL_MAX_CHARS_FIRST_LINE = 24;
const TSPL_MAX_CHARS_CONTINUATION = 26;
const TSPL_LABEL_WIDTH = 555;
const TSPL_PASTE_QR_MARGIN = 15;
const TSPL_PASTE_QR_BOTTOM_Y = 365;
const TSPL_PASTE_QR_XMUL = 9;
const TSPL_PASTE_QR_YMUL = 9;

const tsplEscape = (value: string) => String(value).replace(/"/g, "'");

const tsplBoldSimCoords = (x: number, y: number, rotation: number, offset: number) => {
  const r = ((rotation % 360) + 360) % 360;
  switch (r) {
    case 90:
      return { x, y: y + offset };
    case 180:
      return { x: x - offset, y };
    case 270:
      return { x, y: y - offset };
    default:
      return { x: x + offset, y };
  }
};

const tsplBoldText = (
  x: number,
  y: number,
  text: string,
  xMul = TSPL_TEXT_XMUL,
  yMul = TSPL_TEXT_YMUL,
  rotation = 0
) => {
  const inner = tsplEscape(text);
  const line = `TEXT ${x},${y},"${TSPL_FONT_REGULAR}",${rotation},${xMul},${yMul},"${inner}"\n`;
  const { x: x2, y: y2 } = tsplBoldSimCoords(x, y, rotation, TSPL_BOLD_SIM_OFFSET_DOTS);
  return (
    line +
    `TEXT ${x2},${y2},"${TSPL_FONT_REGULAR}",${rotation},${xMul},${yMul},"${inner}"\n`
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
  const inner = tsplEscape(text);
  const line = `TEXT ${x},${y},"${TSPL_FONT_REGULAR}",${rotation},${xMul},${yMul},"${inner}"\n`;
  const { x: x2, y: y2 } = tsplBoldSimCoords(x, y, rotation, TSPL_BOLD_SIM_OFFSET_DOTS);
  return (
    line +
    `TEXT ${x2},${y2},"${TSPL_FONT_REGULAR}",${rotation},${xMul},${yMul},"${inner}"\n`
  );
};

const tsplBoldTime = (
  x: number,
  y: number,
  text: string,
  xMul = TSPL_TEXT_TIME_XMUL,
  yMul = TSPL_TEXT_TIME_YMUL,
  rotation = 0
) => {
  const inner = tsplEscape(text);
  const line = `TEXT ${x},${y},"${TSPL_FONT_REGULAR}",${rotation},${xMul},${yMul},"${inner}"\n`;
  const { x: x2, y: y2 } = tsplBoldSimCoords(x, y, rotation, TSPL_BOLD_SIM_OFFSET_DOTS);
  return (
    line +
    `TEXT ${x2},${y2},"${TSPL_FONT_REGULAR}",${rotation},${xMul},${yMul},"${inner}"\n`
  );
};

const appendPasteQrCodeTspl = (baseTspl: string, pasteQrCode?: string): string => {
  const code = pasteQrCode?.trim();
  if (!code) return baseTspl;

  let tspl = baseTspl;

  tspl += tsplBoldText(
    TSPL_LABEL_WIDTH - 30,
    20,
    code,
    TSPL_PASTE_QR_XMUL,
    TSPL_PASTE_QR_YMUL,
    90
  );

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
  return rawText.split(',').map((segment) => segment.trim()).filter(Boolean);
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
  if (!trimmedText) return [label];

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

  return displayLines.length > maxLines ? displayLines.slice(0, maxLines) : displayLines;
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
  const lines = wrapTsplLabeledLines(rawText, label, maxCharsFirstLine, maxCharsContinuation, maxLines);
  let tspl = baseTspl;
  let y = startY;

  lines.forEach((lineText) => {
    if (y + TSPL_LINE_HEIGHT > maxEndY) return;
    tspl += tsplBoldText(x, y, lineText);
    y += TSPL_LINE_HEIGHT;
  });

  return { tspl, nextY: y };
};

const isValidGlueId = (value: unknown) => {
  if (value === null || value === undefined || value === '') return false;
  const normalized = String(value).trim();
  return normalized !== '' && normalized !== '0';
};

export function parseSeparateGlueIdsFromWorkOrder(
  respData: any,
  isSeparateGlue: boolean,
  factoryId: string
): Array<{ factoryId: string; separateGlueId?: string | number; noSeparateGlueId?: string | number }> {
  if (isSeparateGlue) {
    const source = Array.isArray(respData?.separateGlues) ? respData.separateGlues : [];
    return source
      .map((item: any) => {
        const separateGlueId =
          item?.separateGlueId ?? item?.glueId ?? item?.mixGlueMasterId ?? item?.id;
        if (!isValidGlueId(separateGlueId)) return null;
        return {
          factoryId: String(item?.factoryId || factoryId),
          separateGlueId,
        };
      })
      .filter(Boolean) as Array<{ factoryId: string; separateGlueId: string | number }>;
  }

  const source = Array.isArray(respData?.noSeparateGlues) ? respData.noSeparateGlues : [];
  return source
    .map((item: any) => {
      const noSeparateGlueId = item?.noSeparateGlueId ?? item?.glueId ?? item?.id;
      if (!isValidGlueId(noSeparateGlueId)) return null;
      return {
        factoryId: String(item?.factoryId || factoryId),
        noSeparateGlueId,
      };
    })
    .filter(Boolean) as Array<{ factoryId: string; noSeparateGlueId: string | number }>;
}

/** Lọc items từ postSGQueryResult / postNSGQueryResult theo WO đang in. */
export function parseSeparateGlueIdsFromQueryItems(
  items: any[],
  isSeparateGlue: boolean,
  factoryId: string,
  workOrderMasterId: string,
  workOrderMasterName?: string
): Array<{ factoryId: string; separateGlueId?: string | number; noSeparateGlueId?: string | number }> {
  const matchesWorkOrder = (item: any) => {
    if (item?.workOrderMasterId != null && String(item.workOrderMasterId) === String(workOrderMasterId)) {
      return true;
    }
    if (workOrderMasterName && item?.workOrderMasterName === workOrderMasterName) {
      return true;
    }
    return false;
  };

  const filtered = (Array.isArray(items) ? items : []).filter(matchesWorkOrder);

  if (isSeparateGlue) {
    return filtered
      .map((item: any) => {
        const separateGlueId = item?.separateGlueId;
        if (!isValidGlueId(separateGlueId)) return null;
        return {
          factoryId: String(item?.factoryId || factoryId),
          separateGlueId,
        };
      })
      .filter(Boolean) as Array<{ factoryId: string; separateGlueId: string | number }>;
  }

  return filtered
    .map((item: any) => {
      const noSeparateGlueId = item?.noSeparateGlueId;
      if (!isValidGlueId(noSeparateGlueId)) return null;
      return {
        factoryId: String(item?.factoryId || factoryId),
        noSeparateGlueId,
      };
    })
    .filter(Boolean) as Array<{ factoryId: string; noSeparateGlueId: string | number }>;
}

const QUERY_PAGE_SIZE = 100;
const QUERY_MAX_PAGES = 50;

async function fetchAllSeparateQueryItems(
  options: FetchSeparatePrintBatchOptions
): Promise<any[]> {
  const { factoryId, workOrderMasterId, isSeparateGlue } = options;
  const allItems: any[] = [];
  let page = 1;

  while (page <= QUERY_MAX_PAGES) {
    const payload = {
      factoryId,
      workOrderMasterId,
      page,
      pageSize: QUERY_PAGE_SIZE,
    };

    const response = isSeparateGlue
      ? await separateApi.postSGQueryResult(payload)
      : await separateApi.postNSGQueryResult(payload);

    const data = response.data;
    if (!data?.success) {
      throw new Error(data?.message || 'Không lấy được danh sách tem in.');
    }

    const items = Array.isArray(data.data?.items) ? data.data.items : [];
    allItems.push(...items);

    if (!data.data?.hasNextPage || items.length === 0) {
      break;
    }
    page += 1;
  }

  return allItems;
}

function mapConfirmResponseToPrintQueue(
  options: FetchSeparatePrintBatchOptions,
  glueEntries: Array<{ factoryId: string; separateGlueId?: string | number; noSeparateGlueId?: string | number }>,
  labelRows: SeparateLabelDto[]
): SeparatePrintItem[] {
  const { workOrderMasterId, isSeparateGlue, factoryId, workOrderMasterName, chemicalMasterName } = options;

  return glueEntries.map((entry, index) => {
    const glueId = String(
      isSeparateGlue
        ? entry.separateGlueId ?? labelRows[index]?.separateGlueId
        : entry.noSeparateGlueId ?? labelRows[index]?.noSeparateGlueId
    );
    const labelDto = labelRows[index] || {};
    const qrPath = `${entry.factoryId || factoryId}/${glueId}`;

    return {
      id: `${workOrderMasterId}-${glueId}-${index + 1}`,
      workOrderMasterId,
      workOrderMasterName,
      chemicalMasterName,
      separateGlueId: isSeparateGlue ? glueId : undefined,
      noSeparateGlueId: isSeparateGlue ? undefined : glueId,
      labelIndex: index + 1,
      isSeparateGlue,
      glueId,
      qrPath,
      labelDto: {
        ...labelDto,
        separateGlueId: isSeparateGlue ? glueId : labelDto.separateGlueId,
        noSeparateGlueId: isSeparateGlue ? labelDto.noSeparateGlueId : glueId,
      },
    };
  });
}

export async function fetchSeparatePrintBatchFromWorkOrder(
  options: FetchSeparatePrintBatchOptions
): Promise<SeparatePrintItem[]> {
  const { workOrderMasterId, isSeparateGlue, confirmBy, factoryId, workOrderMasterName } = options;

  const queryItems = await fetchAllSeparateQueryItems(options);

  const glueEntries = parseSeparateGlueIdsFromQueryItems(
    queryItems,
    isSeparateGlue,
    factoryId,
    workOrderMasterId,
    workOrderMasterName
  );

  if (!glueEntries.length) {
    return [];
  }

  const confirmPayload = isSeparateGlue
    ? {
      confirmBy,
      separateGlues: glueEntries.map((entry) => ({
        factoryId: entry.factoryId,
        separateGlueId: entry.separateGlueId,
      })),
    }
    : {
      confirmBy,
      noSeparateGlues: glueEntries.map((entry) => ({
        factoryId: entry.factoryId,
        noSeparateGlueId: entry.noSeparateGlueId,
      })),
    };

  const confirmResponse = isSeparateGlue
    ? await separateApi.postConfirmSG(confirmPayload)
    : await separateApi.postConfirmNSG(confirmPayload);

  const confirmData = confirmResponse.data;
  if (!confirmData?.success) {
    throw new Error(confirmData?.message || 'Xác nhận in tem thất bại.');
  }

  const labelRows = Array.isArray(confirmData.data)
    ? confirmData.data
    : confirmData.data
      ? [confirmData.data]
      : [];

  if (!labelRows.length) {
    return [];
  }

  const normalizedLabelRows =
    labelRows.length === 1 && glueEntries.length > 1
      ? glueEntries.map(() => labelRows[0])
      : labelRows;

  if (normalizedLabelRows.length !== glueEntries.length) {
    throw new Error(
      `API xác nhận trả ${normalizedLabelRows.length} tem, cần in ${glueEntries.length} tem.`
    );
  }

  return mapConfirmResponseToPrintQueue(options, glueEntries, normalizedLabelRows);
}

export function buildSeparateLabelTspl(item: SeparatePrintItem): string | null {
  const dto = item.labelDto;
  if (!dto?.action || !item.qrPath) return null;
  const { startHour, startDay, endHour, endDay } = dto;
  const qrPayload = `${dto.action}/${item.qrPath}`;

  let tspl = `
SIZE 69 mm, 49 mm
GAP 3 mm, 0 mm
REFERENCE 0,0
DIRECTION 1
CODEPAGE UTF-8
CLS
QRCODE 15,20,H,5,A,0,"${tsplEscape(qrPayload)}"
QRCODE 380,240,H,5,A,0,"${tsplEscape(qrPayload)}"
`;
  tspl += tsplBoldText(180, 40, `Từ:`);
  tspl += tsplBoldTime(230, 25, `${startHour}`);
  tspl += tsplBoldDate(370, 40, `${startDay}`);
  tspl += tsplBoldText(180, 100, `Đến:`);
  tspl += tsplBoldTime(250, 85, `${endHour}`);
  tspl += tsplBoldDate(390, 100, `${endDay}`);
  tspl = appendPasteQrCodeTspl(tspl, dto.pasteQrCode);

  const styleBlock = appendTsplLabeledBlock(
    tspl,
    TSPL_LEFT_X,
    170,
    'Keo:',
    dto.glueName || '',
    TSPL_MAX_CHARS_FIRST_LINE,
    TSPL_MAX_CHARS_CONTINUATION,
    3
  );
  tspl = styleBlock.tspl;

  const weightBlock = appendTsplLabeledBlock(
    tspl,
    TSPL_LEFT_X,
    styleBlock.nextY,
    'Thùng:',
    dto.glueWeight || '',
    TSPL_MAX_CHARS_FIRST_LINE,
    TSPL_MAX_CHARS_CONTINUATION,
    3
  );
  tspl = weightBlock.tspl;

  const productLineBlock = appendTsplLabeledBlock(
    tspl,
    TSPL_LEFT_X,
    weightBlock.nextY,
    'Chuyền:',
    dto.productLineName || '',
    TSPL_MAX_CHARS_FIRST_LINE,
    TSPL_MAX_CHARS_CONTINUATION,
    3
  );
  tspl = productLineBlock.tspl;

  tspl += 'PRINT 1,1\n';
  return tspl;
}

const defaultFailureMessage: Record<PrintFailureReason, string> = {
  bluetooth_disconnect: 'Mất kết nối Bluetooth với máy in.',
  out_of_battery: 'Máy in hết pin.',
  out_of_paper: 'Máy in hết giấy hoặc không đủ giấy in tem còn lại.',
  tspl_build: 'Không tạo được lệnh in tem.',
  skipped_after_error: 'Chưa in do lỗi ở tem trước đó.',
};

function collectRemainingFailures(
  items: SeparatePrintItem[],
  fromIndex: number,
  primaryReason: PrintFailureReason,
  primaryMessage?: string
): FailedPrintItem[] {
  const failures: FailedPrintItem[] = [];

  for (let i = fromIndex; i < items.length; i++) {
    const reason = i === fromIndex ? primaryReason : 'skipped_after_error';
    failures.push({
      item: items[i],
      reason,
      message: i === fromIndex
        ? primaryMessage || defaultFailureMessage[primaryReason]
        : defaultFailureMessage.skipped_after_error,
    });
  }

  return failures;
}

export async function printSeparateLabelsSequential(
  options: PrintSeparateLabelsOptions
): Promise<SeparatePrintBatchResult> {
  const { writeFn, items, onProgress, shouldAbort, isConnected } = options;

  if (!items.length) {
    return { ok: false, printedCount: 0, failedItems: [] };
  }

  let printedCount = 0;
  const total = items.length;
  const settleMs = getLabelPrintSettleMs(total);

  for (let index = 0; index < items.length; index++) {
    if (shouldAbort?.()) {
      return {
        ok: false,
        printedCount,
        failedItems: collectRemainingFailures(items, index, 'skipped_after_error'),
        stoppedReason: 'skipped_after_error',
      };
    }

    if (isConnected && !isConnected()) {
      const failedItems = collectRemainingFailures(
        items,
        index,
        'bluetooth_disconnect',
        defaultFailureMessage.bluetooth_disconnect
      );
      onProgress?.(printedCount, total);
      return {
        ok: false,
        printedCount,
        failedItems,
        stoppedReason: 'bluetooth_disconnect',
      };
    }

    const item = items[index];
    const tspl = buildSeparateLabelTspl(item);
    if (!tspl) {
      const failedItems = collectRemainingFailures(
        items,
        index,
        'tspl_build',
        defaultFailureMessage.tspl_build
      );
      onProgress?.(printedCount, total);
      return {
        ok: false,
        printedCount,
        failedItems,
        stoppedReason: 'tspl_build',
      };
    }

    const writeOk = await writeFn(tspl);

    if (!writeOk) {
      const failedItems = collectRemainingFailures(
        items,
        index,
        'bluetooth_disconnect',
        defaultFailureMessage.bluetooth_disconnect
      );
      onProgress?.(printedCount, total);
      return {
        ok: false,
        printedCount,
        failedItems,
        stoppedReason: 'bluetooth_disconnect',
      };
    }

    printedCount += 1;
    onProgress?.(printedCount, total);

    if (index < items.length - 1) {
      await sleep(settleMs);
    }
  }

  return { ok: true, printedCount, failedItems: [] };
}
