import clsx from 'clsx';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, ShieldCheck, Mail, Zap } from 'lucide-react';
import {
  accentMap,
  Density,
  InterfaceSize,
  Language,
  ThemeMode,
  TimeFormat,
  useUiStore,
  WeekStart,
} from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { languageOptions, TranslationKey, useT } from '@/i18n';
import { totpApi, usersApi } from '@/api/tasks';

const accentLabelKeys: Record<string, TranslationKey> = {
  blue: 'settings.accent.blue',
  green: 'settings.accent.green',
  amber: 'settings.accent.amber',
  rose: 'settings.accent.rose',
};

function SegmentGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; description?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={clsx(
                'min-h-[58px] rounded-lg border px-3 py-2 text-left transition shadow-sm',
                active
                  ? 'border-brand bg-brand/10 text-brand ring-2 ring-brand/20'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-brand dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200',
              )}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              {option.description && (
                <span className={clsx('mt-0.5 block text-xs', active ? 'text-brand/80' : 'text-gray-500')}>
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PremiumSection() {
  const t = useT();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activated, setActivated] = useState(false);

  const { data: quota } = useQuery({
    queryKey: ['quota'],
    queryFn: () => usersApi.quota(),
    refetchInterval: 60_000,
  });

  const isPremium = user?.isPremium ?? false;

  const activate = async () => {
    if (!code.trim()) return;
    setBusy(true); setError('');
    try {
      await usersApi.activatePremium(code.trim());
      if (user) setUser({ ...user, isPremium: true });
      setActivated(true);
      setCode('');
      qc.invalidateQueries({ queryKey: ['quota'] });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Zap size={18} /> {t('settings.premium')}</h2>
      {isPremium || activated ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-green-600 font-medium"><Check size={16} /> {t('settings.premiumActive')}</p>
          {quota && (
            <p className="text-sm text-gray-500">{t('settings.aiQuota')}: {quota.used} / {t('settings.aiQuotaUnlimited')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {quota && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full bg-brand transition-all"
                  style={{ width: `${Math.min(100, ((quota.used ?? 0) / (quota.limit ?? 8)) * 100)}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 shrink-0">
                {quota.used} {t('settings.aiQuotaOf')} {quota.limit}
              </span>
            </div>
          )}
          <p className="text-sm text-gray-500">{t('settings.premiumFree')} · {t('settings.premiumHint')}</p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder={t('settings.premiumCode')}
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && activate()}
            />
            <button className="btn-primary" onClick={activate} disabled={busy || !code.trim()}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : t('settings.premiumActivate')}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}
    </section>
  );
}

function EmailSection() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async () => {
    if (!email) return;
    setBusy(true); setError('');
    try {
      await usersApi.setEmail(email);
      setStage('sent');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (!code) return;
    setBusy(true); setError('');
    try {
      await fetch('/api/users/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
        body: JSON.stringify({ code }),
      });
      setStage('verified');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Mail size={18} /> {t('settings.email')}</h2>
      {stage === 'verified' ? (
        <p className="flex items-center gap-2 text-green-600"><Check size={16} /> {t('settings.emailVerified')}</p>
      ) : stage === 'sent' ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">{t('settings.emailCodeHint')}</p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder={t('settings.emailCode')}
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={6}
            />
            <button className="btn-primary" onClick={verify} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : t('settings.verify')}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="email"
              placeholder={t('settings.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button className="btn-primary" onClick={sendCode} disabled={busy || !email}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : t('settings.sendCode')}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs text-gray-400">{t('settings.emailHint')}</p>
        </div>
      )}
    </section>
  );
}

function TwoFaSection() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(() => user?.totpEnabled ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setup = async () => {
    setBusy(true); setError('');
    try {
      const r = await totpApi.setup();
      setQr(r.qr);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setBusy(false); }
  };

  const activate = async () => {
    setBusy(true); setError('');
    try {
      const r = await totpApi.verify(code);
      setBackupCodes(r.backupCodes);
      setEnabled(true);
      setQr('');
      if (user) setUser({ ...user, totpEnabled: true });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true); setError('');
    try {
      await totpApi.disable(password);
      setEnabled(false);
      setPassword('');
      if (user) setUser({ ...user, totpEnabled: false });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={18} /> {t('settings.twoFa')}</h2>
      {enabled ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-green-600"><Check size={16} /> {t('settings.twoFaEnabled')}</p>
          {backupCodes.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">{t('settings.backupCodes')}</p>
              <div className="grid grid-cols-2 gap-1">{backupCodes.map(c => <code key={c} className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-mono">{c}</code>)}</div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <input className="input flex-1" type="password" placeholder={t('auth.password')} value={password} onChange={e => setPassword(e.target.value)} />
            <button className="btn-ghost text-red-500" onClick={disable} disabled={busy}>{t('settings.disable2Fa')}</button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      ) : qr ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{t('settings.twoFaScanHint')}</p>
          <img src={qr} alt="QR code" className="w-48 h-48 rounded border dark:border-gray-700" />
          <div className="flex gap-2">
            <input className="input flex-1" placeholder={t('settings.totpCode')} value={code} onChange={e => setCode(e.target.value)} maxLength={6} />
            <button className="btn-primary" onClick={activate} disabled={busy || code.length < 6}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : t('settings.activate')}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">{t('settings.twoFaHint')}</p>
          <button className="btn-primary" onClick={setup} disabled={busy}>{t('settings.enable2Fa')}</button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const t = useT();
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    interfaceSize,
    setInterfaceSize,
    density,
    setDensity,
    timeFormat,
    setTimeFormat,
    weekStart,
    setWeekStart,
    colorScheme,
    setColorScheme,
  } = useUiStore();
  const user = useAuthStore((s) => s.user);

  const themes: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: t('settings.theme.light') },
    { value: 'dark', label: t('settings.theme.dark') },
    { value: 'system', label: t('settings.theme.system') },
  ];

  const sizes: { value: InterfaceSize; label: string; description: string }[] = [
    { value: 'sm', label: t('settings.size.small'), description: t('settings.size.small.description') },
    { value: 'md', label: t('settings.size.medium'), description: t('settings.size.medium.description') },
    { value: 'lg', label: t('settings.size.large'), description: t('settings.size.large.description') },
  ];

  const densities: { value: Density; label: string; description: string }[] = [
    {
      value: 'comfortable',
      label: t('settings.density.comfortable'),
      description: t('settings.density.comfortable.description'),
    },
    { value: 'compact', label: t('settings.density.compact'), description: t('settings.density.compact.description') },
  ];

  const timeFormats: { value: TimeFormat; label: string; description: string }[] = [
    { value: '24h', label: '24h', description: '18:30' },
    { value: '12h', label: '12h', description: '6:30 PM' },
  ];

  const weekStarts: { value: WeekStart; label: string; description: string }[] = [
    { value: 'mon', label: t('settings.weekStart.monday'), description: t('settings.weekStart.monday.description') },
    { value: 'sun', label: t('settings.weekStart.sunday'), description: t('settings.weekStart.sunday.description') },
  ];

  return (
    <div className="p-4 mobile-page-bottom md:pb-4 max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">{t('settings.title')}</h1>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">{t('settings.profile')}</h2>
        <div className="mt-3 grid gap-2 text-sm text-gray-500">
          <div className="break-words">
            {t('settings.phone')}: {user?.phone}
          </div>
          <div>
            {t('settings.verified')}: {user?.phoneVerified ? t('settings.yes') : t('settings.no')}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">{t('settings.interface')}</h2>
        <div className="mt-4 space-y-5">
          <SegmentGroup label={t('settings.theme')} value={theme} options={themes} onChange={setTheme} />
          <SegmentGroup
            label={t('settings.language')}
            value={language}
            options={languageOptions}
            onChange={(value: Language) => {
              setLanguage(value);
              usersApi.setPreferences({ language: value }).catch(() => {});
            }}
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <SegmentGroup
              label={t('settings.interfaceSize')}
              value={interfaceSize}
              options={sizes}
              onChange={setInterfaceSize}
            />
            <SegmentGroup label={t('settings.density')} value={density} options={densities} onChange={setDensity} />
          </div>

          <div>
            <div className="label">{t('settings.accentColor')}</div>
            <div className="grid gap-2 sm:grid-cols-4">
              {Object.entries(accentMap).map(([key, accent]) => {
                const active = colorScheme === key;
                const label = t(accentLabelKeys[key] ?? 'settings.accent.blue');
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={`${t('settings.accentColor')} ${label}`}
                    aria-pressed={active}
                    onClick={() => setColorScheme(key)}
                    className={clsx(
                      'min-h-[64px] rounded-lg border p-3 text-left transition shadow-sm',
                      active
                        ? 'border-brand bg-brand/10 ring-2 ring-brand/20'
                        : 'border-gray-200 bg-white hover:border-brand dark:border-gray-800 dark:bg-gray-950',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <span
                          className="h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: accent.hex }}
                          aria-hidden
                        />
                        {label}
                      </span>
                      {active && <Check size={16} className="text-brand" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">{t('settings.calendar')}</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <SegmentGroup label={t('settings.timeFormat')} value={timeFormat} options={timeFormats} onChange={setTimeFormat} />
          <SegmentGroup label={t('settings.weekStart')} value={weekStart} options={weekStarts} onChange={setWeekStart} />
        </div>
      </section>

      <PremiumSection />
      <EmailSection />
      <TwoFaSection />
    </div>
  );
}
