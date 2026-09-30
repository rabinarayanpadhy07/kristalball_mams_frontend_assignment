import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react';
import { normalizeError } from '../../api/errors.js';
import { cn } from '../../lib/cn.js';
import { Button } from './Button.jsx';
import { Skeleton } from './Skeleton.jsx';

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, className, compact = false }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-subtle text-muted">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Generic block of skeleton lines; tables and cards have their own shaped skeletons. */
export function LoadingState({ lines = 4, className, label = 'Loading' }) {
  return (
    <div className={cn('space-y-3 p-5', className)} role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Shows the API's message and request id (for support), with a retry. */
export function ErrorState({ error, onRetry, title = 'Could not load this data', className, compact = false }) {
  const e = normalizeError(error);
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-ink">{e?.status === 403 ? 'You do not have access to this data' : title}</p>
      {e?.message && <p className="mt-1 max-w-md text-[13px] text-muted">{e.message}</p>}
      {e?.requestId && <p className="mt-1 font-mono text-2xs text-faint">Ref {e.requestId}</p>}
      {onRetry && e?.status !== 403 && (
        <Button size="sm" icon={RotateCcw} className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
