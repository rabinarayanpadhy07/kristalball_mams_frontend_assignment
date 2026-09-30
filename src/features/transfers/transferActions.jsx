import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { newIdempotencyKey, postData } from '../../api/client.js';
import { errorMessage } from '../../api/errors.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Field, Textarea } from '../../components/ui/Field.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatQuantity } from '../../lib/format.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useInvalidateStock } from '../shared/lookups.js';

/**
 * What the current user may do with a transfer. Mirrors the API rules (source base
 * or ADMIN; PENDING only) so buttons are only offered when they will work.
 */
export function useTransferPermissions() {
  const { can, isAdmin, user } = useAuth();
  return (t) => {
    const fromOwnBase = isAdmin || t.sourceBase.id === user?.baseId;
    const pending = t.status === 'PENDING';
    return {
      complete: pending && fromOwnBase && can('transfer:complete'),
      cancel: pending && fromOwnBase && can('transfer:cancel'),
    };
  };
}

function Route({ t }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-ink">
      {t.sourceBase.code} <ArrowRight className="size-3.5 text-muted" aria-hidden /> {t.destinationBase.code}
    </span>
  );
}

/** Completion moves stock and cannot be undone: always confirmed. */
export function CompleteTransferDialog({ transfer, onClose }) {
  const toast = useToast();
  const invalidate = useInvalidateStock();
  const [key, setKey] = useState(newIdempotencyKey);
  useEffect(() => setKey(newIdempotencyKey()), [transfer?.id]);

  const mutation = useMutation({
    mutationFn: () => postData(`/transfers/${transfer.id}/complete`, {}, { idempotencyKey: key }),
    onSuccess: async (t) => {
      await invalidate('transfers');
      toast.success('Transfer completed', `${t.referenceNo}: ${formatQuantity(t.quantity, t.equipment.unitOfMeasure)} moved ${t.sourceBase.code} → ${t.destinationBase.code}`);
      onClose();
    },
    onError: async (err) => {
      await invalidate('transfers');
      toast.error('Transfer not completed', errorMessage(err));
      onClose();
    },
  });

  return (
    <ConfirmDialog
      open={Boolean(transfer)}
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
      loading={mutation.isPending}
      title={`Complete ${transfer?.referenceNo ?? 'transfer'}?`}
      confirmLabel="Complete transfer"
      message={
        transfer && (
          <>
            <p>
              <span className="num font-medium text-ink">{formatQuantity(transfer.quantity, transfer.equipment.unitOfMeasure)}</span> of{' '}
              <span className="font-medium text-ink">{transfer.equipment.name}</span> will leave <Route t={transfer} /> now.
            </p>
            <p className="mt-2">Stock is deducted from the source and added to the destination in one step. This cannot be undone.</p>
          </>
        )
      }
    />
  );
}

export function CancelTransferDialog({ transfer, onClose }) {
  const toast = useToast();
  const invalidate = useInvalidateStock();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    setReason('');
    setTouched(false);
  }, [transfer?.id]);
  const invalid = reason.trim().length < 3;

  const mutation = useMutation({
    mutationFn: () => postData(`/transfers/${transfer.id}/cancel`, { reason: reason.trim() }),
    onSuccess: async (t) => {
      await invalidate('transfers');
      toast.success('Transfer cancelled', `${t.referenceNo} was withdrawn. No stock moved.`);
      onClose();
    },
    onError: async (err) => {
      await invalidate('transfers');
      toast.error('Transfer not cancelled', errorMessage(err));
      onClose();
    },
  });

  return (
    <ConfirmDialog
      open={Boolean(transfer)}
      onClose={onClose}
      onConfirm={() => {
        setTouched(true);
        if (!invalid) mutation.mutate();
      }}
      loading={mutation.isPending}
      tone="danger"
      title={`Cancel ${transfer?.referenceNo ?? 'transfer'}?`}
      confirmLabel="Cancel transfer"
      message="No stock has moved yet. A cancelled transfer cannot be completed or reopened."
    >
      <Field label="Reason" required error={touched && invalid ? 'Give a reason (at least 3 characters)' : undefined}>
        {(p) => (
          <Textarea
            {...p}
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Raised in error"
          />
        )}
      </Field>
    </ConfirmDialog>
  );
}
