import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getData, getEnvelope } from '../../api/client.js';
import { useAuth } from '../auth/AuthProvider.jsx';

// Reference data changes rarely: cache it for 5 minutes.
const REFERENCE = { staleTime: 5 * 60_000 };

/** Bases in the caller's scope (ADMIN: all; others: their own). */
export const useBases = () => useQuery({ queryKey: ['bases', 'scoped'], queryFn: () => getData('/bases'), ...REFERENCE });

/** Every active base, minimal fields — for choosing a transfer destination. */
export const useBaseDirectory = () =>
  useQuery({ queryKey: ['bases', 'directory'], queryFn: () => getData('/bases/directory'), ...REFERENCE });

export const useEquipmentTypes = () =>
  useQuery({ queryKey: ['equipment-types'], queryFn: () => getData('/equipment-types'), ...REFERENCE });

export const useEquipmentCatalog = () =>
  useQuery({ queryKey: ['equipment', 'catalog'], queryFn: () => getData('/equipment', { pageSize: 100 }), ...REFERENCE });

export function useUsers() {
  const { can } = useAuth();
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => getData('/users', { pageSize: 100 }),
    enabled: can('user:manage'),
    ...REFERENCE,
  });
}

/** Available (on hand − assigned) stock of one item at one base; null while unknown. */
export function useAvailability(baseId, equipmentId) {
  return useQuery({
    queryKey: ['inventory', 'availability', baseId, equipmentId],
    queryFn: async () => {
      const rows = await getData('/inventory', { baseId, equipmentId });
      const row = rows[0];
      return row
        ? { onHand: row.quantityOnHand, assigned: row.quantityAssigned, available: row.quantityAvailable }
        : { onHand: 0, assigned: 0, available: 0 };
    },
    enabled: Boolean(baseId && equipmentId),
  });
}

/** Serialized units available at a base. */
export function useAvailableAssets(baseId, equipmentId, enabled = true) {
  return useQuery({
    queryKey: ['assets', 'available', baseId, equipmentId],
    queryFn: () => getEnvelope('/assets', { baseId, equipmentId, status: 'AVAILABLE', pageSize: 100 }),
    enabled: Boolean(enabled && baseId && equipmentId),
  });
}

/**
 * Anything that moves stock changes the dashboard, inventory and asset views too.
 * Invalidating by key prefix refetches whatever of those is on screen.
 */
export function useInvalidateStock() {
  const queryClient = useQueryClient();
  return useCallback(
    (...moduleKeys) =>
      Promise.all(
        [...moduleKeys, 'dashboard', 'inventory', 'assets'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      ),
    [queryClient],
  );
}
