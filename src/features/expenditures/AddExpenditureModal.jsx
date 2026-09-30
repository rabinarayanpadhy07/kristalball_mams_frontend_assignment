import { useMutation, useQuery } from '@tanstack/react-query';
import { Flame, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getData, newIdempotencyKey, postData } from '../../api/client.js';
import { normalizeError } from '../../api/errors.js';
import { Button } from '../../components/ui/Button.jsx';
import { Callout } from '../../components/ui/Card.jsx';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { cn } from '../../lib/cn.js';
import { businessDateIso, isValidDay, today } from '../../lib/dates.js';
import { formatNumber, formatQuantity, unitLabel } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useAvailability, useAvailableAssets, useInvalidateStock } from '../shared/lookups.js';
import { BaseSelect, EquipmentSelect, useEquipmentItem } from '../shared/selects.jsx';

export const REASONS = [
  ['TRAINING', 'Training'],
  ['OPERATION', 'Operation'],
  ['MAINTENANCE', 'Maintenance'],
  ['DAMAGED', 'Damaged'],
  ['LOST', 'Lost'],
  ['OTHER', 'Other'],
];

const initial = (isAdmin, user) => ({
  source: 'stock',
  baseId: isAdmin ? '' : String(user.baseId),
  equipmentId: '',
  assignmentId: '',
  quantity: '',
  assetId: '',
  reason: '',
  expendedOn: today(),
  notes: '',
});

/**
 * Records consumption. Two sources: general stock (reduces available stock), or
 * stock held by an assignee (reduces that assignment and on-hand together).
 */
