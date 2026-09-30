import { Flame, UserCheck } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/**
 * The two concepts people confuse most, side by side with their distinct markers.
 * `emphasis` highlights the one the current page is about.
 */
export function CustodyLegend({ emphasis, className }) {
  const item = (key, Icon, tone, title, body) => (
    <div
      className={cn(
        'flex min-w-0 items-start gap-3 rounded-md border p-3',
        emphasis === key ? 'border-line-strong bg-surface' : 'border-line bg-surface/60 opacity-80',
      )}
    >
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', tone)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[12px] leading-5 text-muted">{body}</p>
      </div>
    </div>
  );
  return (
    <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-2', className)}>
      {item(
        'assigned',
        UserCheck,
        'bg-info-soft text-info',
        'Assigned: in custody',
        'Issued to a person. The asset still exists and stays on hand at the base until it is returned.',
      )}
      {item(
        'expended',
        Flame,
        'bg-danger-soft text-danger',
        'Expended: consumed',
        'Used up, destroyed or lost. The quantity is permanently removed from inventory.',
      )}
    </div>
  );
}
