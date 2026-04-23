import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Sparkles, Mic, MicOff, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { Priority, Task, TaskStatus } from '@/types';
import { TranslationKey, useT } from '@/i18n';
import { aiApi } from '@/api/tasks';

type Values = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
};

const statusLabelKeys: Record<TaskStatus, TranslationKey> = {
  TODO: 'status.todo',
  IN_PROGRESS: 'status.inProgress',
  DONE: 'status.done',
};

const priorityLabelKeys: Record<Priority, TranslationKey> = {
  LOW: 'priority.low',
  MEDIUM: 'priority.medium',
  HIGH: 'priority.high',
  URGENT: 'priority.urgent',
};


export default function TaskForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  onSplitRequest,
  onBulkImport,
}: {
  initial?: Partial<Task>;
  onSubmit: (v: Partial<Task>) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  onSplitRequest?: (title: string, description: string) => void;
  onBulkImport?: (drafts: { title: string; status: string }[]) => void;
}) {
  const t = useT();
  const titleId = useId();
  const descriptionId = useId();
  const statusId = useId();
  const priorityId = useId();
  const dueDateId = useId();
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const complexityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [parsing, setParsing] = useState(false);
  const [listening, setListening] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDrafts, setOcrDrafts] = useState<{ title: string; status: string }[]>([]);
  const [voiceSubtasks, setVoiceSubtasks] = useState<string[]>([]);
  const [complexHint, setComplexHint] = useState(false);
  const [v, setV] = useState<Values>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    status: (initial?.status as TaskStatus) ?? 'TODO',
    priority: (initial?.priority as Priority) ?? 'MEDIUM',
    dueDate: initial?.dueDate ? initial.dueDate.slice(0, 10) : '',
  });

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [v.description]);

  // Debounced complexity check
  useEffect(() => {
    if (!v.title.trim() || v.title.length < 20) { setComplexHint(false); return; }
    if (complexityTimer.current) clearTimeout(complexityTimer.current);
    complexityTimer.current = setTimeout(async () => {
      try {
        const r = await aiApi.checkComplexity(v.title, v.description);
        setComplexHint(r.isComplex && r.confidence > 0.6);
      } catch { /* silent */ }
    }, 1200);
    return () => { if (complexityTimer.current) clearTimeout(complexityTimer.current); };
  }, [v.title, v.description]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title: v.title,
      description: v.description || null,
      status: v.status,
      priority: v.priority,
      dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : null,
    });
  };

  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error(t('ai.voiceNotSupported')); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.lang = document.documentElement.lang || 'ru-RU';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.start();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = async (e: any) => {
      const text = e.results[0][0].transcript;
      setListening(false);
      setParsing(true);
      try {
        const r = await aiApi.parseVoice(text);
        setV(prev => ({
          ...prev,
          title: r.title || text,
          dueDate: r.dueDate ?? prev.dueDate,
          priority: (r.priority as Priority) ?? prev.priority,
        }));
        if (r.subtasks.length > 0) setVoiceSubtasks(r.subtasks);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally { setParsing(false); }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
  };

  const handleImage = async (file: File) => {
    setOcrLoading(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const result = await aiApi.ocr(base64, file.type || 'image/jpeg');
      if (result.tasks.length === 0) { toast.error('No tasks found in image'); return; }
      setOcrDrafts(result.tasks);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally { setOcrLoading(false); }
  };

  if (ocrDrafts.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">{t('ai.imageImport', { count: String(ocrDrafts.length) })}</p>
        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {ocrDrafts.map((d, i) => (
            <li key={i} className="flex items-center gap-2 text-sm p-2 rounded border border-gray-200 dark:border-gray-700">
              <span className={`w-2 h-2 rounded-full shrink-0 ${d.status === 'DONE' ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="flex-1">{d.title}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-ghost" onClick={() => setOcrDrafts([])}>
            {t('task.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (onBulkImport) {
                onBulkImport(ocrDrafts);
              } else {
                // fallback: create first task only via onSubmit
                const d = ocrDrafts[0];
                onSubmit({ title: d.title, status: d.status as TaskStatus, priority: 'MEDIUM' });
              }
              setOcrDrafts([]);
            }}
          >
            {t('task.save')} ({ocrDrafts.length})
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor={titleId} className="label">{t('task.title')}</label>
        <div className="flex gap-2">
          <input
            id={titleId}
            name="title"
            autoComplete="off"
            className="input flex-1"
            value={v.title}
            onChange={(e) => setV({ ...v, title: e.target.value })}
            required
            maxLength={200}
            title={v.title}
          />
          {/* AI parse */}
          <button
            type="button"
            className="btn-ai px-3 shrink-0"
            disabled={parsing || !v.title.trim()}
            onClick={async () => {
              setParsing(true);
              try {
                const r = await aiApi.parseText(`${v.title}\n${v.description}`.trim());
                setV((prev) => ({
                  ...prev,
                  title: r.title || prev.title,
                  dueDate: r.dueDate ?? prev.dueDate,
                  priority: (r.priority as Priority) ?? prev.priority,
                }));
              } catch (err) {
                toast.error(err instanceof Error ? err.message : String(err));
              } finally { setParsing(false); }
            }}
            aria-label={t('ai.parseFromTitle')}
            title={t('ai.parseFromTitle')}
          >
            <Sparkles size={16} aria-hidden="true" />
          </button>
          {/* Voice */}
          <button
            type="button"
            className={`px-3 shrink-0 rounded-lg border transition ${listening ? 'bg-red-100 border-red-400 text-red-600 dark:bg-red-900/30' : 'btn-ghost'}`}
            onClick={listening ? undefined : startVoice}
            aria-label={listening ? t('ai.voiceStop') : t('ai.voiceStart')}
            title={listening ? t('ai.voiceStop') : t('ai.voiceStart')}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          {/* Image upload */}
          <button
            type="button"
            className="btn-ghost px-3 shrink-0"
            onClick={() => fileRef.current?.click()}
            disabled={ocrLoading}
            aria-label={t('ai.imageUpload')}
            title={t('ai.imageUpload')}
          >
            <Image size={16} aria-hidden="true" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = ''; }}
          />
        </div>
        {listening && <p className="mt-1 text-xs text-red-500 animate-pulse">{t('ai.voiceListening')}</p>}
        {ocrLoading && <p className="mt-1 text-xs text-gray-500 animate-pulse">{t('ai.imageProcessing')}</p>}
        {voiceSubtasks.length > 0 && (
          <div className="mt-2 rounded-lg border border-brand/30 bg-brand/5 p-2 space-y-1">
            <p className="text-xs font-medium text-brand">{t('ai.voiceSubtasks')}</p>
            <ul className="space-y-0.5">
              {voiceSubtasks.map((s, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="btn-ai text-xs px-2 py-1"
                onClick={() => {
                  if (onBulkImport) {
                    const drafts = [
                      { title: v.title, status: v.status },
                      ...voiceSubtasks.map(s => ({ title: s, status: 'TODO' })),
                    ];
                    onBulkImport(drafts);
                  }
                  setVoiceSubtasks([]);
                }}
              >
                {t('ai.voiceImport', { count: String(voiceSubtasks.length) })}
              </button>
              <button type="button" className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setVoiceSubtasks([])}>
                {t('task.cancel')}
              </button>
            </div>
          </div>
        )}
        {complexHint && !listening && voiceSubtasks.length === 0 && (
          <div className="mt-1 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Sparkles size={12} />
            <span>{t('ai.complexHint')}</span>
            {onSplitRequest && (
              <button type="button" className="underline font-medium" onClick={() => onSplitRequest(v.title, v.description)}>
                {t('ai.complexSplit')}
              </button>
            )}
          </div>
        )}
        {v.title.length > 80 && (
          <details className="long-preview">
            <summary className="cursor-pointer font-medium">{t('task.previewTitle')}</summary>
            <div className="mt-1">{v.title}</div>
          </details>
        )}
      </div>
      <div>
        <label htmlFor={descriptionId} className="label">{t('task.description')}</label>
        <textarea
          id={descriptionId}
          name="description"
          autoComplete="off"
          ref={descriptionRef}
          className="input textarea-auto min-h-[112px]"
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
          maxLength={5000}
          title={v.description}
        />
        {v.description.length > 180 && (
          <details className="long-preview">
            <summary className="cursor-pointer font-medium">{t('task.previewDescription')}</summary>
            <div className="mt-1">{v.description}</div>
          </details>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={statusId} className="label">{t('task.status')}</label>
          <select
            id={statusId}
            name="status"
            className="input"
            value={v.status}
            onChange={(e) => setV({ ...v, status: e.target.value as TaskStatus })}
          >
            <option value="TODO">{t(statusLabelKeys.TODO)}</option>
            <option value="IN_PROGRESS">{t(statusLabelKeys.IN_PROGRESS)}</option>
            <option value="DONE">{t(statusLabelKeys.DONE)}</option>
          </select>
        </div>
        <div>
          <label htmlFor={priorityId} className="label">{t('task.priority')}</label>
          <select
            id={priorityId}
            name="priority"
            className="input"
            value={v.priority}
            onChange={(e) => setV({ ...v, priority: e.target.value as Priority })}
          >
            <option value="LOW">{t(priorityLabelKeys.LOW)}</option>
            <option value="MEDIUM">{t(priorityLabelKeys.MEDIUM)}</option>
            <option value="HIGH">{t(priorityLabelKeys.HIGH)}</option>
            <option value="URGENT">{t(priorityLabelKeys.URGENT)}</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={dueDateId} className="label">{t('task.dueDate')}</label>
        <input
          id={dueDateId}
          name="dueDate"
          type="date"
          autoComplete="off"
          className="input"
          value={v.dueDate}
          onChange={(e) => setV({ ...v, dueDate: e.target.value })}
        />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            {t('task.cancel')}
          </button>
        )}
        <button type="submit" className="btn-primary">
          {submitLabel ?? t('task.save')}
        </button>
      </div>
    </form>
  );
}
