/**
 * Dates in the UI are local calendar days ("YYYY-MM-DD", kept in the URL). The API
 * stores UTC instants, so ranges are sent as the instants where the user's local
 * day starts and ends — "to 30 Sep" means through 23:59:59.999 local time.
 */
const pad = (n) => String(n).padStart(2, '0');

export const toDayString = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const today = () => toDayString(new Date());

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDayString(d);
}

const parseDay = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isValidDay = (day) => /^\d{4}-\d{2}-\d{2}$/.test(day ?? '') && !Number.isNaN(parseDay(day).getTime());

export const startOfDayIso = (day) => (isValidDay(day) ? parseDay(day).toISOString() : undefined);
export function endOfDayIso(day) {
  if (!isValidDay(day)) return undefined;
  const d = parseDay(day);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Business date for a new record. Today → the current instant (a midnight/noon value
 * could be "in the future" for the server); a past day → local noon of that day.
 */
export function businessDateIso(day) {
  if (!isValidDay(day)) return undefined;
  if (day === today()) return new Date().toISOString();
  const d = parseDay(day);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export const DATE_PRESETS = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: '365d', label: 'Last 12 months', days: 365 },
  { value: 'custom', label: 'Custom range' },
];

/** Resolves a preset (or custom from/to) into local day strings. */
export function resolveRange({ preset, from, to }) {
  const p = DATE_PRESETS.find((x) => x.value === preset);
  if (p?.days) return { from: daysAgo(p.days - 1), to: today() };
  return { from: isValidDay(from) ? from : daysAgo(29), to: isValidDay(to) ? to : today() };
}
