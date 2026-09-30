import { cn } from '../../lib/cn.js';

/**
 * Title, subtitle and page actions. Actions sit beside the title from 640px and
 * move to their own full-width row below it on phones. An optional icon chip
 * (brand-tinted) anchors the title.
 */
export function PageHeader({ title, subtitle, actions, meta, icon: Icon, className }) {
  return (
    <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 hidden size-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary ring-1 ring-accent/20 sm:flex">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-[22px]">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-muted sm:text-sm">{subtitle}</p>}
          {meta && <div className="mt-2">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </div>
  );
}
