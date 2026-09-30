import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bell, LogOut, Menu } from 'lucide-react';
import { Link } from 'react-router';
import { getEnvelope } from '../../api/client.js';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { cn } from '../../lib/cn.js';
import { formatQuantity, formatRelative, initials, ROLE_LABELS } from '../../lib/format.js';
import { Popover } from '../ui/Popover.jsx';

/**
 * Notifications are real work items: pending transfers touching the user's base
 * (all bases for ADMIN). Outgoing ones are the ones this user can act on.
 */
function Notifications() {
  const { can, user } = useAuth();
  const enabled = can('transfer:read');
  const { data } = useQuery({
    queryKey: ['transfers', 'list', { status: 'PENDING', pageSize: 5, scope: 'notifications' }],
    queryFn: () => getEnvelope('/transfers', { status: 'PENDING', pageSize: 5 }),
    enabled,
    refetchInterval: 60_000,
  });
  if (!enabled) return null;
  const items = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <Popover
      label="Notifications"
      panelClassName="sm:w-96"
      trigger={({ toggle, ref, ...aria }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          {...aria}
          className="relative flex size-9 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink"
          aria-label={total ? `Notifications: ${total} pending transfers` : 'Notifications'}
        >
          <Bell className="size-[18px]" />
          {total > 0 && (
            <span className="num absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-semibold text-white">
              {total > 9 ? '9+' : total}
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">Pending transfers</p>
            <span className="num text-[12px] text-muted">{total}</span>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted">Nothing is waiting for action.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {items.map((t) => {
                const outgoing = !user?.baseId || t.sourceBase.id === user.baseId;
                return (
                  <li key={t.id}>
                    <Link
                      to={`/transfers?status=PENDING&open=${t.id}`}
                      onClick={close}
                      className="block px-4 py-3 hover:bg-canvas"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[13px] font-medium text-ink">{t.referenceNo}</span>
                        <span className="shrink-0 text-2xs text-faint">{formatRelative(t.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-muted">
                        {t.sourceBase.code} → {t.destinationBase.code} · {formatQuantity(t.quantity, t.equipment.unitOfMeasure)} {t.equipment.name}
                      </p>
                      <p className={cn('mt-1 text-2xs font-medium', outgoing ? 'text-warning-ink' : 'text-info')}>
                        {outgoing ? 'Awaiting completion' : 'Incoming to your base'}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            to="/transfers?status=PENDING"
            onClick={close}
            className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-2.5 text-[13px] font-medium text-primary hover:bg-canvas"
          >
            View all pending <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </Popover>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <Popover
      label="Account"
      panelClassName="sm:w-64"
      trigger={({ toggle, ref, ...aria }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          {...aria}
          className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-1 hover:bg-subtle sm:pr-2.5"
          aria-label={`Account menu for ${user.fullName}`}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-light">
            {initials(user.fullName)}
          </span>
          <span className="hidden min-w-0 text-left leading-tight sm:block">
            <span className="block max-w-40 truncate text-[13px] font-medium text-ink">{user.fullName}</span>
            <span className="block text-2xs text-muted">{ROLE_LABELS[user.role] ?? user.role}</span>
          </span>
        </button>
      )}
    >
      <div className="border-b border-line px-4 py-3">
        <p className="truncate text-[13px] font-medium text-ink">{user.fullName}</p>
        <p className="truncate text-[12px] text-muted">{user.email}</p>
        <p className="mt-2 text-[12px] text-muted">
          {ROLE_LABELS[user.role]} · {user.base ? user.base.name : 'All bases'}
        </p>
      </div>
      <div className="p-1.5">
        <button
          type="button"
          onClick={logout}
          className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-[13px] text-ink hover:bg-subtle"
        >
          <LogOut className="size-4 text-muted" aria-hidden /> Sign out
        </button>
      </div>
    </Popover>
  );
}

export function Topbar({ onOpenNav }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur-sm sm:px-5 lg:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>
      <span className="text-[14px] font-semibold text-ink lg:hidden">MAMS</span>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Notifications />
        <div className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
        <UserMenu />
      </div>
    </header>
  );
}
