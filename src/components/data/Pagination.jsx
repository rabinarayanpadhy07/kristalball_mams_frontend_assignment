import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { formatNumber } from '../../lib/format.js';

/** Page numbers with gaps: 1 … 4 5 6 … 20 */
function pageList(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Driven by the API's pagination metadata ({ page, pageSize, total, totalPages }).
 * Phones: range text + prev/next. ≥768px: numbered pages and a page-size picker.
 */
export function Pagination({ meta, onPageChange, onPageSizeChange, className }) {
  if (!meta || meta.total === 0) return null;
  const { page, pageSize, total, totalPages } = meta;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const navButton = 'flex size-8 items-center justify-center rounded-md border border-line-strong bg-surface text-muted hover:bg-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-muted sm:px-5', className)}
    >
      <p className="num">
        <span className="font-medium text-ink">
          {formatNumber(start)}–{formatNumber(end)}
        </span>{' '}
        of {formatNumber(total)}
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="hidden items-center gap-2 md:flex">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-line-strong bg-surface px-2 text-[13px] text-ink focus:border-accent focus:outline-none"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1">
          <button type="button" className={navButton} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </button>
          <div className="hidden items-center gap-1 md:flex">
            {pageList(page, totalPages).map((p) =>
              typeof p === 'string' ? (
                <span key={p} className="px-1 text-faint">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={cn(
                    'num h-8 min-w-8 rounded-md px-2 text-[13px]',
                    p === page ? 'bg-primary font-medium text-white' : 'text-ink hover:bg-subtle',
                  )}
                >
                  {p}
                </button>
              ),
            )}
          </div>
          <span className="num px-2 md:hidden">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className={navButton}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
