import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Flame, History, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import { CellStack, DataTable } from '../../components/data/DataTable.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { cn } from '../../lib/cn.js';
import { formatDate, formatQuantity, formatRelative, formatSigned, unitLabel } from '../../lib/format.js';
import { useActivity, useRecentPurchases, useRecentTransfers } from './api.js';

function ViewAll({ to }) {
  return (
    <Link to={to} className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
      View all <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

export function RecentTransfers({ params, enabled, className }) {
  const { data, isLoading, isFetching, error, refetch } = useRecentTransfers(params, enabled);
  if (!enabled) return null;
  const columns = [
    {
      key: 'ref',
      header: 'Transfer',
      cell: (t) => <CellStack primary={t.referenceNo} secondary={`${t.sourceBase.code} → ${t.destinationBase.code} · ${formatDate(t.createdAt)}`} />,
    },
    {
      key: 'item',
      header: 'Equipment',
      cell: (t) => <CellStack primary={t.equipment.name} secondary={formatQuantity(t.quantity, t.equipment.unitOfMeasure)} className="max-w-40 xl:max-w-44" />,
    },
    { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
  ];
  return (
    <Card className={className}>
      <CardHeader icon={ArrowLeftRight} title="Recent transfers" actions={<ViewAll to="/transfers" />} />
      <DataTable
        columns={columns}
        rows={data?.data}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={refetch}
        skeletonRows={5}
        minWidth={460}
        empty={{ title: 'No transfers in this period' }}
      />
    </Card>
  );
}

export function RecentPurchases({ params, enabled, className }) {
  const { data, isLoading, isFetching, error, refetch } = useRecentPurchases(params, enabled);
  if (!enabled) return null;
  const columns = [
    { key: 'ref', header: 'Purchase', cell: (p) => <CellStack primary={p.referenceNo} secondary={formatDate(p.purchasedAt)} /> },
    { key: 'base', header: 'Base', cell: (p) => p.base.code },
    { key: 'item', header: 'Equipment', cell: (p) => <CellStack primary={p.equipment.name} secondary={p.equipment.equipmentType.name} className="max-w-40 xl:max-w-48" /> },
    {
      key: 'qty',
      header: 'Quantity',
      align: 'right',
      cell: (p) => <span className="num whitespace-nowrap">{formatQuantity(p.quantity, p.equipment.unitOfMeasure)}</span>,
    },
  ];
  return (
    <Card className={className}>
      <CardHeader icon={ShoppingCart} title="Recent purchases" actions={<ViewAll to="/purchases" />} />
      <DataTable
        columns={columns}
        rows={data?.data}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={refetch}
        skeletonRows={5}
        minWidth={520}
        empty={{ title: 'No purchases in this period' }}
      />
    </Card>
  );
}

const ACTIVITY = {
  PURCHASE: { label: 'Purchase', icon: ShoppingCart },
  TRANSFER_IN: { label: 'Transfer in', icon: ArrowDownLeft },
  TRANSFER_OUT: { label: 'Transfer out', icon: ArrowUpRight },
  EXPENDITURE: { label: 'Expenditure', icon: Flame },
  ADJUSTMENT: { label: 'Adjustment', icon: SlidersHorizontal },
};

/** Latest stock movements (one line per document), newest first. */
export function RecentActivity({ params, className }) {
  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useActivity(params);
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader icon={History} title="Recent activity" description="Latest stock movements" />
      {error ? (
        <ErrorState error={error} onRetry={refetch} compact />
      ) : isLoading ? (
        <ul className="divide-y divide-line">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Skeleton className="size-8 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      ) : data.length === 0 ? (
        <EmptyState compact title="No activity in this period" />
      ) : (
        <ul className={cn('divide-y divide-line transition-opacity', isFetching && isPlaceholderData && 'opacity-60')}>
          {data.map((a) => {
            const kind = ACTIVITY[a.type];
            const inbound = a.quantity > 0;
            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <span
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
                    inbound ? 'bg-info-soft text-chart-in' : 'bg-warning-soft text-chart-out',
                  )}
                >
                  <kind.icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {kind.label}
                      {a.isReversal && ' (reversal)'}
                      <span className="font-normal text-muted"> · {a.document.referenceNo}</span>
                    </p>
                    <span className="num shrink-0 text-[13px] font-semibold text-ink">
                      {formatSigned(a.quantity)} <span className="font-normal text-muted">{unitLabel(a.equipment.unitOfMeasure, a.quantity)}</span>
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {a.equipment.name} · {a.base.code} · {a.createdBy.fullName} · {formatRelative(a.occurredAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
