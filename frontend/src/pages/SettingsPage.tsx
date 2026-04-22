import { useUiStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';

export default function SettingsPage() {
  const { theme, setTheme, compact, setCompact } = useUiStore();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-4 pb-20 md:pb-4 max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="card space-y-3">
        <h2 className="font-medium">Profile</h2>
        <div className="text-sm text-gray-500">Phone: {user?.phone}</div>
        <div className="text-sm text-gray-500">
          Verified: {user?.phoneVerified ? 'Yes' : 'No'}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-medium">Appearance</h2>
        <div>
          <label className="label">Theme</label>
          <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-1.5 text-sm rounded-md ${theme === t ? 'bg-white dark:bg-gray-900 shadow' : ''}`}
              >
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="label mb-0" htmlFor="compact">Compact task list</label>
          <input
            id="compact"
            type="checkbox"
            checked={compact}
            onChange={(e) => setCompact(e.target.checked)}
            className="h-5 w-5 accent-brand"
          />
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-medium">About</h2>
        <p className="text-sm text-gray-500">
          Task AI — open-source task manager with Mistral-powered subtask generation and smart prioritization.
        </p>
      </section>
    </div>
  );
}
