import { Boxes } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { cn } from '../../lib/cn.js';
import { formatDate, formatNumber, formatQuantity } from '../../lib/format.js';
import { useDistribution } from './api.js';

const MAX_TYPES = 6;

/**
 * Stock on hand at the end of the period, by equipment type: a ranked bar list with
 * every value labelled. Items keep their own unit (rounds, litres, units); the type
 * total is a plain count and says so.
 */
export function DistributionPanel({ params, className }) {
  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useDistribution(params);
  const types = data?.byType ?? [];
  const shown = types.slice(0, MAX_TYPES);
  const rest = types.slice(MAX_TYPES);
  const max = Math.max(1, ...types.map((t) => t.quantity));

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader icon={Boxes} title="Equipment distribution" description={data ? `On hand at ${formatDate(data.asOf)}` : 'On hand at period end'} />
      <div className={cn('flex-1 p-4 transition-opacity sm:p-5', isFetching && isPlaceholderData && 'opacity-60')}>
        {error ? (
          <ErrorState error={error} onRetry={refetch} compact />
        ) : isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : types.length === 0 ? (
          <EmptyState compact icon={Boxes} title="No stock on hand" description="Nothing matches these filters at the end of the period." />
        ) : (
          <ul className="space-y-4">
            {shown.map((t) => (
              <li key={t.equipmentType.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] font-medium text-ink">{t.equipmentType.name}</span>
                  <span className="num shrink-0 text-[13px] font-semibold text-ink">{formatNumber(t.quantity)}</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm bg-subtle">
                  <div className="h-full rounded-sm bg-accent" style={{ width: `${Math.max(2, (t.quantity / max) * 100)}%` }} />
                </div>
                <p className="mt-1.5 truncate text-[12px] text-muted">
                  {t.items
                    .slice(0, 2)
                    .map((i) => `${i.equipment.name} · ${formatQuantity(i.quantity, i.equipment.unitOfMeasure)}`)
                    .join('  ·  ')}
                  {t.items.length > 2 && ` +${t.items.length - 2} more`}
                </p>
              </li>
            ))}
            {rest.length > 0 && (
              <li className="text-[12px] text-muted">
                +{rest.length} other types · {formatNumber(rest.reduce((s, t) => s + t.quantity, 0))}
              </li>
            )}
          </ul>
        )}
      </div>
    </Card>
  );
}
