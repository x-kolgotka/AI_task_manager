import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, LogOut, Users, Star, Activity, CheckSquare, Search, Crown, Trash2, KeyRound, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminRequests, AdminUser } from '@/api/admin';
import { useAdminStore } from '@/store/admin';
import clsx from 'clsx';

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-4">
      <div className="p-2 rounded-lg bg-brand/10 text-brand">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const logout = useAdminStore((s) => s.logout);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPremium, setFilterPremium] = useState<boolean | undefined>(undefined);
  const [resetModal, setResetModal] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: adminRequests.stats });
  const users = useQuery({
    queryKey: ['admin', 'users', search, filterPremium],
    queryFn: () => adminRequests.users({ search: search || undefined, premium: filterPremium }),
    placeholderData: (prev) => prev,
  });

  const premiumMut = useMutation({
    mutationFn: ({ id, isPremium }: { id: string; isPremium: boolean }) => adminRequests.setPremium(id, isPremium),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminRequests.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => adminRequests.resetPassword(id, password),
    onSuccess: () => { setResetModal(null); setNewPassword(''); },
  });

  const disable2faMut = useMutation({
    mutationFn: (id: string) => adminRequests.disable2fa(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });

  const signOut = () => { logout(); nav('/admin/login'); };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Shield size={20} className="text-brand" /> Admin Panel
        </div>
        <button onClick={signOut} className="btn-ghost text-sm flex items-center gap-1">
          <LogOut size={15} /> Sign out
        </button>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats */}
        {stats.data && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={<Users size={18} />} label="Total users" value={stats.data.totalUsers} />
            <StatCard icon={<Crown size={18} />} label="Premium" value={stats.data.premiumUsers} />
            <StatCard icon={<CheckSquare size={18} />} label="Verified" value={stats.data.verifiedUsers} />
            <StatCard icon={<Activity size={18} />} label="AI calls today" value={stats.data.aiCallsToday} />
            <StatCard icon={<Star size={18} />} label="Total tasks" value={stats.data.totalTasks} />
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-8 text-sm"
              placeholder="Search by phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
            {[['All', undefined], ['Free', false], ['Premium', true]].map(([label, val]) => (
              <button
                key={String(label)}
                onClick={() => setFilterPremium(val as boolean | undefined)}
                className={clsx('px-3 py-2', filterPremium === val ? 'bg-brand text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300')}
              >
                {label as string}
              </button>
            ))}
          </div>
        </div>

        {/* Users table */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-500 flex items-center justify-between">
            <span>Users {users.data ? `(${users.data.total})` : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 uppercase">
                  <th className="text-left px-4 py-2">Phone</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2">AI today</th>
                  <th className="text-right px-4 py-2">Tasks</th>
                  <th className="text-right px-4 py-2">Points</th>
                  <th className="text-left px-4 py-2">Joined</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {users.data?.users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono font-medium">
                      {u.phone}
                      {!u.phoneVerified && <span className="ml-1 text-xs text-gray-400">(unverified)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
                        u.isPremium ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      )}>
                        {u.isPremium ? <><Crown size={10} /> Premium</> : 'Free'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.aiCallsToday}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.taskCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.points}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => premiumMut.mutate({ id: u.id, isPremium: !u.isPremium })}
                          disabled={premiumMut.isPending}
                          className={clsx('text-xs px-2 py-1 rounded border transition',
                            u.isPremium
                              ? 'border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300'
                              : 'border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                          )}
                          title={u.isPremium ? 'Revoke premium' : 'Grant premium'}
                        >
                          <Crown size={13} />
                        </button>
                        <button
                          onClick={() => setResetModal(u)}
                          className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Reset password"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Disable 2FA for ${u.phone}?`)) disable2faMut.mutate(u.id); }}
                          disabled={disable2faMut.isPending}
                          className="text-xs px-2 py-1 rounded border border-orange-200 text-orange-500 hover:bg-orange-50 dark:border-orange-900 dark:hover:bg-orange-900/20"
                          title="Disable 2FA"
                        >
                          <ShieldOff size={13} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete ${u.phone}?`)) deleteMut.mutate(u.id); }}
                          disabled={deleteMut.isPending}
                          className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                          title="Delete user"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.data?.users.length === 0 && (
              <p className="text-center text-gray-500 py-8 text-sm">No users found</p>
            )}
          </div>
        </div>
      </div>

      {/* Reset password modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setResetModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold">Reset password for {resetModal.phone}</h2>
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              minLength={6}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setResetModal(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={newPassword.length < 6 || resetMut.isPending}
                onClick={() => resetMut.mutate({ id: resetModal.id, password: newPassword })}
              >
                {resetMut.isPending ? 'Saving…' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
