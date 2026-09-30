import { ArrowLeftRight, Flame, Info, Landmark, LayoutDashboard, MapPin, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { FilterBar, FilterField } from '../../components/data/FilterBar.jsx';
import { MetricCard } from '../../components/data/MetricCard.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/States.jsx';
import { cn } from '../../lib/cn.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { apiRange, DateRangeFilter } from '../shared/DateRangeFilter.jsx';
import { BaseSelect, EquipmentSelect, EquipmentTypeSelect } from '../shared/selects.jsx';
import { useUrlState } from '../shared/useUrlState.js';
import { useSummary } from './api.js';
import { DistributionPanel } from './DistributionPanel.jsx';
import { MovementChart } from './MovementChart.jsx';
import { NetMovementModal } from './NetMovementModal.jsx';
import { RecentActivity, RecentPurchases, RecentTransfers } from './RecentPanels.jsx';

const DEFAULTS = { preset: '30d', from: '', to: '', baseId: '', equipmentTypeId: '', equipmentId: '' };

/**
 * The period result: Closing = Opening + Net movement − Expended (+ Adjustments).
 * Full width under the four metrics, showing the equation that produced it.
 */
function ClosingBalanceCard({ summary, loading, dimmed }) {
  const term = (label, value, sign) => (
    <div className="flex items-baseline gap-1.5">
      {sign && <span className="num text-faint">{sign}</span>}
      <span className="num font-medium text-ink">{formatNumber(value)}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
  return (
    <div className="relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-lg border border-line bg-surface p-4 shadow-card before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary sm:col-span-2 md:flex-row md:items-center md:justify-between lg:col-span-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-light">
          <Landmark className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">Closing balance</p>
          {loading ? (
            <Skeleton className="mt-1 h-8 w-32" />
          ) : (
            <p className={cn('num text-[28px] font-semibold leading-9 tracking-tight text-ink transition-opacity', dimmed && 'opacity-60')}>
              {formatNumber(summary?.closingBalance)}
            </p>
          )}
        </div>
      </div>
      {!loading && summary && (
        <div className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] md:justify-end', dimmed && 'opacity-60')}>
          {term('opening', summary.openingBalance)}
          {term('net movement', summary.netMovement, summary.netMovement < 0 ? '−' : '+')}
          {term('expended', summary.expended, '−')}
          {summary.adjustments !== 0 && term('adjustments', summary.adjustments, summary.adjustments < 0 ? '−' : '+')}
          <span className="text-faint">=</span>
          <span className="num font-semibold text-ink">{formatNumber(summary.closingBalance)}</span>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { isAdmin, user, can } = useAuth();
  const [filters, setFilters, { reset, activeCount }] = useUrlState(DEFAULTS);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const range = apiRange(filters);
  const params = {
    ...range,
    baseId: isAdmin ? filters.baseId || undefined : undefined,
    equipmentTypeId: filters.equipmentTypeId || undefined,
    equipmentId: filters.equipmentId || undefined,
  };
  // Lists use the same slice so every number on the page agrees.
  const listParams = { ...params };

  const { data: summary, isLoading, isFetching, isPlaceholderData, error, refetch } = useSummary(params);
  const dimmed = isFetching && isPlaceholderData;
  const abs = (n) => (n == null ? n : Math.abs(n));

  return (
    <>
      <PageHeader icon={LayoutDashboard} title="Asset Overview" subtitle="Monitor inventory, movement and operational status." />

      <FilterBar
        activeCount={activeCount}
        onReset={reset}
        className="mb-5"
        summary={summary ? `${formatDate(summary.period.from)} – ${formatDate(summary.period.to)}` : undefined}
      >
        <FilterField label="Date range" htmlFor="f-range" grow>
          <DateRangeFilter id="f-range" preset={filters.preset} from={filters.from} to={filters.to} onChange={setFilters} />
        </FilterField>
        {isAdmin ? (
          <FilterField label="Base" htmlFor="f-base">
            <BaseSelect id="f-base" value={filters.baseId} onChange={(baseId) => setFilters({ baseId })} />
          </FilterField>
        ) : (
          <FilterField label="Base">
            <div className="flex h-9 items-center gap-2 rounded-md border border-line bg-subtle px-3 text-[13px] text-ink">
              <MapPin className="size-3.5 text-muted" aria-hidden />
              <span className="truncate">{user?.base?.name}</span>
            </div>
          </FilterField>
        )}
        <FilterField label="Equipment type" htmlFor="f-type">
          <EquipmentTypeSelect
            id="f-type"
            value={filters.equipmentTypeId}
            onChange={(equipmentTypeId) => setFilters({ equipmentTypeId, equipmentId: '' })}
          />
        </FilterField>
        <FilterField label="Equipment" htmlFor="f-eq">
          <EquipmentSelect
            id="f-eq"
            value={filters.equipmentId}
            equipmentTypeId={filters.equipmentTypeId}
            onChange={(equipmentId) => setFilters({ equipmentId })}
          />
        </FilterField>
      </FilterBar>

      {error ? (
        <div className="rounded-lg border border-line bg-surface">
          <ErrorState error={error} onRetry={refetch} title="Could not load the dashboard" />
        </div>
      ) : (
        <>
          {/* 1 column on phones · 2 on tablets · 4 on desktop; the closing balance spans the row below. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            <MetricCard label="Opening balance" icon={Landmark} tone="neutral" value={summary?.openingBalance} loading={isLoading} dimmed={dimmed} hint="Stock at period start" />
            <MetricCard
              label="Net movement"
              icon={ArrowLeftRight}
              tone="primary"
              value={summary?.netMovement}
              signed
              loading={isLoading}
              dimmed={dimmed}
              hint="Purchases + in − out"
              onClick={() => setBreakdownOpen(true)}
            />
            <MetricCard label="Assigned" icon={UserCheck} tone="info" value={summary?.assigned} loading={isLoading} dimmed={dimmed} hint="Issued to personnel · still on hand" />
            <MetricCard label="Expended" icon={Flame} tone="danger" value={abs(summary?.expended)} loading={isLoading} dimmed={dimmed} hint="Consumed · removed from stock" />
            <ClosingBalanceCard summary={summary} loading={isLoading} dimmed={dimmed} />
          </div>

          {!filters.equipmentId && (
            <p className="mt-2.5 flex items-start gap-1.5 text-[12px] text-muted">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              Totals combine different units (rounds, litres, units). Select one equipment item for unit-accurate figures.
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <MovementChart params={params} className="lg:col-span-2" />
            <DistributionPanel params={params} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <RecentTransfers params={listParams} enabled={can('transfer:read')} />
            <RecentPurchases params={listParams} enabled={can('purchase:read')} />
            <RecentActivity params={params} className="xl:col-span-2" />
          </div>
        </>
      )}

      <NetMovementModal open={breakdownOpen} onClose={() => setBreakdownOpen(false)} params={params} allBases={isAdmin && !filters.baseId} />
    </>
  );
}
