import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

export default function VerifyPage() {
  const nav = useNavigate();
  const phone = useAuthStore((s) => s.pendingPhone);
  const setTokens = useAuthStore((s) => s.setTokens);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    if (!phone) nav('/register');
  }, [phone, nav]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    try {
      const res = await authApi.verifySms(phone, code);
      setTokens(res.accessToken, res.refreshToken, res.user);
      useAuthStore.getState().setPendingPhone(null);
      toast.success('Verified!');
      nav('/app/tasks');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!phone || timer > 0) return;
    try {
      await authApi.resendSms(phone);
      toast.success('Code re-sent');
      setTimer(30);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Verify phone</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the 6-digit code sent to {phone}.</p>
        </div>
        <div>
          <label className="label" htmlFor="code">Code</label>
          <input
            id="code"
            className="input text-center tracking-[0.5em] text-lg font-mono"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            autoFocus
          />
        </div>
        <button className="btn-primary w-full" disabled={loading || code.length !== 6}>
          {loading ? 'Verifying…' : 'Verify'}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={timer > 0}
          className="btn-ghost w-full text-sm"
        >
          {timer > 0 ? `Resend in ${timer}s` : 'Resend code'}
        </button>
      </form>
    </div>
  );
}
