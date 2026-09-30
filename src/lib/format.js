const numberFormat = new Intl.NumberFormat('en-US');
const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const shortDateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });

export const formatNumber = (n) => (n == null ? '—' : numberFormat.format(n));
export const formatCompact = (n) => (n == null ? '—' : Math.abs(n) < 10_000 ? numberFormat.format(n) : compactFormat.format(n));
export const formatDate = (v) => (v ? dateFormat.format(new Date(v)) : '—');
export const formatDateTime = (v) => (v ? dateTimeFormat.format(new Date(v)) : '—');
export const formatShortDate = (v) => (v ? shortDateFormat.format(new Date(v)) : '—');

/** Signed number for movements: +40 / −30 (true minus sign). */
export const formatSigned = (n) => (n > 0 ? `+${formatNumber(n)}` : n < 0 ? `−${formatNumber(Math.abs(n))}` : '0');

const UNIT_LABELS = {
  UNIT: ['unit', 'units'],
  ROUND: ['round', 'rounds'],
  BOX: ['box', 'boxes'],
  LITRE: ['litre', 'litres'],
  KILOGRAM: ['kg', 'kg'],
};
export const unitLabel = (unit, n = 2) => {
  const [one, many] = UNIT_LABELS[unit] ?? ['', ''];
  return Math.abs(n) === 1 ? one : many;
};
export const formatQuantity = (n, unit) => `${formatNumber(n)} ${unitLabel(unit, n)}`.trim();

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function formatRelative(v) {
  if (!v) return '—';
  const seconds = (new Date(v).getTime() - Date.now()) / 1000;
  const steps = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.35, 'week'],
    [12, 'month'],
    [Infinity, 'year'],
  ];
  let value = seconds;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return RELATIVE.format(Math.round(value), unit);
    value /= size;
  }
  return formatDate(v);
}

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  BASE_COMMANDER: 'Base Commander',
  LOGISTICS_OFFICER: 'Logistics Officer',
};

export const initials = (name = '') =>
  name
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';
