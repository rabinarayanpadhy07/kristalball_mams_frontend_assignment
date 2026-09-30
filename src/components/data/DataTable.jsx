import { cn } from '../../lib/cn.js';
import { Skeleton } from '../ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../ui/States.jsx';

/**
 * Dense, readable table.
 *
 * Responsive contract: the table keeps a sensible `minWidth` and scrolls
 * horizontally *inside* its own container, so it never widens the page. The first
 * column stays pinned while scrolling on small screens (`stickyFirst`).
 *
 * columns: [{ key, header, cell(row), align: 'left'|'right'|'center', className, headerClassName }]
 */
export function DataTable({
  columns,
  rows,
  getRowKey = (row) => row.id,
  loading = false,
  fetching = false,
  error,
  onRetry,
  empty = {},
  onRowClick,
  rowLabel,
  minWidth = 860,
  skeletonRows = 8,
  stickyFirst = true,
  className,
  renderCard,
}) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  // Phones: a card per record instead of a sideways-scrolling table, so status and
  // actions are never hidden off-screen. Tablets and up get the full table.
  if (renderCard) {
    return (
      <>
        <div className={cn('md:hidden', fetching && !loading && 'opacity-60 transition-opacity')}>
          {loading ? (
            <ul className="divide-y divide-line">
              {Array.from({ length: 5 }, (_, i) => (
                <li key={i} className="space-y-2 px-4 py-3.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3.5 w-1/3" />
                </li>
              ))}
            </ul>
          ) : rows?.length === 0 ? (
            <EmptyState title={empty.title ?? 'No records found'} description={empty.description} action={empty.action} />
          ) : (
            <ul className="divide-y divide-line">
              {rows?.map((row) => (
                <li key={getRowKey(row)}>
                  {onRowClick ? (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={rowLabel?.(row)}
                      onClick={() => onRowClick(row)}
                      onKeyDown={(e) => {
                        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }}
                      className="block cursor-pointer px-4 py-3.5 active:bg-canvas"
                    >
                      {renderCard(row)}
                    </div>
                  ) : (
                    <div className="px-4 py-3.5">{renderCard(row)}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="hidden md:block">
          <DataTable {...{ columns, rows, getRowKey, loading, fetching, error, onRetry, empty, onRowClick, rowLabel, minWidth, skeletonRows, stickyFirst, className }} />
        </div>
      </>
    );
  }

  const alignClass = (align) => (align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left');
  const sticky = (i) => stickyFirst && i === 0 && 'sticky left-0 z-[1]';

  return (
    <div className={cn('scroll-thin relative w-full overflow-x-auto', fetching && !loading && 'opacity-60 transition-opacity', className)}>
      <table className="num w-full border-separate border-spacing-0 text-[13px]" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap border-b border-line bg-subtle px-2.5 py-2 text-2xs font-semibold uppercase tracking-wide text-muted first:pl-4 last:pr-4',
                  alignClass(col.align),
                  sticky(i),
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: skeletonRows }, (_, r) => (
              <tr key={`s${r}`}>
                {columns.map((col, i) => (
                  <td key={col.key} className={cn('border-b border-line bg-surface px-2.5 py-3 first:pl-4 last:pr-4', sticky(i))}>
                    <Skeleton className={cn('h-3.5', col.align === 'right' ? 'ml-auto w-12' : i === 0 ? 'w-24' : 'w-20')} />
                  </td>
                ))}
              </tr>
            ))}

          {!loading &&
            rows?.map((row) => {
              const clickable = Boolean(onRowClick);
              return (
                <tr
                  key={getRowKey(row)}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable && rowLabel ? rowLabel(row) : undefined}
                  className={cn('group', clickable && 'cursor-pointer focus-visible:outline-offset-[-2px]')}
                >
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={cn(
                        'border-b border-line bg-surface px-2.5 py-2.5 align-middle text-ink first:pl-4 last:pr-4',
                        clickable && 'group-hover:bg-canvas',
                        alignClass(col.align),
                        sticky(i),
                        col.className,
                      )}
                    >
                      {col.cell ? col.cell(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
      {!loading && rows?.length === 0 && (
        // Outside the scrolling table so the message stays centered in the viewport.
        <div className="sticky left-0 w-full max-w-[100vw]">
          <EmptyState title={empty.title ?? 'No records found'} description={empty.description} action={empty.action} />
        </div>
      )}
    </div>
  );
}

/**
 * Standard phone card: title + badge on top, a muted detail line, then a
 * label/value row, with optional actions (clicks there don't open the record).
 */
export function RecordCard({ title, badge, subtitle, meta = [], actions }) {
  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-semibold text-ink">{title}</p>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {subtitle && <p className="mt-0.5 truncate text-[13px] text-ink">{subtitle}</p>}
      {meta.length > 0 && (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
          {meta.filter(Boolean).map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-faint">{label}</dt>
              <dd className="truncate text-muted">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && (
        <div className="mt-3 flex gap-2 [&>*]:flex-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}

/** Primary text with a muted second line — the standard dense cell. */
export function CellStack({ primary, secondary, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="truncate text-ink">{primary}</div>
      {secondary && <div className="truncate text-[12px] text-muted">{secondary}</div>}
    </div>
  );
}
