import { ChevronDown } from 'lucide-react';
import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn.js';

const control =
  'block w-full min-w-0 rounded-md border bg-surface text-sm text-ink placeholder:text-faint transition-colors ' +
  'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ' +
  'disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted';

const stateClass = (invalid) => (invalid ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-line-strong');

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} className={cn(control, stateClass(invalid), 'h-9 px-3', className)} aria-invalid={invalid || undefined} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, invalid, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(control, stateClass(invalid), 'px-3 py-2 leading-5', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

/** Native select: accessible, keyboard- and touch-friendly on every device. */
export const Select = forwardRef(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <select
        ref={ref}
        className={cn(control, stateClass(invalid), 'h-9 appearance-none truncate pl-3 pr-8')}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
});

/**
 * Label + control + hint/error, wired with ids for screen readers.
 * `children` is a render function receiving the control props, or an element.
 */
export function Field({ label, hint, error, required, className, children, htmlFor }) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const controlProps = { id, invalid: Boolean(error), 'aria-describedby': describedBy, required };

  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      {typeof children === 'function' ? children(controlProps) : children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-danger-ink" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[12px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
