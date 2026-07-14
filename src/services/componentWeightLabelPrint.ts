import format from '@/mixins/format';
import { normalizeWeightUnit } from '@/utils/weightUnit';
import { takeTsplMediaPrefix } from '@/services/labelPrintSession';

/** Tem 69×49 mm @ ~203dpi — khớp labelPrintSession SIZE. */
const TSPL_FONT = '5';
const TSPL_LEFT_X = 13;
const TSPL_START_Y = 30;
const TSPL_MAX_Y = 400;
/** Độ rộng chữ in được trên 69mm (trừ lề trái). */
const TSPL_MAX_CHARS_FIRST_LINE = 24;
const TSPL_MAX_CHARS_CONTINUATION = 26;

/** Cỡ chữ (xmul/ymul) theo từng nhóm dòng. */
const MUL_WO_GLUE = 12;
const MUL_MATERIAL = 17;
const MUL_META = 14;

/**
 * Khoảng trắng sau mỗi dòng (giống 1→2 đang đúng).
 * Bước y = mul của DÒNG VỪA IN + gap — không dùng max(MUL) chung.
 * Lỗi trước: mọi dòng + (max MUL + gap) → sau dòng MUL=18 khoảng trắng gần hết → 2→3… dính.
 */
const TSPL_LINE_GAP = 30;
const lineStep = (mul: number) => mul + TSPL_LINE_GAP;

/** Offset in đậm giả (px/dots). 0 = không đậm. */
const BOLD_OFFSET_NONE = 0;
const BOLD_OFFSET_MATERIAL = 3;
const BOLD_OFFSET_META = 2;

const escape = (s: string) => String(s ?? '').replace(/"/g, "'");

/** TEXT thường hoặc in đậm giả (in 2 lần lệch theo offset). */
const textLine = (x: number, y: number, value: string, mul: number, boldOffset = BOLD_OFFSET_NONE): string => {
  const inner = escape(value);
  const l1 = `TEXT ${x},${y},"${TSPL_FONT}",0,${mul},${mul},"${inner}"\n`;
  if (!boldOffset) return l1;
  return `${l1}TEXT ${x + boldOffset},${y},"${TSPL_FONT}",0,${mul},${mul},"${inner}"\n`;
};

type WrapStyle = { mul: number; boldOffset?: number };

/**
 * Wrap theo bề ngang tem 69mm.
 * Mỗi dòng wrap bước theo mul của style (cùng công thức lineStep).
 */
const wrapBlock = (
  label: string,
  value: string,
  x: number,
  y: number,
  maxLines = 3,
  style: WrapStyle = { mul: MUL_META, boldOffset: BOLD_OFFSET_META }
): { lines: string; nextY: number } => {
  const trimmed = String(value ?? '').trim();
  const labelPrefix = label;
  const labelLen = [...labelPrefix].length;
  const firstContentLimit = Math.max(1, TSPL_MAX_CHARS_FIRST_LINE - labelLen);
  const boldOffset = style.boldOffset ?? BOLD_OFFSET_NONE;
  const step = lineStep(style.mul);

  const rows: string[] = [];
  if (!trimmed) {
    rows.push(labelPrefix.trimEnd());
  } else {
    const chars = [...trimmed];
    let pos = 0;

    const firstChunk = chars.slice(0, firstContentLimit).join('');
    rows.push(`${labelPrefix}${firstChunk}`);
    pos = firstContentLimit;

    while (pos < chars.length && rows.length < maxLines) {
      rows.push(chars.slice(pos, pos + TSPL_MAX_CHARS_CONTINUATION).join(''));
      pos += TSPL_MAX_CHARS_CONTINUATION;
    }
  }

  let tspl = '';
  let curY = y;
  for (const row of rows) {
    if (curY + step > TSPL_MAX_Y) break;
    tspl += textLine(x, curY, row, style.mul, boldOffset);
    curY += step;
  }

  return { lines: tspl, nextY: curY };
};

/** Số dòng wrap còn vừa chiều cao tem 49mm từ vị trí y hiện tại. */
const remainingWrapLines = (y: number, mul: number, hardMax = 4): number => {
  const step = lineStep(mul);
  const room = Math.floor((TSPL_MAX_Y - y) / step);
  return Math.max(1, Math.min(hardMax, room));
};

/** hh:mm:ss dd/MM — bỏ năm để tiết kiệm chỗ trên tem. */
const formatLabelTime = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm}:${ss} ${dd}/${mo}`;
};

export interface ComponentWeightLabelData {
  workOrderMasterName: string;
  requestTime?: string;
  glueName: string;
  materialName: string;
  actualWeight: string;
  weightUnit: string;
  weighingTime?: string;
  /** Mã số từ API printmixglue (`data`). */
  labelCode: string;
}

export function buildComponentWeightLabelTspl(data: ComponentWeightLabelData): string {
  const { workOrderMasterName, requestTime, glueName, materialName, actualWeight, weightUnit, weighingTime, labelCode } = data;

  const requestTimeDisplay = formatLabelTime(requestTime);
  const weightDisplay = actualWeight
    ? `${format.formatDisplayWeight(actualWeight)} ${normalizeWeightUnit(weightUnit)}`.trim()
    : '';
  const weighingTimeDisplay = formatLabelTime(weighingTime);

  const mediaPrefix = takeTsplMediaPrefix();
  let tspl = `${mediaPrefix}CLS
