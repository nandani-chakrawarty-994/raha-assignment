/**
 * Build a YYYY-MM-DD local calendar date from a Date and timezone offset (minutes).
 * timezoneOffsetMinutes matches Date#getTimezoneOffset() sign convention inverted:
 * we pass -(new Date().getTimezoneOffset()) from the client so positive = east of UTC.
 * Example: IST = +330.
 */
export function toLocalDateKey(date: Date, timezoneOffsetMinutes: number): string {
  const shifted = new Date(date.getTime() + timezoneOffsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Browser-local calendar date as YYYY-MM-DD (not UTC). */
export function todayLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthRangeUtc(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

export function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
