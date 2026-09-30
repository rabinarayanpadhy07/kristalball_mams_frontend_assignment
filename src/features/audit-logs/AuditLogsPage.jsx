import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Lock, ScrollText } from 'lucide-react';
import { getData, getEnvelope } from '../../api/client.js';
import { CellStack, DataTable, RecordCard } from '../../components/data/DataTable.jsx';
import { FilterBar, FilterField } from '../../components/data/FilterBar.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { DetailList, Drawer } from '../../components/ui/Drawer.jsx';
import { Select } from '../../components/ui/Field.jsx';
import { ErrorState, LoadingState } from '../../components/ui/States.jsx';
import { Badge } from '../../components/ui/StatusBadge.jsx';
import { cn } from '../../lib/cn.js';
import { formatDateTime, ROLE_LABELS } from '../../lib/format.js';
import { apiRange, DateRangeFilter } from '../shared/DateRangeFilter.jsx';
import { useUsers } from '../shared/lookups.js';
import { BaseSelect } from '../shared/selects.jsx';
import { useUrlState } from '../shared/useUrlState.js';

const DEFAULTS = { preset: '30d', from: '', to: '', actorUserId: '', action: '', entityType: '', baseId: '', page: 1, pageSize: 50, open: '' };

const actionTone = (action) =>
  /DENIED|FAILED|BLOCKED|LOCKED/.test(action) ? 'danger' : /CANCELLED|VOIDED/.test(action) ? 'warning' : /LOGIN|LOGOUT|SESSION/.test(action) ? 'neutral' : 'primary';

/** One-line summary of what changed, for the table. */
function summarize(entry) {
  const m = entry.metadata ?? {};
  if (entry.before?.status && entry.after?.status && entry.before.status !== entry.after.status) {
    return `${entry.before.status} → ${entry.after.status}`;
  }
  if (m.reason) return String(m.reason);
  if (m.requestedBaseId) return `Requested base ${m.requestedBaseId}`;
  if (entry.after?.referenceNo) return entry.after.referenceNo;
  if (m.email) return m.email;
  return entry.after ? 'Record created' : '—';
}

