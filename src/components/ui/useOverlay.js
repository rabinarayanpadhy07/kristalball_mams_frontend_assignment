import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Open overlays, innermost last. Only the top one reacts to Escape, so a confirm
// dialog opened over a drawer closes first.
const stack = [];

/**
 * Shared behavior for modal surfaces (modal, drawer, mobile nav):
 * Escape closes the topmost overlay, background scroll is locked, Tab is trapped
 * inside, focus moves in on open and returns to the triggering element on close.
 */
export function useOverlay(open, onClose) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const entry = { close: () => onCloseRef.current?.() };
    stack.push(entry);
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const target = panel?.querySelector('[data-autofocus]') ?? panel?.querySelector(FOCUSABLE) ?? panel;
      target?.focus({ preventScroll: true });
    });

    const onKeyDown = (event) => {
      if (stack[stack.length - 1] !== entry) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        entry.close();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(entry), 1);
      if (stack.length === 0) document.body.style.overflow = '';
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return panelRef;
}
