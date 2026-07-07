/** Đơn vị trọng lượng chuẩn hiển thị / lưu trong app. */
export type NormalizedWeightUnit = 'KG' | 'G';

const GRAM_ALIASES = new Set(['g', 'gram', 'grams']);
const KILO_ALIASES = new Set(['kg', 'kgs', 'kilogram', 'kilograms']);

/**
 * Chuẩn hóa đơn vị từ BE: Kg, kg, KG, G, g → `Kg` | `G`.
 */
export function normalizeWeightUnit(
  unit?: string | null,
  fallback: NormalizedWeightUnit = 'KG'
): NormalizedWeightUnit {
  const raw = String(unit ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (GRAM_ALIASES.has(raw)) return 'G';
  if (KILO_ALIASES.has(raw) || raw.startsWith('kg')) return 'KG';
  return fallback;
}

export function isGramUnit(unit?: string | null): boolean {
  return normalizeWeightUnit(unit) === 'G';
}

/** Quy đổi trọng lượng về kilogram để cộng dồn. */
export function toKilograms(weight: number, unit?: string | null): number {
  if (!Number.isFinite(weight)) return 0;
  return isGramUnit(unit) ? weight / 1000 : weight;
}

/** Suffix cho InputNumber: ` Kg` hoặc ` G`. */
export function weightUnitInputSuffix(unit?: string | null): string {
  return ` ${normalizeWeightUnit(unit)}`;
}
