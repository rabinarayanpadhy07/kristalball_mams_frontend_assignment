import { Lock, Swords } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { normalizeError } from '../../api/errors.js';
import { Button } from '../../components/ui/Button.jsx';
import { Callout } from '../../components/ui/Card.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { useAuth } from './AuthProvider.jsx';

/**
 * One card: brand header, the form, and the audit notice, so the page reads as a
 * single object. A soft green page tint gives the brand color without gradients.
 */
export function LoginPage() {
  const { status, login, reason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to={location.state?.from ?? '/dashboard'} replace />;

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from ?? '/dashboard', { replace: true });
    } catch (err) {
      setError(normalizeError(err));
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-primary-light px-4 py-10">
      <div className="w-full max-w-[400px] overflow-hidden rounded-lg border border-accent/30 bg-surface shadow-overlay">
        {/* Brand header */}
        <div className="flex items-center gap-3 bg-primary px-6 py-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-white/10 text-primary-light ring-1 ring-white/15">
            <Swords className="size-[22px]" aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[17px] font-semibold tracking-tight text-white">MAMS</p>
            <p className="truncate text-[12px] text-primary-light/80">Military Asset Management System</p>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 pb-6 pt-5">
          <h1 className="text-lg font-semibold text-ink">Sign in</h1>
          <p className="mt-0.5 text-[13px] text-muted">Use your service account to continue.</p>

          {reason === 'expired' && !error && (
            <Callout tone="info" className="mt-4">
              Your session ended. Sign in again to continue.
            </Callout>
          )}
          {error && (
            <Callout tone="danger" className="mt-4">
              {error.code === 'INVALID_CREDENTIALS' ? 'Email or password is incorrect.' : error.message}
            </Callout>
          )}

          <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
            <Field label="Email" required>
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  autoComplete="username"
                  placeholder="name@mams.example"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  autoFocus
                />
              )}
            </Field>
            <Field label="Password" required>
              {(p) => (
                <Input
                  {...p}
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              )}
            </Field>
            <Button type="submit" variant="primary" className="h-10 w-full" loading={submitting} disabled={!form.email || !form.password}>
              Sign in
            </Button>
          </form>
        </div>

        {/* Notice */}
        <div className="flex items-center justify-center gap-1.5 border-t border-line bg-subtle px-6 py-3 text-[12px] text-muted">
          <Lock className="size-3.5" aria-hidden /> Authorized personnel only. Access is logged and audited.
        </div>
      </div>
    </main>
  );
}
