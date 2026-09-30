import { Select } from '../../components/ui/Field.jsx';
import { useBaseDirectory, useBases, useEquipmentCatalog, useEquipmentTypes } from './lookups.js';

/** Base picker for ADMIN (scoped users never choose a base). */
export function BaseSelect({ value, onChange, allLabel = 'All bases', includeAll = true, directory = false, exclude, ...props }) {
  const scoped = useBases();
  const all = useBaseDirectory();
  const { data = [], isLoading } = directory ? all : scoped;
  return (
    <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={isLoading || props.disabled} {...props}>
      {includeAll ? <option value="">{allLabel}</option> : <option value="">Select a base…</option>}
      {data
        .filter((b) => String(b.id) !== String(exclude ?? ''))
        .map((b) => (
          <option key={b.id} value={b.id}>
            {b.code} · {b.name}
          </option>
        ))}
    </Select>
  );
}

export function EquipmentTypeSelect({ value, onChange, ...props }) {
  const { data = [], isLoading } = useEquipmentTypes();
  return (
    <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={isLoading} {...props}>
      <option value="">All types</option>
      {data.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </Select>
  );
}

/**
 * Equipment grouped by type. `equipmentTypeId` narrows the list (filters);
 * `activeOnly` hides retired items (forms that create records).
 */
export function EquipmentSelect({ value, onChange, equipmentTypeId, activeOnly = false, placeholder = 'All equipment', ...props }) {
  const { data = [], isLoading } = useEquipmentCatalog();
  const items = data.filter(
    (e) => (!equipmentTypeId || String(e.equipmentType.id) === String(equipmentTypeId)) && (!activeOnly || e.isActive),
  );
  const groups = new Map();
  for (const item of items) {
    const list = groups.get(item.equipmentType.name) ?? [];
    list.push(item);
    groups.set(item.equipmentType.name, list);
  }
  return (
    <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={isLoading || props.disabled} {...props}>
      <option value="">{placeholder}</option>
      {[...groups.entries()].map(([typeName, list]) => (
        <optgroup key={typeName} label={typeName}>
          {list.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

/** Looks up a catalog item by id (for tracking type and unit of measure in forms). */
export function useEquipmentItem(equipmentId) {
  const { data = [] } = useEquipmentCatalog();
  return data.find((e) => String(e.id) === String(equipmentId)) ?? null;
}
