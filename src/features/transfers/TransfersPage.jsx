import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, ArrowRight, Ban, CircleCheck, Clock, Eye, Layers, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { getEnvelope } from '../../api/client.js';
import { CellStack, DataTable, RecordCard } from '../../components/data/DataTable.jsx';
import { FilterBar, FilterField } from '../../components/data/FilterBar.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { formatDate, formatQuantity, formatShortDate } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { apiRange, DateRangeFilter } from '../shared/DateRangeFilter.jsx';
import { BaseSelect, EquipmentSelect } from '../shared/selects.jsx';
import { useUrlState } from '../shared/useUrlState.js';
import { CreateTransferModal } from './CreateTransferModal.jsx';
import { TransferDetailDrawer } from './TransferDetailDrawer.jsx';
import { CancelTransferDialog, CompleteTransferDialog, useTransferPermissions } from './transferActions.jsx';

const DEFAULTS = {
  status: '',
  preset: 'all',
  from: '',
  to: '',
  sourceBaseId: '',
  destinationBaseId: '',
  equipmentId: '',
  page: 1,
  pageSize: 25,
  open: '',
};

const STATUS_TABS = [
  { value: '', label: 'All', icon: Layers },
  { value: 'PENDING', label: 'Pending', icon: Clock },
  { value: 'COMPLETED', label: 'Completed', icon: CircleCheck },
  { value: 'CANCELLED', label: 'Cancelled', icon: Ban },
];

