import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Activity, Brain, CalendarCheck, AlertTriangle, Clock, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiApi, tasksApi } from '@/api/tasks';
import { useT } from '@/i18n';
import clsx from 'clsx';

const humanizeLabel = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\b(Api|Ai|Ui|Ux|Rest|Jwt|Pwa)\b/g, (match) => match.toUpperCase());

const riskColor = { high: 'text-red-600 bg-red-50 dark:bg-red-900/20', medium: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', low: 'text-gray-500 bg-gray-50 dark:bg-gray-800' };

export default function AssistantPage() {
  const t = useT();
  const qc = useQueryClient();

  const patterns = useQuery({ queryKey: ['ai', 'patterns'], queryFn: aiApi.patterns, retry: false });
  const coach = useQuery({ queryKey: ['ai', 'coach'], queryFn: aiApi.coach, retry: false });
  const weekly = useQuery({ queryKey: ['ai', 'weekly'], queryFn: aiApi.weeklyReport, retry: false });
  const suggest = useQuery({ queryKey: ['ai', 'suggest'], queryFn: aiApi.suggestTasks, retry: false });
  const risks = useQuery({ queryKey: ['ai', 'deadlineRisk'], queryFn: aiApi.deadlineRisk, retry: false });
  const stuck = useQuery({ queryKey: ['ai', 'stuck'], queryFn: aiApi.stuckTasks, retry: false });

  const addTask = useMutation({
    mutationFn: (title: string) => tasksApi.create({ title, priority: 'MEDIUM', status: 'TODO' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task added'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-4 mobile-page-bottom md:pb-4 space-y-4 max-w-4xl">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <Sparkles className="text-ai" size={22} aria-hidden="true" /> {t('ai.insightsTitle')}
      </h1>

      {/* Stuck tasks */}
      {(stuck.data?.tasks?.length ?? 0) > 0 && (
        <section className="card border-l-4 border-amber-400">
          <h2 className="flex items-center gap-2 text-base font-semibold mb-2">
            <Clock size={16} className="text-amber-500" /> {t('ai.stuckTasks')}
          </h2>
          <ul className="space-y-1">
            {stuck.data!.tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex-1 truncate">{task.title}</span>
                <span className="text-amber-600 text-xs shrink-0">
                  {t('ai.stuckDays', { days: String(task.daysSinceUpdate) })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Deadline risk */}
      {(risks.data?.risks?.filter(r => r.risk !== 'low').length ?? 0) > 0 && (
        <section className="card">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <AlertTriangle size={18} className="text-red-500" /> {t('ai.deadlineRisk')}
          </h2>
          <ul className="space-y-2">
            {risks.data!.risks.filter(r => r.risk !== 'low').map((r) => (
              <li key={r.id} className={clsx('rounded-lg px-3 py-2 text-sm', riskColor[r.risk])}>
                <span className="font-medium">{r.risk === 'high' ? t('ai.riskHigh') : t('ai.riskMedium')}: </span>
                {r.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Task suggestions */}
      <section className="card">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
          <Lightbulb size={18} aria-hidden="true" /> {t('ai.suggestTasks')}
        </h2>
        {suggest.isPending ? (
          <p className="text-sm text-gray-500">{t('ai.parsing')}</p>
        ) : suggest.data?.suggestions?.length ? (
          <ul className="space-y-2">
            {suggest.data.suggestions.map((s, idx) => (
              <li key={idx} className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.reason}</div>
                </div>
                <button
                  className="btn-ai text-xs px-2 py-1 shrink-0"
                  onClick={() => addTask.mutate(s.title)}
                  disabled={addTask.isPending}
                >
                  {t('ai.suggestAdd')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{t('ai.noData')}</p>
        )}
      </section>

      {/* Patterns */}
      <section className="card">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
          <Brain size={18} aria-hidden="true" /> {t('ai.patterns')}
        </h2>
        {patterns.isPending ? (
          <p className="text-sm text-gray-500">{t('ai.parsing')}</p>
        ) : patterns.data && patterns.data.insights.length ? (
          <ul className="space-y-1 text-sm list-disc pl-5">
            {patterns.data.insights.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{t('ai.noData')}</p>
        )}
        {patterns.data?.patterns?.length ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {patterns.data.patterns.map((p, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-800 p-2">
                <div className="font-medium">{humanizeLabel(p.category)}</div>
                <div className="text-gray-500">
                  {t('ai.avgHours', { hours: String(p.avgHours) })} · {t('ai.tasksCount', { count: String(p.count) })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Coach */}
      <section className="card">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
          <Activity size={18} aria-hidden="true" /> {t('ai.coach')}
        </h2>
        {coach.isPending ? (
          <p className="text-sm text-gray-500">{t('ai.parsing')}</p>
        ) : coach.data && coach.data.insights.length ? (
          <ul className="space-y-2">
            {coach.data.insights.map((i, idx) => (
              <li key={idx} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="font-medium">{i.message}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{i.recommendation}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{t('ai.noData')}</p>
        )}
      </section>

      {/* Weekly report */}
      <section className="card">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
          <CalendarCheck size={18} aria-hidden="true" /> {t('ai.weeklyReport')}
        </h2>
        {weekly.isPending ? (
          <p className="text-sm text-gray-500">{t('ai.parsing')}</p>
        ) : weekly.data ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/40 p-2">
                <div className="text-2xl font-bold">{weekly.data.summary.done}</div>
                <div>{t('status.done')}</div>
              </div>
              <div className="rounded-lg bg-sky-100 dark:bg-sky-900/40 p-2">
                <div className="text-2xl font-bold">{weekly.data.summary.inProgress}</div>
                <div>{t('status.inProgress')}</div>
              </div>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2">
                <div className="text-2xl font-bold">{weekly.data.summary.todo}</div>
                <div>{t('status.todo')}</div>
              </div>
            </div>
            {weekly.data.recommendations.length > 0 && (
              <ul className="space-y-1 text-sm list-disc pl-5">
                {weekly.data.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">{t('ai.noData')}</p>
        )}
      </section>
    </div>
  );
}
