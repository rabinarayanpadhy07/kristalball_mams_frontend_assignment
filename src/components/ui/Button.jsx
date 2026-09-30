import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '../../lib/cn.js';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-subtle disabled:text-faint',
  ghost: 'text-muted hover:bg-subtle hover:text-ink disabled:text-faint',
  danger: 'bg-danger text-white hover:bg-danger-ink disabled:bg-danger/50',
  'danger-outline': 'bg-surface text-danger-ink border border-danger/40 hover:bg-danger-soft disabled:opacity-50',
};

const SIZES = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  icon: 'h-9 w-9 justify-center',
  'icon-sm': 'h-8 w-8 justify-center',
};

/**
 * `loading` disables the button and swaps the icon for a spinner, so a pending
 * mutation can never be submitted twice from the same control.
 */
export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, loading = false, className, children, type = 'button', disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </button>
  );
});
