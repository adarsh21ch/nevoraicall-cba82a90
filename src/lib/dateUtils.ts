/**
 * IST (India Standard Time) Date Utilities
 * 
 * All date grouping and range filtering for tracking/analytics
 * must use IST (UTC+5:30) to match user expectations.
 * 
 * The database stores timestamps in UTC (TIMESTAMPTZ).
 * These helpers convert UTC → IST for display/grouping,
 * and produce UTC boundaries for IST day/month ranges.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30 in milliseconds

/**
 * Convert a Date (interpreted as UTC) to its IST equivalent.
 * Returns a new Date shifted by +5:30.
 * Use getUTC*() methods on the result to read IST components.
 */
export function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

/**
 * Get "YYYY-MM-DD" string in IST for a given Date.
 */
export function getISTDateStr(date: Date): string {
  const ist = toIST(date);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get "yyyy-MM" string in IST for a given Date.
 */
export function getISTMonthStr(date: Date): string {
  const ist = toIST(date);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Extract the day-of-month in IST from an ISO timestamp string.
 * e.g. "2026-02-19T19:00:00Z" → 20 (because 19:00 UTC = 00:30 IST next day)
 */
export function getISTDayOfMonth(isoString: string): number {
  const d = new Date(isoString);
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return ist.getUTCDate();
}

/**
 * Extract the "YYYY-MM-DD" date string in IST from an ISO timestamp.
 */
export function getISTDateFromISO(isoString: string): string {
  const d = new Date(isoString);
  return getISTDateStr(d);
}

/**
 * Get UTC ISO string boundaries for a full IST day.
 * 
 * IST midnight → UTC previous day 18:30
 * IST 23:59:59.999 → UTC same day 18:29:59.999
 * 
 * @param dateStr "YYYY-MM-DD" in IST
 * @returns { start: UTC ISO string, end: UTC ISO string }
 */
export function getISTDayBoundsUTC(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  // IST midnight = UTC (y, m-1, d, 0, 0) - 5:30 = UTC (previous) 18:30
  const istMidnight = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const startUTC = new Date(istMidnight.getTime() - IST_OFFSET_MS);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000 - 1);
  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString(),
  };
}

/**
 * Get UTC ISO string boundaries for a full IST month.
 * 
 * @param monthYear "YYYY-MM"
 * @returns { start: UTC ISO for IST month start, end: UTC ISO for IST month end }
 */
export function getISTMonthBoundsUTC(monthYear: string): { start: string; end: string } {
  const [year, month] = monthYear.split('-').map(Number);
  // First day of month in IST
  const startIST = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const startUTC = new Date(startIST.getTime() - IST_OFFSET_MS);

  // Last moment of last day of month in IST
  const lastDay = new Date(year, month, 0).getDate(); // days in month
  const endIST = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));
  const endUTC = new Date(endIST.getTime() - IST_OFFSET_MS);

  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString(),
  };
}

/**
 * Get "today" in IST as "YYYY-MM-DD".
 */
export function getTodayIST(): string {
  return getISTDateStr(new Date());
}

/**
 * Get number of days in a month.
 */
export function getDaysInMonthIST(monthYear: string): number {
  const [year, month] = monthYear.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}
