import format from '@/mixins/format';
import { takeTsplMediaPrefix } from '@/services/labelPrintSession';

const TSPL_FONT = '5';
const TSPL_BOLD_XMUL = 13;
const TSPL_BOLD_YMUL = 13;
const TSPL_LEFT_X = 15;
const TSPL_LINE_HEIGHT = 46;
const TSPL_BOLD_OFFSET = 2;
const TSPL_MAX_Y = 375;
const TSPL_MAX_CHARS = 26;

const escape = (s: string) => String(s ?? '').replace(/"/g, "'");

/** In đậm giả bằng cách in 2 lần offset 2px — toàn bộ dòng đều bold (xmul=13/ymul=13). */
const boldLine = (x: number, y: number, value: string): string => {
  const inner = escape(value);
  const l1 = `TEXT ${x},${y},"${TSPL_FONT}",0,${TSPL_BOLD_XMUL},${TSPL_BOLD_YMUL},"${inner}"\n`;
  const l2 = `TEXT ${x + TSPL_BOLD_OFFSET},${y},"${TSPL_FONT}",0,${TSPL_BOLD_XMUL},${TSPL_BOLD_YMUL},"${inner}"\n`;
  return `${l1}${l2}`;
};

/** Wrap dòng dài: label+value dòng đầu, value tiếp ở dòng sau. */
const wrapBlock = (label: string, value: string, x: number, y: number): { lines: string; nextY: number } => {
  const MAX_CHARS_PER_LINE = TSPL_MAX_CHARS;

  const combined = `${label}${value}`;
  const chars = [...combined];
  const rows: string[] = [];
  let pos = 0;
  while (pos < chars.length && rows.length < 3) {
    rows.push(chars.slice(pos, pos + MAX_CHARS_PER_LINE).join(''));
    pos += MAX_CHARS_PER_LINE;
  }

  let tspl = '';
  let curY = y;
  rows.forEach((row) => {
    if (curY + TSPL_LINE_HEIGHT > TSPL_MAX_Y) return;
    tspl += boldLine(x, curY, row);
    curY += TSPL_LINE_HEIGHT;
  });

  return { lines: tspl, nextY: curY };
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
  operatorName?: string;
  weighingTime?: string;
}

export function buildComponentWeightLabelTspl(data: ComponentWeightLabelData): string {
  const { workOrderMasterName, requestTime, glueName, materialName, actualWeight, weightUnit, operatorName, weighingTime } = data;

  const requestTimeDisplay = formatLabelTime(requestTime);
  const weightDisplay = actualWeight
    ? `${format.formatDisplayWeight(actualWeight)} ${weightUnit || 'KG'}`.trim()
    : '';
  const weighingTimeDisplay = formatLabelTime(weighingTime);

  const mediaPrefix = takeTsplMediaPrefix();
  let tspl = `${mediaPrefix}CLS
`;

  let y = 40;

  // Dòng 1: mã đơn WO — bold
  tspl += boldLine(TSPL_LEFT_X, y, workOrderMasterName);
  y += TSPL_LINE_HEIGHT;

  // Dòng 2: Thời gian lãnh
  if (requestTimeDisplay && y + TSPL_LINE_HEIGHT <= TSPL_MAX_Y) {
    tspl += boldLine(TSPL_LEFT_X, y, `Thời gian lãnh: ${requestTimeDisplay}`);
    y += TSPL_LINE_HEIGHT;
  }

  // Dòng 3: Keo trộn (glueName / chemicalMasterName)
  const glueBlock = wrapBlock('Keo trộn: ', glueName, TSPL_LEFT_X, y);
  tspl += glueBlock.lines;
  y = glueBlock.nextY;

  // Dòng 4: Keo (materialName)
  const materialBlock = wrapBlock('Keo: ', materialName, TSPL_LEFT_X, y);
  tspl += materialBlock.lines;
  y = materialBlock.nextY;

  // Dòng 5: Trọng lượng
  if (weightDisplay && y + TSPL_LINE_HEIGHT <= TSPL_MAX_Y) {
    tspl += boldLine(TSPL_LEFT_X, y, `Trọng lượng: ${weightDisplay}`);
    y += TSPL_LINE_HEIGHT;
  }

  // Dòng 6: Thời gian cân
  if (weighingTimeDisplay && y + TSPL_LINE_HEIGHT <= TSPL_MAX_Y) {
    tspl += boldLine(TSPL_LEFT_X, y, `Thời gian cân: ${weighingTimeDisplay}`);
    y += TSPL_LINE_HEIGHT;
  }

  // Dòng 7: Người thao tác
  if (operatorName && y + TSPL_LINE_HEIGHT <= TSPL_MAX_Y) {
    tspl += boldLine(TSPL_LEFT_X, y, operatorName);
  }

  tspl += 'PRINT 1,1\n';
  return tspl;
}
