import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { formatPhoneInput, getPhoneError } from '@/utils/format';
import { useT } from '@/i18n';

export default function RegisterPage() {
  const t = useT();
  const nav = useNavigate();
  const setPending = useAuthStore((s) => s.setPendingPhone);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nextPhoneError = getPhoneError(phone);
    if (nextPhoneError) {
      setPhoneError(nextPhoneError);
      toast.error(nextPhoneError);
      return;
    }
    if (password !== confirm) {
      toast.error(t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await authApi.register(phone, password);
      setPending(phone);
      toast.success(t('auth.codeSent'));
      nav('/verify');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('auth.createAccount')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('auth.registerHint')}</p>
        </div>
        <div>
          <label className="label" htmlFor="phone">{t('auth.phoneInternational')}</label>
          <input
            id="phone"
            className="input"
            value={phone}
            onChange={(e) => {
              setPhone(formatPhoneInput(e.target.value));
              setPhoneError(null);
            }}
            placeholder="+12025551212"
            required
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={!!phoneError}
            aria-describedby={phoneError ? 'phone-error' : undefined}
          />
          {phoneError && <p id="phone-error" className="mt-1 text-sm text-red-600">{phoneError}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm">{t('auth.confirmPassword')}</label>
          <input
            id="confirm"
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
            autoComplete="new-password"
          />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? t('auth.sendingCode') : t('auth.continue')}
        </button>
        <p className="text-sm text-center text-gray-500">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-brand font-medium">
            {t('auth.signIn')}
          </Link>
        </p>
      </form>
    </div>
  );
}
