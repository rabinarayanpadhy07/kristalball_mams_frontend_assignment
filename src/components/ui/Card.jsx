import { cn } from '../../lib/cn.js';

export function Card({ className, children, ...props }) {
  return (
    <section className={cn('min-w-0 rounded-lg border border-line bg-surface shadow-card', className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, actions, icon: Icon, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-5', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
            <Icon className="size-3.5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[12px] text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Informational strip (not an alert). */
export function Callout({ icon: Icon, tone = 'neutral', children, className }) {
  const tones = {
    neutral: 'bg-subtle text-muted border-line',
    info: 'bg-info-soft text-info border-info/20',
    warning: 'bg-warning-soft text-warning-ink border-warning/25',
    danger: 'bg-danger-soft text-danger-ink border-danger/20',
  };
  return (
    <div className={cn('flex items-start gap-2 rounded-md border px-3 py-2 text-[13px] leading-5', tones[tone], className)}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
