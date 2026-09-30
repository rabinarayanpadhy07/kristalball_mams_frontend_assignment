import { useMutation } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { newIdempotencyKey, postData } from '../../api/client.js';
import { normalizeError } from '../../api/errors.js';
import { Button } from '../../components/ui/Button.jsx';
import { Callout } from '../../components/ui/Card.jsx';
import { DetailList } from '../../components/ui/Drawer.jsx';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { isValidDay, today } from '../../lib/dates.js';
import { businessDateIso } from '../../lib/dates.js';
import { formatNumber, formatQuantity, unitLabel } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useAvailability, useAvailableAssets, useInvalidateStock } from '../shared/lookups.js';
import { BaseSelect, EquipmentSelect, useEquipmentItem } from '../shared/selects.jsx';

const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .,'-]*$/u;
const SERVICE_NO = /^[A-Za-z0-9][A-Za-z0-9-]{2,49}$/;

function useFormState(initial, open) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [key, setKey] = useState(newIdempotencyKey);
  useEffect(() => {
    if (open) {
      setForm(initial());
      setErrors({});
      setKey(newIdempotencyKey());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e, form: undefined };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };
  return { form, set, errors, setErrors, key };
}

function OwnBase() {
  const { user } = useAuth();
  return (
    <div className="flex h-9 items-center gap-2 rounded-md border border-line bg-subtle px-3 text-[13px]">
      <MapPin className="size-3.5 text-muted" aria-hidden />
      <span className="truncate">
        {user.base.code} · {user.base.name}
      </span>
    </div>
  );
}

/** Issue equipment to a person. On-hand stock is unchanged; availability drops. */
export function AssignModal({ open, onClose }) {
  const { isAdmin, user } = useAuth();
  const toast = useToast();
  const invalidate = useInvalidateStock();
  const { form, set, errors, setErrors, key } = useFormState(
    () => ({
      baseId: isAdmin ? '' : String(user.baseId),
      equipmentId: '',
      quantity: '',
      assetId: '',
      assigneeName: '',
      assigneeServiceNo: '',
      assigneeUnit: '',
      purpose: '',
      assignedOn: today(),
      expectedReturnOn: '',
    }),
    open,
  );
  const equipment = useEquipmentItem(form.equipmentId);
  const serialized = equipment?.trackingType === 'SERIALIZED';
  const availability = useAvailability(form.baseId, form.equipmentId);
  const assets = useAvailableAssets(form.baseId, form.equipmentId, serialized);
  const available = availability.data?.available;

  const validate = () => {
    const e = {};
    if (!form.baseId) e.baseId = 'Select a base';
    if (!form.equipmentId) e.equipmentId = 'Select equipment';
    if (serialized && !form.assetId) e.assetId = 'Select the unit being issued';
    if (!serialized) {
      if (!/^\d+$/.test(form.quantity) || Number(form.quantity) <= 0) e.quantity = 'Enter a whole number greater than zero';
      else if (available != null && Number(form.quantity) > available) e.quantity = `Only ${formatNumber(available)} available`;
    }
    const name = form.assigneeName.trim();
    if (name.length < 2) e.assigneeName = 'Enter the full name';
    else if (!NAME.test(name)) e.assigneeName = "Letters, spaces and . , ' - only";
    if (!SERVICE_NO.test(form.assigneeServiceNo.trim())) e.assigneeServiceNo = '3–50 letters, digits or hyphens';
    if (!isValidDay(form.assignedOn) || form.assignedOn > today()) e.assignedAt = 'Enter a valid date, not in the future';
    if (form.expectedReturnOn && form.expectedReturnOn < form.assignedOn) e.expectedReturnAt = 'Cannot be before the assignment date';
    return e;
  };

  const mutation = useMutation({
    mutationFn: (body) => postData('/assignments', body, { idempotencyKey: key }),
    onSuccess: async (a) => {
      await invalidate('assignments');
      toast.success('Equipment assigned', `${formatQuantity(a.quantity, a.equipment.unitOfMeasure)} ${a.equipment.name} issued to ${a.assigneeName}`);
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
      ...(isAdmin ? { baseId: Number(form.baseId) } : {}),
      equipmentId: Number(form.equipmentId),
      ...(serialized ? { assetId: Number(form.assetId) } : { quantity: Number(form.quantity) }),
      assigneeName: form.assigneeName.trim(),
      assigneeServiceNo: form.assigneeServiceNo.trim(),
      ...(form.assigneeUnit.trim() ? { assigneeUnit: form.assigneeUnit.trim() } : {}),
      ...(form.purpose.trim() ? { purpose: form.purpose.trim() } : {}),
      assignedAt: businessDateIso(form.assignedOn),
      ...(form.expectedReturnOn ? { expectedReturnAt: new Date(`${form.expectedReturnOn}T12:00:00`).toISOString() } : {}),
    });
  };

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? undefined : onClose}
      dismissible={!mutation.isPending}
      title="Assign equipment"
      description="Issue equipment into a person's custody. It stays on hand at the base until returned."
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="assign-form" variant="primary" loading={mutation.isPending}>
            Assign
          </Button>
        </>
      }
    >
      <form id="assign-form" onSubmit={onSubmit} noValidate className="space-y-5">
        {errors.form && <Callout tone="danger">{errors.form}</Callout>}

        <section>
          <h3 className="mb-3 text-2xs font-semibold uppercase tracking-wide text-muted">Personnel</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.assigneeName}>
              {(p) => <Input {...p} autoComplete="off" value={form.assigneeName} onChange={(e) => set({ assigneeName: e.target.value })} data-autofocus />}
            </Field>
            <Field label="Service number" required error={errors.assigneeServiceNo}>
              {(p) => (
                <Input
                  {...p}
                  autoComplete="off"
                  className="uppercase"
                  value={form.assigneeServiceNo}
                  onChange={(e) => set({ assigneeServiceNo: e.target.value })}
                />
              )}
            </Field>
            <Field label="Unit" hint="Optional">
              {(p) => <Input {...p} maxLength={150} value={form.assigneeUnit} onChange={(e) => set({ assigneeUnit: e.target.value })} />}
            </Field>
            <Field label="Purpose" hint="Optional">
              {(p) => <Input {...p} maxLength={255} value={form.purpose} onChange={(e) => set({ purpose: e.target.value })} />}
            </Field>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-2xs font-semibold uppercase tracking-wide text-muted">Equipment</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Base" required={isAdmin} error={errors.baseId}>
              {(p) =>
                isAdmin ? (
                  <BaseSelect {...p} includeAll={false} value={form.baseId} onChange={(baseId) => set({ baseId, assetId: '' })} />
                ) : (
                  <OwnBase />
                )
              }
            </Field>
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
            {serialized ? (
              <Field label="Unit (serial number)" required error={errors.assetId} hint={assets.data ? `${assets.data.meta.total} available` : undefined}>
                {(p) => (
                  <Select {...p} value={form.assetId} onChange={(e) => set({ assetId: e.target.value })} disabled={!form.baseId || assets.isLoading}>
                    <option value="">Select a unit…</option>
                    {assets.data?.data.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.serialNumber}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : (
              <Field
                label="Quantity"
                required
                error={errors.quantity}
                hint={equipment && available != null ? `${formatNumber(available)} ${unitLabel(equipment.unitOfMeasure, available)} available` : undefined}
              >
                {(p) => (
                  <Input {...p} type="number" inputMode="numeric" min={1} step={1} value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} />
                )}
              </Field>
            )}
            <Field label="Assigned on" required error={errors.assignedAt}>
              {(p) => <Input {...p} type="date" max={today()} value={form.assignedOn} onChange={(e) => set({ assignedOn: e.target.value })} />}
            </Field>
            <Field label="Expected return" hint="Optional" error={errors.expectedReturnAt}>
              {(p) => (
                <Input {...p} type="date" min={form.assignedOn} value={form.expectedReturnOn} onChange={(e) => set({ expectedReturnOn: e.target.value })} />
              )}
            </Field>
          </div>
        </section>
      </form>
    </Modal>
  );
}