`;

  let y = TSPL_START_Y;

  // Dòng 1: WO — bước theo MUL_WO_GLUE
  tspl += textLine(TSPL_LEFT_X, y, workOrderMasterName, MUL_WO_GLUE, BOLD_OFFSET_NONE);
  y += lineStep(MUL_WO_GLUE);

  // Dòng 2: Keo — bước theo MUL_MATERIAL
  if (y + lineStep(MUL_MATERIAL) <= TSPL_MAX_Y) {
    tspl += textLine(TSPL_LEFT_X, y, `Keo: ${materialName}`, MUL_MATERIAL, BOLD_OFFSET_MATERIAL);
    y += lineStep(MUL_MATERIAL) + 5;
  }

  // Dòng 3–6: meta — bước theo MUL_META
  const metaStep = lineStep(MUL_META) + 5;

  if (requestTimeDisplay && y + metaStep <= TSPL_MAX_Y) {
    tspl += textLine(TSPL_LEFT_X, y, `Thời gian lãnh: ${requestTimeDisplay}`, MUL_META, BOLD_OFFSET_META);
    y += metaStep;
  }

  if (weightDisplay && y + metaStep <= TSPL_MAX_Y) {
    tspl += textLine(TSPL_LEFT_X, y, `Trọng lượng: ${weightDisplay}`, MUL_META, BOLD_OFFSET_META);
    y += metaStep;
  }

  if (weighingTimeDisplay && y + metaStep <= TSPL_MAX_Y) {
    tspl += textLine(TSPL_LEFT_X, y, `Thời gian cân: ${weighingTimeDisplay}`, MUL_META, BOLD_OFFSET_META);
    y += metaStep;
  }

  if (labelCode && y + metaStep <= TSPL_MAX_Y) {
    tspl += textLine(TSPL_LEFT_X, y, `Mã số: ${labelCode}`, MUL_META, BOLD_OFFSET_META);
    y += metaStep;
  }

  // Dòng 7: Keo trộn — bước theo MUL_WO_GLUE
  const glueBlock = wrapBlock(
    'Keo trộn: ',
    glueName,
    TSPL_LEFT_X,
    y,
    remainingWrapLines(y, MUL_WO_GLUE, 4),
    { mul: MUL_WO_GLUE, boldOffset: BOLD_OFFSET_NONE }
  );
  tspl += glueBlock.lines;
  y = glueBlock.nextY;

  tspl += 'PRINT 1,1\n';
  return tspl;
}
