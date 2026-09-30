import { cn } from '../../lib/cn.js';
import { formatNumber } from '../../lib/format.js';

/**
 * Segmented status tabs. Scrolls horizontally on narrow screens instead of wrapping.
 * tabs: [{ value, label, count?, icon? }]
 */
export function Tabs({ tabs, value, onChange, label, className }) {
  return (
    <div className={cn('scroll-thin -mx-1 overflow-x-auto px-1', className)}>
      {/* A filter, not a panel switcher: toggle buttons in a labelled group. */}
      <div role="group" aria-label={label} className="inline-flex min-w-max items-center gap-1 rounded-lg border border-line bg-surface p-1 shadow-card">
        {tabs.map((tab) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(tab.value)}
              className={cn(
                'flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors',
                selected ? 'bg-primary text-white' : 'text-muted hover:bg-subtle hover:text-ink',
              )}
            >
              {tab.icon && <tab.icon className="size-3.5" aria-hidden />}
              {tab.label}
              {tab.count != null && (
                <span className={cn('num rounded-sm px-1.5 text-2xs leading-5', selected ? 'bg-white/15 text-white' : 'bg-subtle text-muted')}>
                  {formatNumber(tab.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