export function AddExpenditureModal({ open, onClose }) {
  const { isAdmin, user } = useAuth();
  const toast = useToast();
  const invalidate = useInvalidateStock();
  const [form, setForm] = useState(() => initial(isAdmin, user));
  const [errors, setErrors] = useState({});
  const [key, setKey] = useState(newIdempotencyKey);

  useEffect(() => {
    if (open) {
      setForm(initial(isAdmin, user));
      setErrors({});
      setKey(newIdempotencyKey());
    }
  }, [open, isAdmin, user]);

  const fromAssignment = form.source === 'assignment';
  const activeAssignments = useQuery({
    queryKey: ['assignments', 'list', { status: 'ACTIVE', baseId: form.baseId, pageSize: 100, scope: 'expenditure' }],
    queryFn: () => getData('/assignments', { status: 'ACTIVE', baseId: isAdmin ? form.baseId : undefined, pageSize: 100 }),
    enabled: open && fromAssignment && Boolean(form.baseId),
  });
  const assignment = activeAssignments.data?.find((a) => String(a.id) === form.assignmentId);

  const equipment = useEquipmentItem(fromAssignment ? assignment?.equipment.id : form.equipmentId);
  const serialized = equipment?.trackingType === 'SERIALIZED';
  const availability = useAvailability(form.baseId, fromAssignment ? undefined : form.equipmentId);
  const assets = useAvailableAssets(form.baseId, form.equipmentId, serialized && !fromAssignment);
  const limit = fromAssignment ? assignment?.quantityOutstanding : availability.data?.available;

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e, form: undefined };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.baseId) e.baseId = 'Select a base';
    if (fromAssignment) {
      if (!form.assignmentId) e.assignmentId = 'Select the assignment';
    } else {
      if (!form.equipmentId) e.equipmentId = 'Select equipment';
      if (serialized && !form.assetId) e.assetId = 'Select the unit consumed';
    }
    if (!serialized) {
      if (!/^\d+$/.test(form.quantity) || Number(form.quantity) <= 0) e.quantity = 'Enter a whole number greater than zero';
      else if (limit != null && Number(form.quantity) > limit) e.quantity = `Only ${formatNumber(limit)} available`;
    }
    if (!form.reason) e.reason = 'Select a reason';
    if (!isValidDay(form.expendedOn) || form.expendedOn > today()) e.expendedAt = 'Enter a valid date, not in the future';
    return e;
  };

  const mutation = useMutation({
    mutationFn: (body) => postData('/expenditures', body, { idempotencyKey: key }),
    onSuccess: async (x) => {
      await invalidate('expenditures', 'assignments');
      toast.success('Expenditure recorded', `${formatQuantity(x.quantity, x.equipment.unitOfMeasure)} ${x.equipment.name} removed from ${x.base.code} inventory`);
      onClose();
    },
    onError: (err) => {
      const e = normalizeError(err);
      setErrors(Object.keys(e.fieldErrors).length ? e.fieldErrors : { form: e.message });
    },
  });

  const onSubmit = (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    mutation.mutate({
      ...(fromAssignment
        ? { assignmentId: Number(form.assignmentId) }
        : { ...(isAdmin ? { baseId: Number(form.baseId) } : {}), equipmentId: Number(form.equipmentId) }),
      ...(serialized ? (fromAssignment ? {} : { assetId: Number(form.assetId) }) : { quantity: Number(form.quantity) }),
      reason: form.reason,
      expendedAt: businessDateIso(form.expendedOn),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    });
  };

  const sourceOption = (value, title, body) => (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-[13px]',
        form.source === value ? 'border-primary bg-primary-light/50' : 'border-line-strong hover:bg-subtle',
      )}
    >
      <input
        type="radio"
        name="source"
        value={value}
        checked={form.source === value}
        onChange={() => set({ source: value, equipmentId: '', assignmentId: '', assetId: '', quantity: '' })}
        className="mt-0.5 size-4 accent-primary"
      />
      <span>
        <span className="block font-medium text-ink">{title}</span>
        <span className="block text-[12px] text-muted">{body}</span>
      </span>
    </label>
  );

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? undefined : onClose}
      dismissible={!mutation.isPending}
      title="Record expenditure"
      description="Consumed, destroyed or lost stock is permanently removed from inventory."
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="expenditure-form" variant="danger" icon={Flame} loading={mutation.isPending}>
            Record expenditure
          </Button>
        </>
      }
    >
      <form id="expenditure-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form && <Callout tone="danger">{errors.form}</Callout>}

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink">Taken from</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sourceOption('stock', 'General stock', 'Unassigned stock held at the base')}
            {sourceOption('assignment', 'An assignment', 'Stock a person holds (e.g. rounds fired)')}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Base" required={isAdmin} error={errors.baseId}>
            {(p) =>
              isAdmin ? (
                <BaseSelect {...p} includeAll={false} value={form.baseId} onChange={(baseId) => set({ baseId, assignmentId: '', assetId: '' })} />
              ) : (
                <div className="flex h-9 items-center gap-2 rounded-md border border-line bg-subtle px-3 text-[13px]">
                  <MapPin className="size-3.5 text-muted" aria-hidden />
                  <span className="truncate">
                    {user.base.code} · {user.base.name}
                  </span>
                </div>
              )
            }
          </Field>

          {fromAssignment ? (
            <Field label="Assignment" required error={errors.assignmentId}>
              {(p) => (
                <Select {...p} value={form.assignmentId} onChange={(e) => set({ assignmentId: e.target.value, quantity: '' })} disabled={!form.baseId || activeAssignments.isLoading}>
                  <option value="">{activeAssignments.data?.length === 0 ? 'No active assignments' : 'Select an assignment…'}</option>
                  {activeAssignments.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.assigneeName} · {a.equipment.name} ({formatNumber(a.quantityOutstanding)} held)
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <Field label="Equipment" required error={errors.equipmentId}>
              {(p) => (
                <EquipmentSelect
                  {...p}
                  activeOnly
                  placeholder="Select equipment…"
                  value={form.equipmentId}
                  onChange={(equipmentId) => set({ equipmentId, quantity: '', assetId: '' })}
                />
              )}
            </Field>
          )}

          {serialized && !fromAssignment ? (
            <Field label="Unit (serial number)" required error={errors.assetId}>
              {(p) => (
                <Select {...p} value={form.assetId} onChange={(e) => set({ assetId: e.target.value })} disabled={assets.isLoading}>
                  <option value="">Select a unit…</option>
                  {assets.data?.data.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.serialNumber}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : serialized ? (
            <Field label="Unit">
              <div className="flex h-9 items-center rounded-md border border-line bg-subtle px-3 font-mono text-[12px]">{assignment?.asset?.serialNumber}</div>
            </Field>
          ) : (
            <Field
              label="Quantity"
              required
              error={errors.quantity}
              hint={equipment && limit != null ? `${formatNumber(limit)} ${unitLabel(equipment.unitOfMeasure, limit)} ${fromAssignment ? 'held' : 'available'}` : undefined}
            >
              {(p) => <Input {...p} type="number" inputMode="numeric" min={1} step={1} value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} />}
            </Field>
          )}

          <Field label="Reason" required error={errors.reason}>
            {(p) => (
              <Select {...p} value={form.reason} onChange={(e) => set({ reason: e.target.value })}>
                <option value="">Select a reason…</option>
                {REASONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Date" required error={errors.expendedAt}>
            {(p) => <Input {...p} type="date" max={today()} value={form.expendedOn} onChange={(e) => set({ expendedOn: e.target.value })} />}
          </Field>
        </div>

        <Field label="Notes" hint="Optional: exercise, incident or report reference">
          {(p) => <Textarea {...p} rows={2} maxLength={2000} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
        </Field>
      </form>
    </Modal>
  );
}
