import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { formatNumber } from '../../lib/format.js';
import { Skeleton } from '../ui/Skeleton.jsx';

/**
 * A headline number. Interactive cards (onClick) render as a button with a visible
 * affordance — border emphasis on hover, a "View breakdown" hint and chevron — so
 * the interaction is discoverable without hovering.
 */
// Tone colors the icon chip and a thin top accent. Assigned (info) and Expended
// (danger) match their status badges so the meaning carries across pages.
const TONES = {
  neutral: { chip: 'bg-subtle text-ink', accent: 'before:bg-line-strong' },
  primary: { chip: 'bg-primary-light text-primary', accent: 'before:bg-accent' },
  info: { chip: 'bg-info-soft text-info', accent: 'before:bg-info' },
  danger: { chip: 'bg-danger-soft text-danger', accent: 'before:bg-danger' },
};

export function MetricCard({ label, value, icon: Icon, hint, onClick, actionLabel = 'View breakdown', loading, dimmed, signed = false, tone = 'neutral', className }) {
  const interactive = Boolean(onClick);
  const Tag = interactive ? 'button' : 'div';
  const display = value == null ? '—' : signed && value > 0 ? `+${formatNumber(value)}` : signed && value < 0 ? `−${formatNumber(-value)}` : formatNumber(value);

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-surface px-4 py-3 text-left shadow-card transition-colors sm:p-4',
        'before:absolute before:inset-x-0 before:top-0 before:h-[3px]',
        TONES[tone].accent,
        interactive
          ? 'cursor-pointer border-line hover:border-accent hover:bg-primary-light/40 focus-visible:border-accent'
          : 'border-line',
        className,
      )}
      aria-label={interactive ? `${label}: ${display}. ${actionLabel}` : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-muted">{label}</span>
        {Icon && (
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', TONES[tone].chip)}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <span className={cn('num mt-1 truncate text-[22px] font-semibold leading-8 tracking-tight text-ink transition-opacity sm:mt-2 sm:text-[26px] sm:leading-9', dimmed && 'opacity-60')}>
          {display}
        </span>
      )}
      <div className="mt-1 flex min-h-5 items-center justify-between gap-2">
        {hint && <span className="truncate text-[12px] text-muted">{hint}</span>}
        {interactive && (
          <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-accent group-hover:text-primary">
            {actionLabel}
            <ChevronRight className="size-3.5" aria-hidden />
          </span>
        )}
      </div>
    </Tag>
  );
}
