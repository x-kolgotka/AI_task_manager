import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { adminRequests } from '@/api/admin';
import { useAdminStore } from '@/store/admin';

export default function AdminLoginPage() {
  const nav = useNavigate();
  const setToken = useAdminStore((s) => s.setToken);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await adminRequests.login(phone, password);
      setToken(r.accessToken);
      nav('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={22} className="text-brand" />
          <h1 className="text-xl font-semibold">Admin Panel</h1>
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1..." required autoComplete="tel" />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
