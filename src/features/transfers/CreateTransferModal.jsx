import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Info, MapPin, PackageSearch } from 'lucide-react';
import { useEffect, useState } from 'react';
import { newIdempotencyKey, postData } from '../../api/client.js';
import { normalizeError } from '../../api/errors.js';
import { Button } from '../../components/ui/Button.jsx';
import { Callout } from '../../components/ui/Card.jsx';
import { Field, Input, Textarea } from '../../components/ui/Field.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { cn } from '../../lib/cn.js';
import { formatNumber, formatQuantity, unitLabel } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useAvailability, useAvailableAssets, useInvalidateStock } from '../shared/lookups.js';
import { BaseSelect, EquipmentSelect, useEquipmentItem } from '../shared/selects.jsx';

const EMPTY = { sourceBaseId: '', destinationBaseId: '', equipmentId: '', quantity: '', assetIds: [], notes: '' };

/** Shows what the source base can send right now (on hand − assigned). */
function AvailabilityPanel({ baseId, equipment, serialized, assetsQuery, availabilityQuery }) {
  if (!baseId || !equipment) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-3 text-[13px] text-muted">
        <PackageSearch className="size-4 shrink-0" aria-hidden />
        Choose a source base and equipment to see available stock.
      </div>
    );
  }
  const loading = serialized ? assetsQuery.isLoading : availabilityQuery.isLoading;
  const available = serialized ? assetsQuery.data?.meta.total : availabilityQuery.data?.available;
  const assigned = availabilityQuery.data?.assigned ?? 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-subtle px-3 py-2.5">
      <span className="text-[13px] text-muted">Available at source</span>
      {loading ? (
        <Skeleton className="h-5 w-24" />
      ) : (
        <span className="text-right">
          <span className={cn('num text-[15px] font-semibold', available ? 'text-ink' : 'text-danger-ink')}>{formatNumber(available ?? 0)}</span>{' '}
          <span className="text-[13px] text-muted">{unitLabel(equipment.unitOfMeasure, available)}</span>
          {assigned > 0 && <span className="block text-[12px] text-muted">{formatNumber(assigned)} more assigned to personnel</span>}
        </span>
      )}
    </div>
  );
}

