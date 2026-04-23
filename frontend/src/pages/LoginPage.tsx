import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { formatPhoneInput, getPhoneError } from '@/utils/format';
import { useT } from '@/i18n';

export default function LoginPage() {
  const t = useT();
  const nav = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needTotp, setNeedTotp] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!needTotp) {
      const nextPhoneError = getPhoneError(phone);
      if (nextPhoneError) {
        setPhoneError(nextPhoneError);
        toast.error(nextPhoneError);
        return;
      }
    }
    setLoading(true);
    try {
      const res = await authApi.login(phone, password, needTotp ? totpCode : undefined);
      setTokens(res.accessToken, res.refreshToken, res.user);
      nav('/app/tasks');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.loginFailed');
      if (msg.toLowerCase().includes('totp required')) {
        setNeedTotp(true);
        return;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('auth.loginTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('auth.loginHint')}</p>
        </div>
        <div>
          <label className="label" htmlFor="phone">{t('auth.phone')}</label>
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
            autoComplete="current-password"
          />
        </div>
        {needTotp && (
          <div>
            <label className="label" htmlFor="totp">{t('auth.totpCode')}</label>
            <input
              id="totp"
              className="input"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
            />
            <p className="mt-1 text-xs text-gray-400">{t('auth.totpHint')}</p>
          </div>
        )}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </button>
        <p className="text-sm text-center text-gray-500">
          {t('auth.newHere')}{' '}
          <Link to="/register" className="text-brand font-medium">
            {t('auth.createAccount')}
          </Link>
        </p>
      </form>
    </div>
  );
}
