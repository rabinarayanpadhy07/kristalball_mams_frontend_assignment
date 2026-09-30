import { Activity, BarChart3, Table2 } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { cn } from '../../lib/cn.js';
import { formatCompact, formatNumber } from '../../lib/format.js';
import { useTrends } from './api.js';

// Validated pair (CVD-safe, distinct from status colors): see styles/index.css.
const IN_COLOR = '#2f6fb0';
const OUT_COLOR = '#c8742c';
const GRID = '#e3e8e4';
const AXIS_TEXT = '#66736a';

const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function bucketLabel(start, granularity, long = false) {
  const d = new Date(`${start}T00:00:00Z`);
  if (granularity === 'month') return monthFmt.format(d);
  if (granularity === 'week') return long ? `Week of ${dayFmt.format(d)}` : dayFmt.format(d);
  return dayFmt.format(d);
}

function ChartTooltip({ active, payload, granularity }) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  const row = (label, value, color) => (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2 text-muted">
        {color && <span className="h-0.5 w-3 rounded-full" style={{ background: color }} aria-hidden />}
        {label}
      </span>
      <span className="num font-semibold text-ink">{value}</span>
    </div>
  );
  return (
    <div className="min-w-52 space-y-1 rounded-md border border-line bg-surface px-3 py-2.5 text-[12px] shadow-overlay">
      <p className="mb-1.5 font-medium text-ink">{bucketLabel(b.start, granularity, true)}</p>
      {row('Purchases', formatNumber(b.purchases), IN_COLOR)}
      {row('Transfer in', formatNumber(b.transferIn), IN_COLOR)}
      {row('Transfer out', formatNumber(b.transferOut), OUT_COLOR)}
      {row('Expended', formatNumber(b.expended), OUT_COLOR)}
      <div className="mt-1.5 border-t border-line pt-1.5">{row('Net', b.net > 0 ? `+${formatNumber(b.net)}` : formatNumber(b.net))}</div>
    </div>
  );
}

function Legend() {
  const item = (color, label) => (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-[2px]" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
      {item(IN_COLOR, 'Inbound · purchases + transfers in')}
      {item(OUT_COLOR, 'Outbound · transfers out + expended')}
    </div>
  );
}

/**
 * Diverging columns: inbound stock above the baseline, outbound below, one column
 * per day/week/month (the API picks the bucket size from the period length).
 */
export function MovementChart({ params, className }) {
  const [view, setView] = useState('chart');
  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useTrends(params);
  const buckets = data?.buckets ?? [];
  const hasMovement = buckets.some((b) => b.inbound || b.outbound);
  const chartData = buckets.map((b) => ({ ...b, outboundNeg: -b.outbound }));

  const toggle = (
    <div className="flex rounded-md border border-line p-0.5" role="group" aria-label="Chart view">
      {[
        ['chart', BarChart3, 'Chart'],
        ['table', Table2, 'Table'],
      ].map(([value, Icon, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setView(value)}
          aria-pressed={view === value}
          className={cn('flex h-7 items-center gap-1.5 rounded px-2 text-[12px]', view === value ? 'bg-subtle font-medium text-ink' : 'text-muted hover:text-ink')}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader
        icon={Activity}
        title="Inventory movement"
        description={data ? `Stock in and out per ${data.granularity}` : 'Stock in and out over the period'}
        actions={toggle}
      />
      <div className="p-4 sm:p-5">
        {error ? (
          <ErrorState error={error} onRetry={refetch} compact />
        ) : isLoading ? (
          <Skeleton className="h-[240px] w-full sm:h-[280px] lg:h-[370px]" />
        ) : !hasMovement ? (
          <EmptyState compact title="No stock movement in this period" description="Try a wider date range or fewer filters." />
        ) : view === 'table' ? (
          <div className="scroll-thin max-h-[300px] overflow-auto">
            <table className="w-full min-w-[480px] text-[12px]">
              <thead className="sticky top-0 bg-surface text-left text-muted">
                <tr>
                  {['Period', 'Purchases', 'Transfer in', 'Transfer out', 'Expended', 'Net'].map((h, i) => (
                    <th key={h} className={cn('border-b border-line py-2 pr-3 font-medium', i > 0 && 'text-right')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="num">
                {buckets
                  .filter((b) => b.inbound || b.outbound)
                  .map((b) => (
                    <tr key={b.start}>
                      <td className="border-b border-line py-1.5 pr-3">{bucketLabel(b.start, data.granularity, true)}</td>
                      {[b.purchases, b.transferIn, b.transferOut, b.expended, b.net].map((v, i) => (
                        <td key={i} className="border-b border-line py-1.5 pr-3 text-right">
                          {formatNumber(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={cn('transition-opacity', isFetching && isPlaceholderData && 'opacity-60')}>
            <div
              className="h-[240px] w-full sm:h-[280px] lg:h-[340px]"
              role="img"
              aria-label={`Inventory movement per ${data.granularity}: inbound ${formatNumber(buckets.reduce((s, b) => s + b.inbound, 0))}, outbound ${formatNumber(buckets.reduce((s, b) => s + b.outbound, 0))}. Switch to Table view for each period's values.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} stackOffset="sign" margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap={2}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis
                    dataKey="start"
                    tickFormatter={(v) => bucketLabel(v, data.granularity)}
                    tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: GRID }}
                    minTickGap={20}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => formatCompact(Math.abs(v))}
                    tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <ReferenceLine y={0} stroke="#cfd7d1" />
                  <Tooltip content={<ChartTooltip granularity={data.granularity} />} cursor={{ fill: 'rgba(38,59,45,0.05)' }} />
                  <Bar dataKey="inbound" name="Inbound" stackId="m" fill={IN_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  <Bar dataKey="outboundNeg" name="Outbound" stackId="m" fill={OUT_COLOR} radius={[0, 0, 4, 4]} maxBarSize={28} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3">
              <Legend />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
