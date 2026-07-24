import format from '@/mixins/format';
import { normalizeWeightUnit } from '@/utils/weightUnit';
import { takeTsplMediaPrefix } from '@/services/labelPrintSession';

/** Tem 69×49 mm @ ~203dpi — khớp labelPrintSession SIZE. */
const TSPL_FONT = '5';
const TSPL_LEFT_X = 13;
const TSPL_START_Y = 30;
const TSPL_MAX_Y = 400;
/** Chiều rộng tem dots (~69mm @ 203dpi). */
const TSPL_LABEL_WIDTH = 555;
/** Độ rộng chữ in được trên 69mm (trừ lề trái). */
const TSPL_MAX_CHARS_FIRST_LINE = 24;
const TSPL_MAX_CHARS_CONTINUATION = 26;

/** Cỡ chữ (xmul/ymul) theo từng nhóm dòng. */
const MUL_WO_GLUE = 12;
const MUL_MATERIAL = 17;
const MUL_META = 14;

/** Badge góc trên phải: vòng neo top/right; value căn tâm vòng (TEXT góc trên-trái). */
const LABEL_BADGE_SIZE = 90;
const LABEL_BADGE_MARGIN = 15;
const LABEL_BADGE_RING_THICKNESS = 6;
/** Font "5" — mul hiển thị; DIGIT_* = cell in thật để cx-W/2, cy-H/2 đúng tâm. */
const LABEL_BADGE_FONT = TSPL_FONT;
const LABEL_BADGE_MUL = 18;
/** Đo/chỉnh theo máy: W quá lớn → số 2 chữ lệch trái (hàng đơn vị vào tâm). */
const LABEL_BADGE_DIGIT_W = 22;
const LABEL_BADGE_DIGIT_H = 45;
/** In đậm giả: TEXT in lại lệch (dots). */
const LABEL_BADGE_BOLD_OFFSET = 2;

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

/** Vòng tròn bằng BAR (máy BT thường bỏ CIRCLE). */
const circleOutlineBars = (x: number, y: number, size: number, thickness: number): string => {
  const outerR = Math.max(2, Math.floor(size / 2) - 1);
  const innerR = Math.max(1, outerR - Math.max(1, thickness) + 1);
  const cx = x + Math.floor(size / 2);
  const cy = y + Math.floor(size / 2);
  const points = new Set<string>();

  const plotRing = (r: number) => {
    let xi = r;
    let yi = 0;
    let err = 1 - xi;
    while (xi >= yi) {
      const octants: Array<[number, number]> = [
        [cx + xi, cy + yi],
        [cx + yi, cy + xi],
        [cx - yi, cy + xi],
        [cx - xi, cy + yi],
        [cx - xi, cy - yi],
        [cx - yi, cy - xi],
        [cx + yi, cy - xi],
        [cx + xi, cy - yi],
      ];
      for (const [px, py] of octants) {
        points.add(`${px},${py}`);
      }
      yi += 1;
      if (err < 0) {
        err += 2 * yi + 1;
      } else {
        xi -= 1;
        err += 2 * (yi - xi) + 1;
      }
    }
  };

  for (let r = innerR; r <= outerR; r += 1) {
    plotRing(r);
  }

  let tspl = '';
  const barSize = Math.max(1, Math.min(3, Math.ceil(thickness / 2)));
  const half = Math.floor(barSize / 2);
  for (const key of points) {
    const [px, py] = key.split(',').map(Number);
    tspl += `BAR ${px - half},${py - half},${barSize},${barSize}\n`;
  }
  return tspl;
};

/** Badge: vòng đậm + value đậm; x = cx - W/2, y = cy - H/2. */
const labelCodeBadge = (labelCode: string): string => {
  const code = String(labelCode ?? '').trim();
  if (!code) return '';

  const circleX = TSPL_LABEL_WIDTH - LABEL_BADGE_MARGIN - LABEL_BADGE_SIZE;
  const circleY = LABEL_BADGE_MARGIN;
  const cx = circleX + Math.floor(LABEL_BADGE_SIZE / 2);
  const cy = circleY + Math.floor(LABEL_BADGE_SIZE / 2);

  const valueW = [...code].length * LABEL_BADGE_DIGIT_W + LABEL_BADGE_BOLD_OFFSET;
  const valueH = LABEL_BADGE_DIGIT_H;
  const textX = cx - Math.floor(valueW / 2);
  const textY = cy - Math.floor(valueH / 2);
  const inner = escape(code);
  const bold = LABEL_BADGE_BOLD_OFFSET;

  return (
    circleOutlineBars(circleX, circleY, LABEL_BADGE_SIZE, LABEL_BADGE_RING_THICKNESS) +
    `TEXT ${textX},${textY},"${LABEL_BADGE_FONT}",0,${LABEL_BADGE_MUL},${LABEL_BADGE_MUL},"${inner}"\n` +
    `TEXT ${textX + bold},${textY},"${LABEL_BADGE_FONT}",0,${LABEL_BADGE_MUL},${LABEL_BADGE_MUL},"${inner}"\n` +
    `TEXT ${textX},${textY + bold},"${LABEL_BADGE_FONT}",0,${LABEL_BADGE_MUL},${LABEL_BADGE_MUL},"${inner}"\n`
  );
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

  // Badge mã số — góc trên phải (không chiếm luồng dọc)
  tspl += labelCodeBadge(labelCode);

  let y = TSPL_START_Y;

  // Dòng 1: WO — bước theo MUL_WO_GLUE
  tspl += textLine(TSPL_LEFT_X, y, workOrderMasterName, MUL_WO_GLUE, BOLD_OFFSET_NONE);
  y += lineStep(MUL_WO_GLUE);

  // Dòng 2: Keo — bước theo MUL_MATERIAL
  if (y + lineStep(MUL_MATERIAL) <= TSPL_MAX_Y) {
    tspl += textLine(TSPL_LEFT_X, y, `Keo: ${materialName}`, MUL_MATERIAL, BOLD_OFFSET_MATERIAL);
    y += lineStep(MUL_MATERIAL) + 5;
  }

  // Dòng 3–5: meta — bước theo MUL_META
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

  // Dòng 6: Keo trộn — bước theo MUL_WO_GLUE
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