/** Records a (partial) return. Serialized units always come back whole. */
export function ReturnModal({ assignment, onClose }) {
  const toast = useToast();
  const invalidate = useInvalidateStock();
  const open = Boolean(assignment);
  const outstanding = assignment?.quantityOutstanding ?? 0;
  const serialized = Boolean(assignment?.asset);
  const { form, set, errors, setErrors, key } = useFormState(
    () => ({ quantity: String(outstanding), condition: 'SERVICEABLE', notes: '' }),
    open,
  );

  const mutation = useMutation({
    mutationFn: (body) => postData(`/assignments/${assignment.id}/return`, body, { idempotencyKey: key }),
    onSuccess: async ({ assignment: a, assignmentReturn: r }) => {
      await invalidate('assignments');
      toast.success(
        a.status === 'ACTIVE' ? 'Partial return recorded' : 'Assignment returned',
        `${formatQuantity(r.quantity, a.equipment.unitOfMeasure)} back from ${a.assigneeName}${a.status === 'ACTIVE' ? `; ${formatNumber(a.quantityOutstanding)} still held` : ''}`,
      );
      onClose();
    },
    onError: (err) => {
      const e = normalizeError(err);
      setErrors(Object.keys(e.fieldErrors).length ? e.fieldErrors : { form: e.message });
    },
  });

  const onSubmit = (event) => {
    event.preventDefault();
    if (!serialized && (!/^\d+$/.test(form.quantity) || Number(form.quantity) <= 0 || Number(form.quantity) > outstanding)) {
      setErrors({ quantity: `Enter a whole number from 1 to ${formatNumber(outstanding)}` });
      return;
    }
    mutation.mutate({
      ...(serialized ? {} : { quantity: Number(form.quantity) }),
      condition: form.condition,
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    });
  };

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? undefined : onClose}
      dismissible={!mutation.isPending}
      title="Return equipment"
      description={assignment ? `${assignment.referenceNo} · ${assignment.assigneeName}` : undefined}
      footer={
        <>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="return-form" variant="primary" loading={mutation.isPending}>
            Record return
          </Button>
        </>
      }
    >
      {assignment && (
        <form id="return-form" onSubmit={onSubmit} noValidate className="space-y-4">
          {errors.form && <Callout tone="danger">{errors.form}</Callout>}
          <DetailList
            items={[
              { label: 'Equipment', value: assignment.equipment.name },
              { label: serialized ? 'Serial number' : 'Still held', value: serialized ? assignment.asset.serialNumber : formatQuantity(outstanding, assignment.equipment.unitOfMeasure) },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!serialized && (
              <Field label="Quantity returned" required error={errors.quantity} hint={`Up to ${formatNumber(outstanding)}`}>
                {(p) => (
                  <Input {...p} type="number" inputMode="numeric" min={1} max={outstanding} step={1} value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} data-autofocus />
                )}
              </Field>
            )}
            <Field label="Condition" required>
              {(p) => (
                <Select {...p} value={form.condition} onChange={(e) => set({ condition: e.target.value })}>
                  <option value="SERVICEABLE">Serviceable</option>
                  <option value="UNSERVICEABLE">Unserviceable</option>
                </Select>
              )}
            </Field>
          </div>
          <Field label="Notes" hint="Optional">
            {(p) => <Textarea {...p} rows={2} maxLength={500} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
          </Field>
        </form>
      )}
    </Modal>
  );
}
