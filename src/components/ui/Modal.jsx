import { X } from 'lucide-react';
import { useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn.js';
import { useOverlay } from './useOverlay.js';

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/**
 * Dialog with a fixed header/footer and a scrolling body, so tall forms never
 * push the actions off screen.
 * Mobile: a bottom sheet that can grow to the full viewport height.
 * ≥640px: a centered dialog with a max height of 100dvh − 4rem.
 */
export function Modal({ open, onClose, title, description, size = 'md', footer, children, dismissible = true, className }) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useOverlay(open, dismissible ? onClose : undefined);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/40" onClick={dismissible ? onClose : undefined} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[100dvh] w-full flex-col rounded-t-lg bg-surface shadow-overlay outline-none sm:max-h-[calc(100dvh-4rem)] sm:rounded-lg',
          SIZES[size],
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[15px] font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-[13px] text-muted">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          )}
        </header>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
