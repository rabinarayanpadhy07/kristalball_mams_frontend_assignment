import { useMutation } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { newIdempotencyKey, postData } from '../../api/client.js';
import { normalizeError } from '../../api/errors.js';
import { Button } from '../../components/ui/Button.jsx';
import { Callout } from '../../components/ui/Card.jsx';
import { Field, Input, Textarea } from '../../components/ui/Field.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { businessDateIso, isValidDay, today } from '../../lib/dates.js';
import { formatQuantity, unitLabel } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useInvalidateStock } from '../shared/lookups.js';
import { BaseSelect, EquipmentSelect, useEquipmentItem } from '../shared/selects.jsx';

const EMPTY = { baseId: '', equipmentId: '', quantity: '', serials: '', purchasedOn: '', purchaseOrderNo: '' };

const parseSerials = (text) => text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

function validate(form, { isAdmin, serialized }) {
  const errors = {};
  if (isAdmin && !form.baseId) errors.baseId = 'Select the receiving base';
  if (!form.equipmentId) errors.equipmentId = 'Select equipment';
  if (serialized) {
    const serials = parseSerials(form.serials);
    if (serials.length === 0) errors.serialNumbers = 'Enter one serial number per unit received';
    else if (new Set(serials.map((s) => s.toUpperCase())).size !== serials.length) errors.serialNumbers = 'Serial numbers must be unique';
  } else if (!/^\d+$/.test(form.quantity) || Number(form.quantity) <= 0) {
    errors.quantity = 'Enter a whole number greater than zero';
  } else if (Number(form.quantity) > 1_000_000_000) {
    errors.quantity = 'Quantity is too large';
  }
  if (!isValidDay(form.purchasedOn)) errors.purchasedAt = 'Enter a valid date';
  else if (form.purchasedOn > today()) errors.purchasedAt = 'Purchase date cannot be in the future';
  if (!form.purchaseOrderNo.trim()) errors.purchaseOrderNo = 'Enter the purchase order / reference number';
  return errors;
}

export function AddPurchaseModal({ open, onClose }) {
  const { isAdmin, user } = useAuth();
  const toast = useToast();
  const invalidate = useInvalidateStock();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const equipment = useEquipmentItem(form.equipmentId);
  const serialized = equipment?.trackingType === 'SERIALIZED';

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, purchasedOn: today() });
      setErrors({});
      setIdempotencyKey(newIdempotencyKey());
    }
  }, [open]);

  // Editing a field clears its error; full validation runs again on submit.
  const ERROR_KEY = { serials: 'serialNumbers', purchasedOn: 'purchasedAt' };
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[ERROR_KEY[k] ?? k];
      if (patch.equipmentId !== undefined) delete next.quantity;
      delete next.form;
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: (body) => postData('/purchases', body, { idempotencyKey }),
    onSuccess: async (purchase) => {
      await invalidate('purchases');
      toast.success('Purchase recorded', `${purchase.referenceNo} · ${formatQuantity(purchase.quantity, purchase.equipment.unitOfMeasure)} ${purchase.equipment.name} at ${purchase.base.code}`);
      onClose();
    },
    onError: (err) => {
      const e = normalizeError(err);
      if (Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else setErrors({ form: e.message });
    },
  });

  const onSubmit = (event) => {
    event.preventDefault();
    const found = validate(form, { isAdmin, serialized });
    setErrors(found);
    if (Object.keys(found).length) return;

    const serials = serialized ? parseSerials(form.serials) : undefined;
    mutation.mutate({
      ...(isAdmin ? { baseId: Number(form.baseId) } : {}),
      equipmentId: Number(form.equipmentId),
      ...(serialized ? { serialNumbers: serials } : { quantity: Number(form.quantity) }),
      purchasedAt: businessDateIso(form.purchasedOn),
      purchaseOrderNo: form.purchaseOrderNo.trim(),
    });
  };

  const serialCount = parseSerials(form.serials).length;

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? undefined : onClose}
      dismissible={!mutation.isPending}
      title="Add purchase"
      description="Record newly acquired stock. It is added to the base's inventory immediately."
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="add-purchase" variant="primary" loading={mutation.isPending}>
            Record purchase
          </Button>
        </>
      }
    >
      <form id="add-purchase" onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form && <Callout tone="danger">{errors.form}</Callout>}

        {/* 1 column on phones, 2 from 640px. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isAdmin ? (
            <Field label="Base" required error={errors.baseId}>
              {(p) => <BaseSelect {...p} includeAll={false} value={form.baseId} onChange={(baseId) => set({ baseId })} data-autofocus />}
            </Field>
          ) : (
            <Field label="Base" hint="Purchases are recorded for your base">
              <div className="flex h-9 items-center gap-2 rounded-md border border-line bg-subtle px-3 text-[13px]">
                <MapPin className="size-3.5 text-muted" aria-hidden />
                <span className="truncate">
                  {user.base.code} · {user.base.name}
                </span>
              </div>
            </Field>
          )}

          <Field label="Equipment" required error={errors.equipmentId}>
            {(p) => (
              <EquipmentSelect
                {...p}
                activeOnly
                placeholder="Select equipment…"
                value={form.equipmentId}
                onChange={(equipmentId) => set({ equipmentId, quantity: '', serials: '' })}
              />
            )}
          </Field>

          {serialized ? (
            <Field
              label="Serial numbers"
              required
              className="sm:col-span-2"
              error={errors.serialNumbers}
              hint={`One per line. ${serialCount ? `${serialCount} ${unitLabel('UNIT', serialCount)} will be received.` : 'Quantity is the number of serials.'}`}
            >
              {(p) => (
                <Textarea
                  {...p}
                  rows={4}
                  className="font-mono text-[13px]"
                  placeholder={'M4A1-000123\nM4A1-000124'}
                  value={form.serials}
                  onChange={(e) => set({ serials: e.target.value })}
                />
              )}
            </Field>
          ) : (
            <Field
              label="Quantity"
              required
              error={errors.quantity}
              hint={equipment ? `In ${unitLabel(equipment.unitOfMeasure)}` : undefined}
            >
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={form.quantity}
                  onChange={(e) => set({ quantity: e.target.value })}
                />
              )}
            </Field>
          )}

          <Field label="Purchase date" required error={errors.purchasedAt}>
            {(p) => <Input {...p} type="date" max={today()} value={form.purchasedOn} onChange={(e) => set({ purchasedOn: e.target.value })} />}
          </Field>

          <Field label="Reference number" required error={errors.purchaseOrderNo} hint="Purchase order or supplier reference" className={serialized ? '' : 'sm:col-span-2'}>
            {(p) => (
              <Input
                {...p}
                maxLength={50}
                placeholder="e.g. PO-FTA-26-0190"
                value={form.purchaseOrderNo}
                onChange={(e) => set({ purchaseOrderNo: e.target.value })}
              />
            )}
          </Field>
        </div>
      </form>
    </Modal>
  );
}