function JsonBlock({ title, value, tone }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {value == null ? (
        <p className="rounded-md border border-dashed border-line px-3 py-3 text-[12px] text-faint">None recorded</p>
      ) : (
        <pre
          className={cn(
            'scroll-thin max-h-80 overflow-auto rounded-md border p-3 font-mono text-[12px] leading-5 text-ink',
            tone === 'before' ? 'border-line bg-subtle' : 'border-accent/30 bg-primary-light/40',
          )}
        >
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </section>
  );
}

/** Read-only record view: there is deliberately no edit or delete control anywhere. */
function AuditDetail({ id, onClose }) {
  const { data: e, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs', 'detail', id],
    queryFn: () => getData(`/audit-logs/${id}`),
    enabled: Boolean(id),
  });
  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      width="lg"
      title={e ? e.action : 'Audit record'}
      subtitle={e ? formatDateTime(e.createdAt) : undefined}
      headerExtra={
        <span className="inline-flex items-center gap-1 text-[12px] text-muted">
          <Lock className="size-3.5" aria-hidden /> Read-only record
        </span>
      }
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {error ? (
        <ErrorState error={error} onRetry={refetch} compact />
      ) : isLoading || !e ? (
        <LoadingState lines={8} />
      ) : (
        <div className="space-y-6">
          <DetailList
            items={[
              { label: 'Action', value: <Badge tone={actionTone(e.action)}>{e.action}</Badge> },
              { label: 'Timestamp', value: formatDateTime(e.createdAt) },
              { label: 'Actor', value: e.actor ? `${e.actor.fullName} (${e.actorEmail})` : e.actorEmail ?? 'System / anonymous' },
              { label: 'Role at the time', value: ROLE_LABELS[e.actorRole] ?? e.actorRole ?? '—' },
              { label: 'Entity', value: `${e.entityType}${e.entityId ? ` #${e.entityId}` : ''}` },
              { label: 'Base', value: e.base ? `${e.base.code} · ${e.base.name}` : '—' },
              { label: 'IP address', value: <span className="font-mono">{e.ipAddress ?? '—'}</span> },
              { label: 'Request ID', value: <span className="break-all font-mono text-[12px]">{e.requestId ?? '—'}</span> },
              e.userAgent && { label: 'User agent', value: <span className="break-all text-[12px] text-muted">{e.userAgent}</span>, wide: true },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <JsonBlock title="Before" value={e.before} tone="before" />
            <JsonBlock title="After" value={e.after} tone="after" />
          </div>
          {e.metadata && <JsonBlock title="Details" value={e.metadata} tone="before" />}
        </div>
      )}
    </Drawer>
  );
}

export function AuditLogsPage() {
  const [filters, setFilters, { reset, activeCount }] = useUrlState(DEFAULTS);
  const users = useUsers();
  const facets = useQuery({ queryKey: ['audit-logs', 'facets'], queryFn: () => getData('/audit-logs/facets'), staleTime: 60_000 });

  const params = {
    ...apiRange(filters),
    actorUserId: filters.actorUserId,
    action: filters.action,
    entityType: filters.entityType,
    baseId: filters.baseId,
    page: filters.page,
    pageSize: filters.pageSize,
  };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['audit-logs', 'list', params],
    queryFn: () => getEnvelope('/audit-logs', params),
    placeholderData: keepPreviousData,
  });

  const open = (e) => setFilters({ open: e.id, page: filters.page });

  const columns = [
    { key: 'time', header: 'Timestamp', cell: (e) => <span className="num whitespace-nowrap">{formatDateTime(e.createdAt)}</span> },
    {
      key: 'user',
      header: 'User',
      cell: (e) => <CellStack primary={e.actor?.fullName ?? e.actorEmail ?? 'Anonymous'} secondary={ROLE_LABELS[e.actorRole] ?? (e.actor ? e.actorEmail : undefined)} className="max-w-44" />,
    },
    { key: 'action', header: 'Action', cell: (e) => <Badge tone={actionTone(e.action)} className="font-mono text-[11px]">{e.action}</Badge> },
    { key: 'entity', header: 'Entity', cell: (e) => e.entityType },
    { key: 'entityId', header: 'Entity ID', cell: (e) => <span className="font-mono text-[12px]">{e.entityId ?? '—'}</span> },
    { key: 'base', header: 'Base', cell: (e) => e.base?.code ?? <span className="text-faint">—</span> },
    { key: 'ip', header: 'IP address', cell: (e) => <span className="font-mono text-[12px] text-muted">{e.ipAddress ?? '—'}</span> },
    { key: 'details', header: 'Details', cell: (e) => <span className="block max-w-56 truncate text-muted">{summarize(e)}</span> },
  ];

  return (
    <>
      <PageHeader
        icon={ScrollText}
        title="Audit Logs"
        subtitle="A permanent, read-only record of every change and security event."
        meta={<Badge icon={Lock}>Read-only · entries cannot be edited or deleted</Badge>}
      />

      <FilterBar activeCount={activeCount} onReset={reset} className="mb-4">
        <FilterField label="Date" htmlFor="l-range" grow>
          <DateRangeFilter id="l-range" allowAll preset={filters.preset} from={filters.from} to={filters.to} onChange={setFilters} />
        </FilterField>
        <FilterField label="User" htmlFor="l-user">
          <Select id="l-user" value={filters.actorUserId} onChange={(e) => setFilters({ actorUserId: e.target.value })} disabled={users.isLoading}>
            <option value="">Any user</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Action" htmlFor="l-action">
          <Select id="l-action" value={filters.action} onChange={(e) => setFilters({ action: e.target.value })}>
            <option value="">Any action</option>
            {facets.data?.actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Entity type" htmlFor="l-entity">
          <Select id="l-entity" value={filters.entityType} onChange={(e) => setFilters({ entityType: e.target.value })}>
            <option value="">Any entity</option>
            {facets.data?.entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Base" htmlFor="l-base">
          <BaseSelect id="l-base" value={filters.baseId} onChange={(baseId) => setFilters({ baseId })} />
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
          rowLabel={(e) => `Audit record ${e.action} at ${formatDateTime(e.createdAt)}`}
          minWidth={980}
          renderCard={(e) => (
            <RecordCard
              title={<span className="font-mono text-[12px]">{e.action}</span>}
              badge={<span className="text-[12px] text-muted">{formatDateTime(e.createdAt)}</span>}
              subtitle={e.actor?.fullName ?? e.actorEmail ?? 'Anonymous'}
              meta={[
                ['Entity', `${e.entityType}${e.entityId ? ` #${e.entityId}` : ''}`],
                ['Base', e.base?.code ?? '—'],
                ['IP address', e.ipAddress ?? '—'],
                ['Details', summarize(e)],
              ]}
            />
          )}
          skeletonRows={10}
          empty={{ title: 'No audit records match these filters', description: 'Try a wider date range.' }}
        />
        <Pagination meta={data?.meta} onPageChange={(page) => setFilters({ page })} onPageSizeChange={(pageSize) => setFilters({ pageSize })} />
      </Card>

      <AuditDetail id={filters.open} onClose={() => setFilters({ open: '', page: filters.page })} />
    </>
  );
}