export function TransfersPage() {
  const { can } = useAuth();
  const permissions = useTransferPermissions();
  const [filters, setFilters, { reset, activeCount }] = useUrlState(DEFAULTS);
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const base = {
    ...apiRange(filters),
    sourceBaseId: filters.sourceBaseId,
    destinationBaseId: filters.destinationBaseId,
    equipmentId: filters.equipmentId,
  };
  const params = { ...base, status: filters.status, page: filters.page, pageSize: filters.pageSize };

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['transfers', 'list', params],
    queryFn: () => getEnvelope('/transfers', params),
    placeholderData: keepPreviousData,
  });

  // Counts per status for the tabs, under the same filters.
  const counts = useQueries({
    queries: STATUS_TABS.map((tab) => {
      const p = { ...base, status: tab.value, pageSize: 1 };
      return { queryKey: ['transfers', 'list', p], queryFn: () => getEnvelope('/transfers', p), placeholderData: keepPreviousData };
    }),
  });
  const tabs = STATUS_TABS.map((tab, i) => ({ ...tab, count: counts[i].data?.meta.total }));

  const openDetail = (t) => setFilters({ open: t.id, page: filters.page });
  const closeDetail = () => setFilters({ open: '', page: filters.page });
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  const columns = [
    { key: 'ref', header: 'Transfer ID', cell: (t) => <span className="whitespace-nowrap font-medium">{t.referenceNo}</span> },
    {
      key: 'date',
      header: 'Date',
      cell: (t) => (
        <CellStack
          primary={<span className="num">{formatDate(t.createdAt)}</span>}
          secondary={t.completedAt ? `Done ${formatShortDate(t.completedAt)}` : t.cancelledAt ? `Cancelled ${formatShortDate(t.cancelledAt)}` : 'Requested'}
        />
      ),
    },
    { key: 'source', header: 'Source', cell: (t) => <CellStack primary={t.sourceBase.code} secondary={t.sourceBase.name} className="max-w-28" /> },
    {
      key: 'destination',
      header: 'Destination',
      cell: (t) => (
        <div className="flex items-center gap-2">
          <CellStack primary={t.destinationBase.code} secondary={t.destinationBase.name} className="max-w-28" />
        </div>
      ),
    },
    { key: 'equipment', header: 'Equipment', cell: (t) => <CellStack primary={t.equipment.name} secondary={t.equipment.equipmentType.name} className="max-w-40" /> },
    { key: 'qty', header: 'Quantity', align: 'right', cell: (t) => <span className="num whitespace-nowrap font-medium">{formatQuantity(t.quantity, t.equipment.unitOfMeasure)}</span> },
    { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
    { key: 'by', header: 'Created by', cell: (t) => <span className="block max-w-32 truncate">{t.createdBy.fullName}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (t) => {
        const allowed = permissions(t);
        return (
          <div className="flex items-center justify-end gap-1.5">
            {allowed.complete && (
              <Button size="sm" variant="primary" onClick={stop(() => setCompleting(t))}>
                Complete
              </Button>
            )}
            {allowed.cancel && (
              <Button
                size="icon-sm"
                variant="ghost"
                icon={X}
                title="Cancel transfer"
                aria-label={`Cancel ${t.referenceNo}`}
                className="hover:bg-danger-soft hover:text-danger-ink"
                onClick={stop(() => setCancelling(t))}
              />
            )}
            {!allowed.complete && !allowed.cancel && (
              <Button size="icon-sm" variant="ghost" icon={Eye} title="View details" onClick={stop(() => openDetail(t))} aria-label={`View ${t.referenceNo}`} />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        icon={ArrowLeftRight}
        title="Asset Transfers"
        subtitle="Move stock between bases. Requests stay pending until the source base completes them."
        actions={
          can('transfer:create') && (
            <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
              New Transfer
            </Button>
          )
        }
      />

      <Tabs label="Transfer status" tabs={tabs} value={filters.status} onChange={(status) => setFilters({ status })} className="mb-4" />

      <FilterBar activeCount={activeCount - (filters.status ? 1 : 0)} onReset={() => setFilters({ ...DEFAULTS, status: filters.status })} className="mb-4">
        <FilterField label="Date requested" htmlFor="t-range" grow>
          <DateRangeFilter id="t-range" allowAll preset={filters.preset} from={filters.from} to={filters.to} onChange={setFilters} />
        </FilterField>
        <FilterField label="Source base" htmlFor="t-src">
          <BaseSelect id="t-src" directory value={filters.sourceBaseId} onChange={(sourceBaseId) => setFilters({ sourceBaseId })} allLabel="Any source" />
        </FilterField>
        <FilterField label="Destination base" htmlFor="t-dst">
          <BaseSelect
            id="t-dst"
            directory
            value={filters.destinationBaseId}
            onChange={(destinationBaseId) => setFilters({ destinationBaseId })}
            allLabel="Any destination"
          />
        </FilterField>
        <FilterField label="Equipment" htmlFor="t-eq">
          <EquipmentSelect id="t-eq" value={filters.equipmentId} onChange={(equipmentId) => setFilters({ equipmentId })} />
        </FilterField>
      </FilterBar>

      <Card>
        <DataTable
          columns={columns}
          rows={data?.data}
          loading={isLoading}
          fetching={isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={openDetail}
          rowLabel={(t) => `Transfer ${t.referenceNo}, ${t.status.toLowerCase()}`}
          minWidth={940}
          renderCard={(t) => {
            const allowed = permissions(t);
            return (
              <RecordCard
                title={t.referenceNo}
                badge={<StatusBadge status={t.status} />}
                subtitle={
                  <span className="inline-flex items-center gap-1.5">
                    {t.sourceBase.code} <ArrowRight className="size-3.5 text-faint" aria-label="to" /> {t.destinationBase.code}
                    <span className="text-muted">· {t.equipment.name}</span>
                  </span>
                }
                meta={[
                  ['Quantity', formatQuantity(t.quantity, t.equipment.unitOfMeasure)],
                  ['Requested', formatDate(t.createdAt)],
                  ['Created by', t.createdBy.fullName],
                  t.completedAt ? ['Completed', formatDate(t.completedAt)] : t.cancelledAt ? ['Cancelled', formatDate(t.cancelledAt)] : null,
                ]}
                actions={
                  (allowed.complete || allowed.cancel) && (
                    <>
                      {allowed.cancel && (
                        <Button size="md" onClick={() => setCancelling(t)}>
                          Cancel
                        </Button>
                      )}
                      {allowed.complete && (
                        <Button size="md" variant="primary" onClick={() => setCompleting(t)}>
                          Complete
                        </Button>
                      )}
                    </>
                  )
                }
              />
            );
          }}
          empty={{
            title: filters.status ? `No ${filters.status.toLowerCase()} transfers` : 'No transfers found',
            description: activeCount - (filters.status ? 1 : 0) > 0 ? 'Try clearing some filters.' : undefined,
          }}
        />
        <Pagination meta={data?.meta} onPageChange={(page) => setFilters({ page })} onPageSizeChange={(pageSize) => setFilters({ pageSize })} />
      </Card>

      <CreateTransferModal open={creating} onClose={() => setCreating(false)} />
      <TransferDetailDrawer id={filters.open} onClose={closeDetail} onComplete={setCompleting} onCancel={setCancelling} />
      <CompleteTransferDialog transfer={completing} onClose={() => setCompleting(null)} />
      <CancelTransferDialog transfer={cancelling} onClose={() => setCancelling(null)} />
    </>
  );
}
