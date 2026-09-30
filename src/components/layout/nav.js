import { ArrowLeftRight, Flame, LayoutDashboard, ScrollText, ShoppingCart, UserCheck } from 'lucide-react';

/** Sidebar entries; each is shown only if the user holds its permission. */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:read' },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart, permission: 'purchase:read' },
  { to: '/transfers', label: 'Transfers', icon: ArrowLeftRight, permission: 'transfer:read' },
  { to: '/assignments', label: 'Assignments', icon: UserCheck, permission: 'assignment:read' },
  { to: '/expenditures', label: 'Expenditures', icon: Flame, permission: 'expenditure:read' },
  { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText, permission: 'audit:read', section: 'Administration' },
];
