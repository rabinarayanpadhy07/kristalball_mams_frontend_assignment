import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { LoadingState } from '../ui/States.jsx';
import { MobileNav, Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

const COLLAPSE_KEY = 'mams.sidebarCollapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Page frame. `min-w-0` on the content column is what keeps wide tables scrolling
 * inside their cards instead of stretching the page on small screens.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setNavOpen(false), [location.pathname]);

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      } catch {
        /* storage unavailable: keep the in-memory state */
      }
      return !v;
    });

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-[70] rounded-md bg-primary px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main id="main" className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-6 2xl:px-8">
          <Suspense fallback={<LoadingState lines={6} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
