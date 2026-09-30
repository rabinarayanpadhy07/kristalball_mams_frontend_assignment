import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { AppShell } from '../components/layout/AppShell.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { Forbidden, HomeRedirect, NotFound, ProtectedRoute, RequirePermission, RouteError } from '../routes/guards.jsx';

// Each page is its own chunk; the charts library only loads with the dashboard.
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));
const DashboardPage = named(() => import('../features/dashboard/DashboardPage.jsx'), 'DashboardPage');
const PurchasesPage = named(() => import('../features/purchases/PurchasesPage.jsx'), 'PurchasesPage');
const TransfersPage = named(() => import('../features/transfers/TransfersPage.jsx'), 'TransfersPage');
const AssignmentsPage = named(() => import('../features/assignments/AssignmentsPage.jsx'), 'AssignmentsPage');
const ExpendituresPage = named(() => import('../features/expenditures/ExpendituresPage.jsx'), 'ExpendituresPage');
const AuditLogsPage = named(() => import('../features/audit-logs/AuditLogsPage.jsx'), 'AuditLogsPage');

const guarded = (permission, Page) => (
  <RequirePermission permission={permission}>
    <Page />
  </RequirePermission>
);

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'dashboard', element: guarded('dashboard:read', DashboardPage) },
          { path: 'purchases', element: guarded('purchase:read', PurchasesPage) },
          { path: 'transfers', element: guarded('transfer:read', TransfersPage) },
          { path: 'assignments', element: guarded('assignment:read', AssignmentsPage) },
          { path: 'expenditures', element: guarded('expenditure:read', ExpendituresPage) },
          { path: 'audit-logs', element: guarded('audit:read', AuditLogsPage) },
          { path: 'forbidden', element: <Forbidden /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);
