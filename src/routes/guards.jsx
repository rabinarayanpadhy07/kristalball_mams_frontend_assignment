import { Lock } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';

function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas" role="status" aria-label="Loading session">
      <div className="flex items-center gap-3 text-[13px] text-muted">
        <span className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-primary" aria-hidden />
        Loading…
      </div>
    </div>
  );
}

/** Waits for the session check, then sends anonymous users to /login (remembering where they were). */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Hides a page the user's role cannot use. The API enforces the same rule. */
export function RequirePermission({ permission, children }) {
  const { can } = useAuth();
  if (!can(permission)) return <Forbidden />;
  return children;
}

export function Forbidden() {
  return (
    <EmptyState
      icon={Lock}
      title="You do not have access to this page"
      description="Your role does not include this area. Contact an administrator if you need access."
      action={
        <Link to="/dashboard">
          <Button>Back to dashboard</Button>
        </Link>
      }
    />
  );
}

export function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist or has moved."
      action={
        <Link to="/dashboard">
          <Button>Back to dashboard</Button>
        </Link>
      }
    />
  );
}

/** Route-level crash screen (replaces the framework's developer error page). */
export function RouteError() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <div className="max-w-md rounded-lg border border-line bg-surface p-6 text-center shadow-card">
        <p className="text-[15px] font-semibold text-ink">Something went wrong on this page</p>
        <p className="mt-1 text-[13px] text-muted">The error has been logged in your browser console. Reload to try again.</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    </div>
  );
}

/** Sends users to the first page they are allowed to see. */
export function HomeRedirect() {
  const { can } = useAuth();
  const first = [
    ['dashboard:read', '/dashboard'],
    ['purchase:read', '/purchases'],
    ['transfer:read', '/transfers'],
  ].find(([p]) => can(p));
  return <Navigate to={first?.[1] ?? '/forbidden'} replace />;
}
