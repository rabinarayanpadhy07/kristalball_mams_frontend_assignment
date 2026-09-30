import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Search, Undo2, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getEnvelope } from '../../api/client.js';
import { CellStack, DataTable, RecordCard } from '../../components/data/DataTable.jsx';
import { FilterBar, FilterField } from '../../components/data/FilterBar.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Input, Select } from '../../components/ui/Field.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { formatDate, formatNumber, formatQuantity } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { CustodyLegend } from '../shared/CustodyLegend.jsx';
import { apiRange, DateRangeFilter } from '../shared/DateRangeFilter.jsx';
import { BaseSelect, EquipmentSelect, EquipmentTypeSelect } from '../shared/selects.jsx';
import { useUrlState } from '../shared/useUrlState.js';
import { AssignModal, ReturnModal } from './AssignmentModals.jsx';

const DEFAULTS = {
  personnel: '',
  status: '',
  preset: 'all',
  from: '',
  to: '',
  baseId: '',
  equipmentTypeId: '',
  equipmentId: '',
  page: 1,
  pageSize: 25,
};

/** Debounced text input bound to a URL filter. */
function SearchInput({ value, onChange, id, placeholder }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return undefined;
    const t = setTimeout(() => onChange(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
      <Input id={id} type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

export function AssignmentsPage() {
  const { isAdmin, can } = useAuth();
  const [filters, setFilters, { reset, activeCount }] = useUrlState(DEFAULTS);
  const [assigning, setAssigning] = useState(false);
  const [returning, setReturning] = useState(null);

  const params = {
    ...apiRange(filters),
    personnel: filters.personnel,
    status: filters.status,
    baseId: isAdmin ? filters.baseId : undefined,
    equipmentTypeId: filters.equipmentTypeId,
    equipmentId: filters.equipmentId,
    page: filters.page,
    pageSize: filters.pageSize,
  };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['assignments', 'list', params],
    queryFn: () => getEnvelope('/assignments', params),
    placeholderData: keepPreviousData,
  });

  const columns = [
    {
      key: 'personnel',
      header: 'Personnel',
      cell: (a) => <CellStack primary={<span className="font-medium">{a.assigneeName}</span>} secondary={[a.assigneeServiceNo, a.assigneeUnit].filter(Boolean).join(' · ')} className="max-w-52" />,
    },
    { key: 'base', header: 'Base', cell: (a) => <CellStack primary={a.base.code} secondary={a.base.name} className="max-w-32" /> },
    {
      key: 'equipment',
      header: 'Equipment',
      cell: (a) => <CellStack primary={a.equipment.name} secondary={a.asset ? a.asset.serialNumber : a.equipment.equipmentType.name} className="max-w-48" />,
    },
    {
      key: 'qty',
      header: 'Quantity',
      align: 'right',
      cell: (a) => (
        <CellStack
          primary={<span className="num font-medium">{formatQuantity(a.quantity, a.equipment.unitOfMeasure)}</span>}
          secondary={
            a.status === 'ACTIVE' && a.quantityOutstanding !== a.quantity
              ? `${formatNumber(a.quantityOutstanding)} still held`
              : a.quantityExpended > 0
                ? `${formatNumber(a.quantityExpended)} expended`
                : undefined
          }
        />
      ),
    },
    { key: 'assigned', header: 'Assigned date', cell: (a) => <span className="num whitespace-nowrap">{formatDate(a.assignedAt)}</span> },
    { key: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'returned',
      header: 'Returned date',
      cell: (a) =>
        a.closedAt ? (
          <span className="num whitespace-nowrap">{formatDate(a.closedAt)}</span>
        ) : a.quantityReturned > 0 ? (
          <span className="whitespace-nowrap text-muted">Partial</span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (a) =>
        a.status === 'ACTIVE' && can('assignment:return') ? (
          <Button size="sm" variant="secondary" icon={Undo2} onClick={() => setReturning(a)} aria-label={`Return equipment from ${a.assigneeName}`}>
            Return
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        icon={UserCheck}
        title="Assignments"
        subtitle="Equipment in personnel custody. Assigned stock still exists and remains on hand."
        actions={
          can('assignment:create') && (
            <Button variant="primary" icon={Plus} onClick={() => setAssigning(true)}>
              Assign
            </Button>
          )
        }
      />

      <CustodyLegend emphasis="assigned" className="mb-4" />

      <FilterBar activeCount={activeCount} onReset={reset} className="mb-4">
        <FilterField label="Personnel" htmlFor="a-person">
          <SearchInput id="a-person" value={filters.personnel} onChange={(personnel) => setFilters({ personnel })} placeholder="Name or service no." />
        </FilterField>
        <FilterField label="Status" htmlFor="a-status">
          <Select id="a-status" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
            <option value="">Any status</option>
            <option value="ACTIVE">Assigned (active)</option>
            <option value="RETURNED">Returned</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </FilterField>
        <FilterField label="Assigned" htmlFor="a-range" grow>
          <DateRangeFilter id="a-range" allowAll preset={filters.preset} from={filters.from} to={filters.to} onChange={setFilters} />
        </FilterField>
        {isAdmin && (
          <FilterField label="Base" htmlFor="a-base">
            <BaseSelect id="a-base" value={filters.baseId} onChange={(baseId) => setFilters({ baseId })} />
          </FilterField>
        )}
        <FilterField label="Equipment type" htmlFor="a-type">
          <EquipmentTypeSelect id="a-type" value={filters.equipmentTypeId} onChange={(equipmentTypeId) => setFilters({ equipmentTypeId, equipmentId: '' })} />
        </FilterField>
        <FilterField label="Equipment" htmlFor="a-eq">
          <EquipmentSelect id="a-eq" value={filters.equipmentId} equipmentTypeId={filters.equipmentTypeId} onChange={(equipmentId) => setFilters({ equipmentId })} />
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
          minWidth={920}
          renderCard={(a) => (
            <RecordCard
              title={a.assigneeName}
              badge={<StatusBadge status={a.status} />}
              subtitle={
                <>
                  {a.equipment.name}
                  {a.asset && <span className="font-mono text-[12px] text-muted"> · {a.asset.serialNumber}</span>}
                </>
              }
              meta={[
                ['Quantity', a.status === 'ACTIVE' && a.quantityOutstanding !== a.quantity ? `${formatNumber(a.quantityOutstanding)} of ${formatQuantity(a.quantity, a.equipment.unitOfMeasure)} held` : formatQuantity(a.quantity, a.equipment.unitOfMeasure)],
                ['Service no.', a.assigneeServiceNo],
                ['Assigned', formatDate(a.assignedAt)],
                ['Returned', a.closedAt ? formatDate(a.closedAt) : a.quantityReturned > 0 ? 'Partial' : '—'],
                ['Base', `${a.base.code} · ${a.base.name}`],
              ]}
              actions={
                a.status === 'ACTIVE' &&
                can('assignment:return') && (
                  <Button icon={Undo2} onClick={() => setReturning(a)}>
                    Return
                  </Button>
                )
              }
            />
          )}
          empty={{ title: activeCount ? 'No assignments match these filters' : 'No equipment is assigned', description: activeCount ? 'Try clearing some filters.' : undefined }}
        />
        <Pagination meta={data?.meta} onPageChange={(page) => setFilters({ page })} onPageSizeChange={(pageSize) => setFilters({ pageSize })} />
      </Card>

      <AssignModal open={assigning} onClose={() => setAssigning(false)} />
      <ReturnModal assignment={returning} onClose={() => setReturning(null)} />
    </>
  );
}
