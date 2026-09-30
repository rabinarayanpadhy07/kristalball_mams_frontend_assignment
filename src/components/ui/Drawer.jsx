import { X } from 'lucide-react';
import { useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn.js';
import { useOverlay } from './useOverlay.js';

/**
 * Right-hand panel for record details. Full width on phones, fixed width from 640px.
 */
export function Drawer({ open, onClose, title, subtitle, headerExtra, footer, children, width = 'md' }) {
  const titleId = useId();
  const panelRef = useOverlay(open, onClose);
  if (!open) return null;
  const widths = { md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn('relative flex h-full w-full flex-col bg-surface shadow-overlay outline-none', widths[width])}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-[15px] font-semibold text-ink">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
            {headerExtra && <div className="mt-2">{headerExtra}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}

/** Label/value grid used inside drawers and detail modals. */
export function DetailList({ items, className }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items.filter(Boolean).map(({ label, value, wide }) => (
        <div key={label} className={cn('min-w-0', wide && 'sm:col-span-2')}>
          <dt className="text-[12px] text-muted">{label}</dt>
          <dd className="mt-0.5 break-words text-[13px] text-ink">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
