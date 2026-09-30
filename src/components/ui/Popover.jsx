import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn.js';

/**
 * Anchored dropdown (menus, notification lists). Closes on outside click, Escape
 * (returning focus to the trigger) and route changes via `close()`.
 * On phones the panel pins to the viewport edges so it can never overflow.
 */
export function Popover({ trigger, children, align = 'right', panelClassName, label }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v), ref: triggerRef, 'aria-expanded': open, 'aria-haspopup': 'true' })}
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            'fixed inset-x-3 top-16 z-40 rounded-lg border border-line bg-surface shadow-overlay sm:absolute sm:inset-x-auto sm:top-full sm:mt-2',
            align === 'right' ? 'sm:right-0' : 'sm:left-0',
            panelClassName,
          )}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}
