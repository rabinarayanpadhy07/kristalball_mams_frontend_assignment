import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/cn.js';
import { Button } from '../ui/Button.jsx';

/**
 * One row of filters above the content they scope.
 *
 * Phones (<768px): collapsed behind a "Filters" button showing the active count;
 * opening it stacks the controls in one column.
 * Tablet: a two-column grid, always visible.
 * Desktop (≥1024px): a single row that wraps only if it runs out of room.
 */
export function FilterBar({ children, activeCount = 0, onReset, className, summary }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('rounded-lg border border-line bg-surface shadow-card', className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex h-9 items-center gap-2 rounded-md px-2 text-[13px] font-medium text-ink hover:bg-subtle"
        >
          <SlidersHorizontal className="size-4 text-muted" aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="num rounded-sm bg-primary px-1.5 text-2xs font-semibold leading-5 text-white">{activeCount}</span>
          )}
        </button>
        {summary && !open && <span className="min-w-0 truncate text-[12px] text-muted">{summary}</span>}
      </div>

      <div className={cn('border-t border-line p-3 md:block md:border-t-0 md:p-3.5', open ? 'block' : 'hidden')}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
          {children}
          {onReset && (
            <div className="flex items-end md:col-span-2 lg:ml-auto lg:shrink-0">
              <Button variant="ghost" size="md" icon={RotateCcw} onClick={onReset} disabled={activeCount === 0} className="w-full md:w-auto">
                Reset
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A labelled filter control. `grow` lets wide controls (date range, search) take more room on desktop. */
export function FilterField({ label, htmlFor, children, className, grow = false }) {
  return (
    // Desktop: fields share the row (flexing between min and max widths) instead of
    // wrapping one stray field onto a second line.
    <div
      className={cn(
        'min-w-0 lg:min-w-[9rem] lg:max-w-[13rem] lg:flex-1',
        grow && 'md:col-span-2 lg:min-w-[15rem] lg:max-w-md lg:flex-[2]',
        className,
      )}
    >
      <label htmlFor={htmlFor} className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
