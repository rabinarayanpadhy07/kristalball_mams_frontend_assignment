import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { BrandMark } from '../ui/BrandMark.jsx';
import { NavLink } from 'react-router';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { cn } from '../../lib/cn.js';
import { useOverlay } from '../ui/useOverlay.js';
import { NAV_ITEMS } from './nav.js';

function NavItems({ collapsed, onNavigate }) {
  const { can } = useAuth();
  const items = NAV_ITEMS.filter((item) => can(item.permission));
  let lastSection;

  return (
    <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
      {items.map((item) => {
        const header = item.section && item.section !== lastSection ? item.section : null;
        lastSection = item.section ?? lastSection;
        return (
          <div key={item.to}>
            {header &&
              (collapsed ? (
                <div className="mx-2 my-3 border-t border-line" />
              ) : (
                <p className="px-3 pb-1 pt-4 text-2xs font-semibold uppercase tracking-wide text-faint">{header}</p>
              ))}
            <NavLink
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'relative flex h-9 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive ? 'bg-primary-light text-primary' : 'text-muted hover:bg-subtle hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-primary" aria-hidden />}
                  <item.icon className="size-[18px] shrink-0" aria-hidden />
                  <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
                </>
              )}
            </NavLink>
          </div>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed, bordered = true }) {
  return (
    <div className={cn('flex h-14 shrink-0 items-center gap-2.5 px-4', bordered && 'border-b border-line', collapsed && 'justify-center px-0')}>
      <BrandMark size="sm" />
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="text-[14px] font-semibold text-ink">MAMS</p>
          <p className="truncate text-2xs text-muted">Asset Management</p>
        </div>
      )}
    </div>
  );
}

function ScopeFooter({ collapsed }) {
  const { user } = useAuth();
  if (collapsed || !user) return null;
  return (
    <div className="border-t border-line px-4 py-3">
      <p className="text-2xs font-medium uppercase tracking-wide text-faint">Scope</p>
      <p className="mt-0.5 truncate text-[13px] text-ink">{user.base ? `${user.base.code} · ${user.base.name}` : 'All bases'}</p>
    </div>
  );
}

/**
 * Desktop (≥1024px): a persistent sidebar that collapses to a 64px icon rail.
 * Below 1024px: hidden; the same navigation opens as a drawer from the top bar.
 */
export function Sidebar({ collapsed, onToggleCollapsed }) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-150 lg:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <Brand collapsed={collapsed} />
      <NavItems collapsed={collapsed} />
      <ScopeFooter collapsed={collapsed} />
      <div className={cn('border-t border-line p-2', collapsed && 'flex justify-center')}>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            'flex h-9 items-center gap-3 rounded-md px-3 text-[13px] text-muted hover:bg-subtle hover:text-ink',
            collapsed ? 'w-9 justify-center px-0' : 'w-full',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav({ open, onClose }) {
  const panelRef = useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        tabIndex={-1}
        className="relative flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-overlay outline-none"
      >
        <div className="flex items-center justify-between border-b border-line pr-2">
          <div className="min-w-0 flex-1">
            <Brand bordered={false} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-subtle"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>
        <NavItems onNavigate={onClose} />
        <ScopeFooter />
      </aside>
    </div>
  );
}
