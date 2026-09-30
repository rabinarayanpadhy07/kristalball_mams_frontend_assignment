import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, Plus, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { getData, getEnvelope } from '../../api/client.js';
import { CellStack, DataTable, RecordCard } from '../../components/data/DataTable.jsx';
import { FilterBar, FilterField } from '../../components/data/FilterBar.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { DetailList } from '../../components/ui/Drawer.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ErrorState, LoadingState } from '../../components/ui/States.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { formatDate, formatDateTime, formatQuantity } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { apiRange, DateRangeFilter } from '../shared/DateRangeFilter.jsx';
import { BaseSelect, EquipmentSelect, EquipmentTypeSelect } from '../shared/selects.jsx';
import { useUrlState } from '../shared/useUrlState.js';
import { AddPurchaseModal } from './AddPurchaseModal.jsx';

const DEFAULTS = { preset: 'all', from: '', to: '', baseId: '', equipmentTypeId: '', equipmentId: '', page: 1, pageSize: 25, open: '' };

function PurchaseDetail({ id, onClose }) {
  const { data: p, isLoading, error, refetch } = useQuery({
    queryKey: ['purchases', 'detail', id],
    queryFn: () => getData(`/purchases/${id}`),
    enabled: Boolean(id),
  });
  return (
    <Modal open={Boolean(id)} onClose={onClose} title={p?.referenceNo ?? 'Purchase'} description={p ? `Recorded ${formatDateTime(p.createdAt)}` : undefined} footer={<Button onClick={onClose}>Close</Button>}>
      {error ? (
        <ErrorState error={error} onRetry={refetch} compact />
      ) : isLoading || !p ? (
        <LoadingState lines={6} />
      ) : (
        <div className="space-y-5">
          <DetailList
            items={[
              { label: 'Status', value: <StatusBadge status={p.status} /> },
              { label: 'Purchase date', value: formatDate(p.purchasedAt) },
              { label: 'Base', value: `${p.base.code} · ${p.base.name}` },
              { label: 'Reference number', value: p.purchaseOrderNo },
              { label: 'Equipment', value: p.equipment.name },
              { label: 'Type', value: p.equipment.equipmentType.name },
              { label: 'Quantity', value: formatQuantity(p.quantity, p.equipment.unitOfMeasure) },
              { label: 'Recorded by', value: p.createdBy.fullName },
              p.supplierName && { label: 'Supplier', value: p.supplierName },
              p.notes && { label: 'Notes', value: p.notes, wide: true },
            ]}
          />
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">Stock ledger</h3>
            <p className="text-[13px] text-muted">
              {p.movements.length === 1
                ? `One PURCHASE entry of ${formatQuantity(p.movements[0].quantityDelta, p.equipment.unitOfMeasure)} added to ${p.base.code}.`
                : `${p.movements.length} PURCHASE entries (one per serialized unit) added to ${p.base.code}.`}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function PurchasesPage() {
  const { isAdmin, can } = useAuth();
  const [filters, setFilters, { reset, activeCount }] = useUrlState(DEFAULTS);
  const [adding, setAdding] = useState(false);

  const params = {
    ...apiRange(filters),
    baseId: isAdmin ? filters.baseId : undefined,
    equipmentTypeId: filters.equipmentTypeId,
    equipmentId: filters.equipmentId,
    page: filters.page,
    pageSize: filters.pageSize,
  };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['purchases', 'list', params],
    queryFn: () => getEnvelope('/purchases', params),
    placeholderData: keepPreviousData,
  });

  const open = (p) => setFilters({ open: p.id, page: filters.page });

  const columns = [
    { key: 'date', header: 'Date', cell: (p) => <span className="num whitespace-nowrap">{formatDate(p.purchasedAt)}</span> },
    { key: 'ref', header: 'Reference', cell: (p) => <CellStack primary={<span className="font-medium">{p.referenceNo}</span>} secondary={p.purchaseOrderNo} className="max-w-36" /> },
    { key: 'base', header: 'Base', cell: (p) => <CellStack primary={p.base.code} secondary={p.base.name} className="max-w-32" /> },
    { key: 'equipment', header: 'Equipment', cell: (p) => <span className="block max-w-52 truncate">{p.equipment.name}</span> },
    { key: 'type', header: 'Type', cell: (p) => <span className="block max-w-32 truncate text-muted">{p.equipment.equipmentType.name}</span> },
    { key: 'qty', header: 'Quantity', align: 'right', cell: (p) => <span className="num whitespace-nowrap font-medium">{formatQuantity(p.quantity, p.equipment.unitOfMeasure)}</span> },
    { key: 'by', header: 'Created by', cell: (p) => <span className="block max-w-36 truncate">{p.createdBy.fullName}</span> },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (p) => (
        <Button
          size="icon-sm"
          variant="ghost"
          icon={Eye}
          title="View details"
          onClick={(e) => {
            e.stopPropagation();
            open(p);
          }}
          aria-label={`View ${p.referenceNo}`}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={ShoppingCart}
        title="Purchases"
        subtitle="Record and review asset acquisitions."
        actions={
          can('purchase:create') && (
            <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
              Add Purchase
            </Button>
          )
        }
      />

      <FilterBar activeCount={activeCount} onReset={reset} className="mb-4">
        <FilterField label="Date" htmlFor="p-range" grow>
          <DateRangeFilter id="p-range" allowAll preset={filters.preset} from={filters.from} to={filters.to} onChange={setFilters} />
        </FilterField>
        {isAdmin && (
          <FilterField label="Base" htmlFor="p-base">
            <BaseSelect id="p-base" value={filters.baseId} onChange={(baseId) => setFilters({ baseId })} />
          </FilterField>
        )}
        <FilterField label="Equipment type" htmlFor="p-type">
          <EquipmentTypeSelect id="p-type" value={filters.equipmentTypeId} onChange={(equipmentTypeId) => setFilters({ equipmentTypeId, equipmentId: '' })} />
        </FilterField>
        <FilterField label="Equipment" htmlFor="p-eq">
          <EquipmentSelect id="p-eq" value={filters.equipmentId} equipmentTypeId={filters.equipmentTypeId} onChange={(equipmentId) => setFilters({ equipmentId })} />
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
          onRowClick={open}
          rowLabel={(p) => `Purchase ${p.referenceNo}`}
          minWidth={900}
          renderCard={(p) => (
            <RecordCard
              title={p.referenceNo}
              badge={<StatusBadge status={p.status} />}
              subtitle={p.equipment.name}
              meta={[
                ['Quantity', formatQuantity(p.quantity, p.equipment.unitOfMeasure)],
                ['Date', formatDate(p.purchasedAt)],
                ['Base', `${p.base.code} · ${p.base.name}`],
                ['Reference', p.purchaseOrderNo ?? '—'],
                ['Type', p.equipment.equipmentType.name],
                ['Created by', p.createdBy.fullName],
              ]}
            />
          )}
          empty={{
            title: activeCount ? 'No purchases match these filters' : 'No purchases recorded yet',
            description: activeCount ? 'Try widening the date range or clearing filters.' : undefined,
            action:
              !activeCount && can('purchase:create') ? (
                <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
                  Add Purchase
                </Button>
              ) : undefined,
          }}
        />
        <Pagination meta={data?.meta} onPageChange={(page) => setFilters({ page })} onPageSizeChange={(pageSize) => setFilters({ pageSize })} />
      </Card>

      <AddPurchaseModal open={adding} onClose={() => setAdding(false)} />
      <PurchaseDetail id={filters.open} onClose={() => setFilters({ open: '', page: filters.page })} />
    </>
  );
}
