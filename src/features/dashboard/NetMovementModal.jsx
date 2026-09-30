import { Info } from 'lucide-react';
import { DataTable } from '../../components/data/DataTable.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Callout } from '../../components/ui/Card.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/States.jsx';
import { cn } from '../../lib/cn.js';
import { formatDate, formatNumber, formatSigned, unitLabel } from '../../lib/format.js';
import { useMovementBreakdown } from './api.js';

function Line({ label, sign, value, strong, loading }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2.5', strong && 'border-t border-line-strong pt-3')}>
      <span className={cn('flex items-center gap-2 text-[13px]', strong ? 'font-semibold text-ink' : 'text-muted')}>
        <span className="num w-3 text-center text-faint" aria-hidden>
          {sign}
        </span>
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-5 w-20" />
      ) : (
        <span className={cn('num text-ink', strong ? 'text-lg font-semibold' : 'text-[15px] font-medium')}>
          {strong ? formatSigned(value) : formatNumber(value)}
        </span>
      )}
    </div>
  );
}

/** Net Movement = Purchases + Transfer In − Transfer Out, with the per-equipment drill-down. */
export function NetMovementModal({ open, onClose, params, allBases }) {
  const { data, isLoading, error, refetch } = useMovementBreakdown(params, open);

  const columns = [
    { key: 'equipment', header: 'Equipment', cell: (r) => <span className="font-medium">{r.equipment.name}</span> },
    { key: 'purchases', header: 'Purchases', align: 'right', cell: (r) => <span className="num">{formatNumber(r.purchases)}</span> },
    { key: 'in', header: 'Transfer in', align: 'right', cell: (r) => <span className="num">{formatNumber(r.transferIn)}</span> },
    { key: 'out', header: 'Transfer out', align: 'right', cell: (r) => <span className="num">{formatNumber(r.transferOut)}</span> },
    {
      key: 'net',
      header: 'Net',
      align: 'right',
      cell: (r) => (
        <span className="num font-semibold">
          {formatSigned(r.netMovement)} <span className="font-normal text-muted">{unitLabel(r.equipment.unitOfMeasure, r.netMovement)}</span>
        </span>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Net movement"
      description={data ? `${formatDate(data.period.from)} – ${formatDate(data.period.to)}` : undefined}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {error ? (
        <ErrorState error={error} onRetry={refetch} compact />
      ) : (
        <div className="space-y-5">
          <div className="rounded-md border border-line px-4">
            <Line label="Purchases" sign="+" value={data?.purchases} loading={isLoading} />
            <Line label="Transfer in" sign="+" value={data?.transferIn} loading={isLoading} />
            <Line label="Transfer out" sign="−" value={data?.transferOut} loading={isLoading} />
            <Line label="Net movement" sign="=" value={data?.netMovement} loading={isLoading} strong />
          </div>

          {allBases && (
            <Callout icon={Info}>Across all bases, a transfer between two bases counts once as transfer in and once as transfer out, so it nets to zero.</Callout>
          )}

          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">By equipment</h3>
            <div className="overflow-hidden rounded-md border border-line">
              <DataTable
                columns={columns}
                rows={data?.byEquipment}
                getRowKey={(r) => r.equipment.id}
                loading={isLoading}
                skeletonRows={3}
                minWidth={520}
                empty={{ title: 'No purchases or transfers in this period' }}
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
