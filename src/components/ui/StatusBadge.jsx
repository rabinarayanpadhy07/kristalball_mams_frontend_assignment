import {
  Ban,
  CircleCheck,
  CircleDashed,
  Clock,
  Flame,
  PackageCheck,
  Undo2,
  UserCheck,
} from 'lucide-react';
import { cn } from '../../lib/cn.js';

const TONES = {
  neutral: 'bg-subtle text-muted border-line',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning-ink border-warning/25',
  danger: 'bg-danger-soft text-danger-ink border-danger/20',
  info: 'bg-info-soft text-info border-info/20',
  primary: 'bg-primary-light text-primary border-accent/25',
};

/**
 * Every status the API can return, with a tone, an icon and a label: state is
 * never conveyed by color alone.
 *
 * ASSIGNED (custody — the asset still exists) and EXPENDED (consumed — removed
 * from inventory) deliberately look different: blue person-check vs red flame.
 */
const STATUSES = {
  // transfers
  PENDING: { tone: 'warning', icon: Clock, label: 'Pending' },
  COMPLETED: { tone: 'success', icon: CircleCheck, label: 'Completed' },
  CANCELLED: { tone: 'neutral', icon: Ban, label: 'Cancelled' },
  // purchases / expenditures
  POSTED: { tone: 'success', icon: PackageCheck, label: 'Posted' },
  VOIDED: { tone: 'neutral', icon: Ban, label: 'Voided' },
  // assignments
  ACTIVE: { tone: 'info', icon: UserCheck, label: 'Assigned' },
  RETURNED: { tone: 'success', icon: Undo2, label: 'Returned' },
  CLOSED: { tone: 'neutral', icon: CircleDashed, label: 'Closed' },
  // concepts
  ASSIGNED: { tone: 'info', icon: UserCheck, label: 'Assigned' },
  EXPENDED: { tone: 'danger', icon: Flame, label: 'Expended' },
};

export function Badge({ tone = 'neutral', icon: Icon, children, className, title }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[12px] font-medium leading-4',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function StatusBadge({ status, label, className }) {
  const s = STATUSES[status] ?? { tone: 'neutral', label: status };
  return (
    <Badge tone={s.tone} icon={s.icon} className={className}>
      {label ?? s.label}
    </Badge>
  );
}
