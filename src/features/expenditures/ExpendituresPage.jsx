import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Flame, Plus } from 'lucide-react';
import { useState } from 'react';
import { getEnvelope } from '../../api/client.js';
import { CellStack, DataTable, RecordCard } from '../../components/data/DataTable.jsx';
import { FilterBar, FilterField } from '../../components/data/FilterBar.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Select } from '../../components/ui/Field.jsx';
import { Badge, StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { formatDate, formatNumber, unitLabel } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { CustodyLegend } from '../shared/CustodyLegend.jsx';
import { apiRange, DateRangeFilter } from '../shared/DateRangeFilter.jsx';
import { BaseSelect, EquipmentSelect, EquipmentTypeSelect } from '../shared/selects.jsx';
import { useUrlState } from '../shared/useUrlState.js';
import { AddExpenditureModal, REASONS } from './AddExpenditureModal.jsx';

const DEFAULTS = { preset: 'all', from: '', to: '', baseId: '', equipmentTypeId: '', equipmentId: '', reason: '', page: 1, pageSize: 25 };
const REASON_LABEL = Object.fromEntries(REASONS);

export function ExpendituresPage() {
  const { isAdmin, can } = useAuth();
  const [filters, setFilters, { reset, activeCount }] = useUrlState(DEFAULTS);
  const [adding, setAdding] = useState(false);

  const params = {
    ...apiRange(filters),
    baseId: isAdmin ? filters.baseId : undefined,
    equipmentTypeId: filters.equipmentTypeId,
    equipmentId: filters.equipmentId,
    reason: filters.reason,
    page: filters.page,
    pageSize: filters.pageSize,
  };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['expenditures', 'list', params],
    queryFn: () => getEnvelope('/expenditures', params),
    placeholderData: keepPreviousData,
  });

  const columns = [
    { key: 'date', header: 'Date', cell: (x) => <CellStack primary={<span className="num">{formatDate(x.expendedAt)}</span>} secondary={x.referenceNo} /> },
    { key: 'base', header: 'Base', cell: (x) => <CellStack primary={x.base.code} secondary={x.base.name} className="max-w-32" /> },
    {
      key: 'equipment',
      header: 'Equipment',
      cell: (x) => (
        <CellStack
          primary={x.equipment.name}
          secondary={x.asset ? x.asset.serialNumber : x.assignment ? `From ${x.assignment.assigneeName}` : undefined}
          className="max-w-56"
        />
      ),
    },
    { key: 'type', header: 'Type', cell: (x) => <span className="block max-w-32 truncate text-muted">{x.equipment.equipmentType.name}</span> },
    {
      key: 'qty',
      header: 'Quantity',
      align: 'right',
      cell: (x) => (
        <span className="num inline-flex items-center gap-1.5 whitespace-nowrap font-medium">
          <Flame className="size-3.5 text-danger" aria-label="Expended" />−{formatNumber(x.quantity)}
          <span className="font-normal text-muted">{unitLabel(x.equipment.unitOfMeasure, x.quantity)}</span>
        </span>
      ),
    },
    { key: 'reason', header: 'Reason', cell: (x) => <Badge>{REASON_LABEL[x.reason] ?? x.reason}</Badge> },
    { key: 'by', header: 'Recorded by', cell: (x) => <span className="block max-w-36 truncate">{x.createdBy.fullName}</span> },
    { key: 'status', header: 'Status', cell: (x) => (x.status === 'POSTED' ? <StatusBadge status="EXPENDED" /> : <StatusBadge status={x.status} />) },
  ];

  return (
    <>
      <PageHeader
        icon={Flame}
        title="Expenditures"
        subtitle="Stock consumed, destroyed or lost, permanently removed from inventory."
        actions={
          can('expenditure:create') && (
            <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
              Record Expenditure
            </Button>
          )
        }
      />

      <CustodyLegend emphasis="expended" className="mb-4" />

      <FilterBar activeCount={activeCount} onReset={reset} className="mb-4">
        <FilterField label="Date" htmlFor="x-range" grow>
          <DateRangeFilter id="x-range" allowAll preset={filters.preset} from={filters.from} to={filters.to} onChange={setFilters} />
        </FilterField>
        {isAdmin && (
          <FilterField label="Base" htmlFor="x-base">
            <BaseSelect id="x-base" value={filters.baseId} onChange={(baseId) => setFilters({ baseId })} />
          </FilterField>
        )}
        <FilterField label="Equipment type" htmlFor="x-type">
          <EquipmentTypeSelect id="x-type" value={filters.equipmentTypeId} onChange={(equipmentTypeId) => setFilters({ equipmentTypeId, equipmentId: '' })} />
        </FilterField>
        <FilterField label="Equipment" htmlFor="x-eq">
          <EquipmentSelect id="x-eq" value={filters.equipmentId} equipmentTypeId={filters.equipmentTypeId} onChange={(equipmentId) => setFilters({ equipmentId })} />
        </FilterField>
        <FilterField label="Reason" htmlFor="x-reason">
          <Select id="x-reason" value={filters.reason} onChange={(e) => setFilters({ reason: e.target.value })}>
            <option value="">Any reason</option>
            {REASONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
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
          minWidth={900}
          renderCard={(x) => (
            <RecordCard
              title={x.equipment.name}
              badge={x.status === 'POSTED' ? <StatusBadge status="EXPENDED" /> : <StatusBadge status={x.status} />}
              subtitle={
                <span className="num font-medium">
                  −{formatNumber(x.quantity)} <span className="font-normal text-muted">{unitLabel(x.equipment.unitOfMeasure, x.quantity)} · {REASON_LABEL[x.reason] ?? x.reason}</span>
                </span>
              }
              meta={[
                ['Date', formatDate(x.expendedAt)],
                ['Base', `${x.base.code} · ${x.base.name}`],
                ['Type', x.equipment.equipmentType.name],
                ['Recorded by', x.createdBy.fullName],
                x.assignment ? ['From assignment', x.assignment.assigneeName] : null,
                x.asset ? ['Serial', x.asset.serialNumber] : null,
              ]}
            />
          )}
          empty={{ title: activeCount ? 'No expenditures match these filters' : 'No expenditures recorded', description: activeCount ? 'Try clearing some filters.' : undefined }}
        />
        <Pagination meta={data?.meta} onPageChange={(page) => setFilters({ page })} onPageSizeChange={(pageSize) => setFilters({ pageSize })} />
      </Card>

      <AddExpenditureModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
