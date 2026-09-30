import { Input, Select } from '../../components/ui/Field.jsx';
import { DATE_PRESETS, endOfDayIso, resolveRange, startOfDayIso, today } from '../../lib/dates.js';

/**
 * Preset first (the range people reach for), custom dates behind it.
 * With `allowAll`, an "Any time" option leaves the range open (history lists).
 */
export function DateRangeFilter({ preset, from, to, onChange, allowAll = false, id }) {
  const custom = preset === 'custom';
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
      <Select
        id={id}
        value={preset}
        onChange={(e) => onChange({ preset: e.target.value })}
        className={custom ? 'sm:w-40 sm:shrink-0' : 'w-full'}
        aria-label="Date range"
      >
        {allowAll && <option value="all">Any time</option>}
        {DATE_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </Select>
      {custom && (
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <Input type="date" value={from ?? ''} max={to || today()} onChange={(e) => onChange({ from: e.target.value })} aria-label="From date" />
          <Input type="date" value={to ?? ''} min={from || undefined} max={today()} onChange={(e) => onChange({ to: e.target.value })} aria-label="To date" />
        </div>
      )}
    </div>
  );
}

/**
 * URL filter values → API `from`/`to` instants covering whole local days.
 * `preset: 'all'` sends no bounds.
 */
export function apiRange({ preset, from, to }) {
  if (preset === 'all') return {};
  const days = resolveRange({ preset, from, to });
  return { from: startOfDayIso(days.from), to: endOfDayIso(days.to) };
}
