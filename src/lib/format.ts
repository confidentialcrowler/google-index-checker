/**
 * Safe formatting utilities that guarantee zero runtime crashes
 * from calling .toLocaleString() or date methods on undefined / null values.
 */

export function formatNumber(val: number | string | null | undefined, fallback: string = '0'): string {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return fallback;
  return num.toLocaleString();
}

export function formatDate(val: string | number | Date | null | undefined, fallback: string = ''): string {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString();
  } catch {
    return fallback;
  }
}

export function formatDateTime(val: string | number | Date | null | undefined, fallback: string = ''): string {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleString();
  } catch {
    return fallback;
  }
}

export function formatTime(
  val: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = ''
): string {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleTimeString([], options);
  } catch {
    return fallback;
  }
}
