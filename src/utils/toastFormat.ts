export const escapeHtml = (value: string | number): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** In đậm + màu cho giá trị động trong toast detail (dùng với AppToast). */
export const toastEm = (value: string | number, className = 'toast-em'): string =>
  `<strong class="${className}">${escapeHtml(value)}</strong>`;

export const toastMsg = (
  strings: TemplateStringsArray,
  ...values: Array<string | number>
): string =>
  strings.reduce(
    (result, part, index) => result + part + (index < values.length ? toastEm(values[index]) : ''),
    ''
  );
