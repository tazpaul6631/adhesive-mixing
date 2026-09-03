/** BE message codes mapped via `catchError.*` locale keys. */
export const CATCH_ERROR_KEYS = new Set([
  'INIT_DATA_NOT_FOUND',
  'DATA_NOT_FOUND',
  'CREATE_SUCCESS',
  'LOGIN_INFO_NOT_FOUND',
  'WRONG_PASSWORD',
  'USER_NOT_AUTHORIZED',
  'LOGIN_SUCCESS',
  'CONFIRM_SUCCESS',
  'QIP_CONFIRM_FAIL',
  'LINE_GLUE_CONFIRM_SUCCESS',
  'GLUE_ALREADY_SEPARATE',
  'GLUE_RETURN_CONFIRM_SUCCESS',
  'RETURNED_GLUE_CONFIRM_SUCCESS',
  'PRINT_SUCCESS',
  'DATA_ALREADY_EXISTS',
  'SYNC_SUCCESS',
  'CONFIRM_FAIL',
]);

export function resolveCatchErrorMessage(
  t: (key: string, ...args: any[]) => string,
  raw: unknown,
  fallback: string,
  allowedKeys: ReadonlySet<string> = CATCH_ERROR_KEYS,
): string {
  const message = typeof raw === 'string' ? raw.trim() : '';
  if (message && allowedKeys.has(message)) {
    return t(`catchError.${message}`);
  }
  return message || fallback;
}