export function CreateTransferModal({ open, onClose }) {
  const { isAdmin, user } = useAuth();
  const toast = useToast();
  const invalidate = useInvalidateStock();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [key, setKey] = useState(newIdempotencyKey);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, sourceBaseId: isAdmin ? '' : String(user.baseId) });
      setErrors({});
      setKey(newIdempotencyKey());
    }
  }, [open, isAdmin, user]);

  const equipment = useEquipmentItem(form.equipmentId);
  const serialized = equipment?.trackingType === 'SERIALIZED';
  const availabilityQuery = useAvailability(form.sourceBaseId, form.equipmentId);
  const assetsQuery = useAvailableAssets(form.sourceBaseId, form.equipmentId, serialized);
  const available = serialized ? assetsQuery.data?.meta.total : availabilityQuery.data?.available;

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
    if (!form.sourceBaseId) e.sourceBaseId = 'Select the source base';
    if (!form.destinationBaseId) e.destinationBaseId = 'Select the destination base';
    else if (form.destinationBaseId === form.sourceBaseId) e.destinationBaseId = 'Destination must be a different base';
    if (!form.equipmentId) e.equipmentId = 'Select equipment';
    if (serialized) {
      if (form.assetIds.length === 0) e.assetIds = 'Select at least one unit';
    } else if (!/^\d+$/.test(form.quantity) || Number(form.quantity) <= 0) {
      e.quantity = 'Enter a whole number greater than zero';
    } else if (available != null && Number(form.quantity) > available) {
      e.quantity = `Only ${formatNumber(available)} available at the source`;
    }
    return e;
  };

  const mutation = useMutation({
    mutationFn: (body) => postData('/transfers', body, { idempotencyKey: key }),
    onSuccess: async (t) => {
      await invalidate('transfers');
      toast.success('Transfer requested', `${t.referenceNo} is pending completion by ${t.sourceBase.code}.`);
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
      ...(isAdmin ? { sourceBaseId: Number(form.sourceBaseId) } : {}),
      destinationBaseId: Number(form.destinationBaseId),
      equipmentId: Number(form.equipmentId),
      ...(serialized ? { assetIds: form.assetIds } : { quantity: Number(form.quantity) }),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    });
  };

  const toggleAsset = (id) =>
    set({ assetIds: form.assetIds.includes(id) ? form.assetIds.filter((a) => a !== id) : [...form.assetIds, id] });

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? undefined : onClose}
      dismissible={!mutation.isPending}
      title="New transfer"
      description="Request a movement of stock to another base. Nothing moves until the transfer is completed."
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-transfer" variant="primary" loading={mutation.isPending}>
            Request transfer
          </Button>
        </>
      }
    >
      <form id="create-transfer" onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form && <Callout tone="danger">{errors.form}</Callout>}

        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
          {isAdmin ? (
            <Field label="Source base" required error={errors.sourceBaseId}>
              {(p) => (
                <BaseSelect
                  {...p}
                  includeAll={false}
                  value={form.sourceBaseId}
                  onChange={(sourceBaseId) =>
                    set({ sourceBaseId, assetIds: [], ...(sourceBaseId === form.destinationBaseId ? { destinationBaseId: '' } : {}) })
                  }
                  data-autofocus
                />
              )}
            </Field>
          ) : (
            <Field label="Source base" hint="Stock can only be sent from your base">
              <div className="flex h-9 items-center gap-2 rounded-md border border-line bg-subtle px-3 text-[13px]">
                <MapPin className="size-3.5 text-muted" aria-hidden />
                <span className="truncate">
                  {user.base.code} · {user.base.name}
                </span>
              </div>
            </Field>
          )}
          <ArrowRight className="mx-auto hidden size-4 text-muted sm:mt-9 sm:block" aria-hidden />
          <Field label="Destination base" required error={errors.destinationBaseId}>
            {(p) => (
              <BaseSelect
                {...p}
                directory
                includeAll={false}
                exclude={form.sourceBaseId}
                value={form.destinationBaseId}
                onChange={(destinationBaseId) => set({ destinationBaseId })}
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Equipment" required error={errors.equipmentId}>
            {(p) => (
              <EquipmentSelect
                {...p}
                activeOnly
                placeholder="Select equipment…"
                value={form.equipmentId}
                onChange={(equipmentId) => set({ equipmentId, quantity: '', assetIds: [] })}
              />
            )}
          </Field>
          {!serialized && (
            <Field label="Quantity" required error={errors.quantity} hint={equipment ? `In ${unitLabel(equipment.unitOfMeasure)}` : undefined}>
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={available ?? undefined}
                  step={1}
                  value={form.quantity}
                  onChange={(e) => set({ quantity: e.target.value })}
                />
              )}
            </Field>
          )}
        </div>

        <AvailabilityPanel
          baseId={form.sourceBaseId}
          equipment={equipment}
          serialized={serialized}
          assetsQuery={assetsQuery}
          availabilityQuery={availabilityQuery}
        />

        {serialized && form.sourceBaseId && (
          <fieldset>
            <legend className="mb-1.5 flex w-full items-center justify-between text-[13px] font-medium text-ink">
              <span>
                Units to send<span className="ml-0.5 text-danger">*</span>
              </span>
              <span className="num text-[12px] font-normal text-muted">{form.assetIds.length} selected</span>
            </legend>
            {assetsQuery.data?.data.length === 0 ? (
              <p className="text-[13px] text-muted">No available units at this base.</p>
            ) : (
              <div className={cn('scroll-thin grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-md border p-1.5 sm:grid-cols-2', errors.assetIds ? 'border-danger' : 'border-line-strong')}>
                {assetsQuery.data?.data.map((a) => (
                  <label key={a.id} className="flex h-8 cursor-pointer items-center gap-2 rounded px-2 text-[13px] hover:bg-subtle">
                    <input type="checkbox" className="size-4 accent-primary" checked={form.assetIds.includes(a.id)} onChange={() => toggleAsset(a.id)} />
                    <span className="truncate font-mono text-[12px]">{a.serialNumber}</span>
                  </label>
                ))}
              </div>
            )}
            {errors.assetIds && <p className="mt-1.5 text-[12px] text-danger-ink">{errors.assetIds}</p>}
          </fieldset>
        )}

        <Field label="Notes" hint="Optional: purpose or handling instructions">
          {(p) => <Textarea {...p} rows={2} maxLength={2000} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
        </Field>

        {!isAdmin && (
          <Callout icon={Info}>A base commander completes the transfer; stock leaves {user.base.code} only then.</Callout>
        )}
      </form>
    </Modal>
  );
}
