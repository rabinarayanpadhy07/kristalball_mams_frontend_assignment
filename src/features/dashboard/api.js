import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getData, getEnvelope } from '../../api/client.js';

/**
 * All dashboard figures come from the API for the current filters; nothing is
 * derived from client-side state. `placeholderData` keeps the previous render
 * on screen (dimmed) while new filters load, so the layout never jumps.
 */
const dashboardQuery = (name, params, options = {}) => ({
  queryKey: ['dashboard', name, params],
  queryFn: () => getData(`/dashboard/${name}`, params),
  placeholderData: keepPreviousData,
  ...options,
});

export const useSummary = (params) => useQuery(dashboardQuery('summary', params));
export const useTrends = (params) => useQuery(dashboardQuery('trends', params));
export const useDistribution = (params) => useQuery(dashboardQuery('distribution', params));
export const useActivity = (params) => useQuery(dashboardQuery('activity', params));
export const useMovementBreakdown = (params, enabled) => useQuery(dashboardQuery('movement-breakdown', params, { enabled }));

export const useRecentTransfers = (params, enabled) =>
  useQuery({
    queryKey: ['transfers', 'list', { ...params, pageSize: 5, scope: 'dashboard' }],
    queryFn: () => getEnvelope('/transfers', { ...params, pageSize: 5 }),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useRecentPurchases = (params, enabled) =>
  useQuery({
    queryKey: ['purchases', 'list', { ...params, pageSize: 5, scope: 'dashboard' }],
    queryFn: () => getEnvelope('/purchases', { ...params, pageSize: 5 }),
    placeholderData: keepPreviousData,
    enabled,
  });
