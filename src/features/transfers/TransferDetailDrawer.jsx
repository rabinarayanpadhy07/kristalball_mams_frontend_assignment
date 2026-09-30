import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Ban, CircleCheck, Clock } from 'lucide-react';
import { getData } from '../../api/client.js';
import { Button } from '../../components/ui/Button.jsx';
import { DetailList, Drawer } from '../../components/ui/Drawer.jsx';
import { ErrorState, LoadingState } from '../../components/ui/States.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { cn } from '../../lib/cn.js';
import { formatDateTime, formatQuantity, formatSigned, unitLabel } from '../../lib/format.js';
import { useTransferPermissions } from './transferActions.jsx';

function Timeline({ t }) {
  const events = [
    { icon: Clock, tone: 'text-muted bg-subtle', title: 'Requested', by: t.createdBy?.fullName, at: t.createdAt },
    t.status === 'COMPLETED' && {
      icon: CircleCheck,
      tone: 'text-success bg-success-soft',
      title: 'Completed: stock moved',
      by: t.completedBy?.fullName,
      at: t.completedAt,
    },
    t.status === 'CANCELLED' && {
      icon: Ban,
      tone: 'text-muted bg-subtle',
      title: 'Cancelled',
      by: t.cancelledBy?.fullName,
      at: t.cancelledAt,
      note: t.cancelReason,
    },
    t.status === 'PENDING' && { icon: Clock, tone: 'text-warning-ink bg-warning-soft', title: 'Awaiting completion by the source base', pending: true },
  ].filter(Boolean);

  return (
    <ol className="relative space-y-4">
      {events.map((e, i) => (
        <li key={e.title} className="relative flex gap-3">
          {i < events.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-4px)] w-px bg-line" aria-hidden />}
          <span className={cn('relative flex size-7 shrink-0 items-center justify-center rounded-full', e.tone)}>
            <e.icon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={cn('text-[13px] font-medium', e.pending ? 'text-muted' : 'text-ink')}>{e.title}</p>
            {e.at && (
              <p className="text-[12px] text-muted">
                {formatDateTime(e.at)} {e.by && `· ${e.by}`}
              </p>
            )}
            {e.note && <p className="mt-1 rounded-md bg-subtle px-2.5 py-1.5 text-[12px] text-ink">“{e.note}”</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Full record of one transfer: route, units, status history and ledger entries. */
export function TransferDetailDrawer({ id, onClose, onComplete, onCancel }) {
  const permissions = useTransferPermissions();
  const { data: t, isLoading, error, refetch } = useQuery({
    queryKey: ['transfers', 'detail', id],
    queryFn: () => getData(`/transfers/${id}`),
    enabled: Boolean(id),
  });
  const allowed = t ? permissions(t) : {};

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={t?.referenceNo ?? 'Transfer'}
      headerExtra={t && <StatusBadge status={t.status} />}
      footer={
        t && (allowed.complete || allowed.cancel) ? (
          <>
            {allowed.cancel && (
              <Button variant="danger-outline" onClick={() => onCancel(t)}>
                Cancel transfer
              </Button>
            )}
            {allowed.complete && (
              <Button variant="primary" onClick={() => onComplete(t)}>
                Complete transfer
              </Button>
            )}
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      {error ? (
        <ErrorState error={error} onRetry={refetch} compact />
      ) : isLoading || !t ? (
        <LoadingState lines={8} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-md border border-line p-3">
            <div className="min-w-0 flex-1">
              <p className="text-2xs uppercase tracking-wide text-muted">From</p>
              <p className="truncate text-[13px] font-medium text-ink">{t.sourceBase.name}</p>
              <p className="text-[12px] text-muted">{t.sourceBase.code}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
            <div className="min-w-0 flex-1 text-right">
              <p className="text-2xs uppercase tracking-wide text-muted">To</p>
              <p className="truncate text-[13px] font-medium text-ink">{t.destinationBase.name}</p>
              <p className="text-[12px] text-muted">{t.destinationBase.code}</p>
            </div>
          </div>

          <DetailList
            items={[
              { label: 'Equipment', value: t.equipment.name },
              { label: 'Type', value: t.equipment.equipmentType.name },
              { label: 'Quantity', value: formatQuantity(t.quantity, t.equipment.unitOfMeasure) },
              { label: 'Created', value: formatDateTime(t.createdAt) },
              t.notes && { label: 'Notes', value: t.notes, wide: true },
            ]}
          />

          {t.assets.length > 0 && (
            <section>
              <h3 className="mb-2 text-[13px] font-semibold text-ink">Serialized units ({t.assets.length})</h3>
              <div className="flex flex-wrap gap-1.5">
                {t.assets.map((a) => (
                  <span key={a.id} className="rounded-sm border border-line bg-subtle px-1.5 py-0.5 font-mono text-[12px] text-ink">
                    {a.serialNumber}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-[13px] font-semibold text-ink">History</h3>
            <Timeline t={t} />
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">Stock movements</h3>
            {t.movements.length === 0 ? (
              <p className="text-[13px] text-muted">
                {t.status === 'CANCELLED' ? 'None: the transfer was cancelled before any stock moved.' : 'None yet: stock moves when the transfer is completed.'}
              </p>
            ) : (
              <div className="scroll-thin overflow-x-auto rounded-md border border-line">
                <table className="w-full min-w-[420px] text-[12px]">
                  <thead className="bg-subtle text-left text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Base</th>
                      <th className="px-3 py-2 font-medium">Entry</th>
                      <th className="px-3 py-2 font-medium">Unit</th>
                      <th className="px-3 py-2 text-right font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.movements.map((m) => (
                      <tr key={m.id} className="border-t border-line">
                        <td className="px-3 py-2">{m.base.code}</td>
                        <td className="px-3 py-2">{m.type === 'TRANSFER_OUT' ? 'Transfer out' : 'Transfer in'}</td>
                        <td className="px-3 py-2 font-mono">{m.asset?.serialNumber ?? '—'}</td>
                        <td className="num px-3 py-2 text-right font-medium">
                          {formatSigned(m.quantityDelta)} {unitLabel(t.equipment.unitOfMeasure, m.quantityDelta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
