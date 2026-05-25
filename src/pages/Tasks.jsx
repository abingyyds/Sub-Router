import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Image, Loader2, RotateCcw, Search, Video, X } from 'lucide-react';
import { getUserMjTasks, getUserTasks } from '../api';
import LogSubnav from '../components/LogSubnav';

const PAGE_SIZE = 20;

const formatDateTimeLocal = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseDateTimeLocalMs = (value) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatUnix = (value) => {
  if (!value) return '-';
  return formatDate(new Date(Number(value) * 1000));
};

const formatMs = (value) => {
  if (!value) return '-';
  return formatDate(new Date(Number(value)));
};

const formatDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatDuration = (start, finish, unit) => {
  if (!start || !finish) return '-';
  const seconds = unit === 'ms'
    ? Math.max(0, Math.round((Number(finish) - Number(start)) / 1000))
    : Math.max(0, Number(finish) - Number(start));
  return `${seconds}s`;
};

const statusLabel = (status, t) => {
  const labels = {
    SUCCESS: t('tasks.statusSuccess'),
    NOT_START: t('tasks.statusNotStart'),
    SUBMITTED: t('tasks.statusSubmitted'),
    QUEUED: t('tasks.statusQueued'),
    IN_PROGRESS: t('tasks.statusInProgress'),
    FAILURE: t('tasks.statusFailure'),
    UNKNOWN: t('tasks.statusUnknown'),
  };
  return labels[status] || status || t('tasks.statusUnknown');
};

const taskTypeLabel = (action, mode, t) => {
  const videoLabels = {
    generate: t('tasks.videoImageToVideo'),
    textGenerate: t('tasks.videoTextToVideo'),
    firstTailGenerate: t('tasks.videoFirstTail'),
    referenceGenerate: t('tasks.videoReference'),
    remixGenerate: t('tasks.videoRemix'),
    MUSIC: t('tasks.music'),
    LYRICS: t('tasks.lyrics'),
  };
  const imageLabels = {
    IMAGINE: t('tasks.imageImagine'),
    UPSCALE: t('tasks.imageUpscale'),
    VARIATION: t('tasks.imageVariation'),
    HIGH_VARIATION: t('tasks.imageHighVariation'),
    LOW_VARIATION: t('tasks.imageLowVariation'),
    PAN: t('tasks.imagePan'),
    REROLL: t('tasks.imageReroll'),
    DESCRIBE: t('tasks.imageDescribe'),
    BLEND: t('tasks.imageBlend'),
    UPLOAD: t('tasks.imageUpload'),
    SHORTEN: t('tasks.imageShorten'),
    INPAINT: t('tasks.imageInpaint'),
    ZOOM: t('tasks.imageZoom'),
    CUSTOM_ZOOM: t('tasks.imageCustomZoom'),
    MODAL: t('tasks.imageModal'),
    SWAP_FACE: t('tasks.imageSwapFace'),
    VIDEO: t('tasks.imageVideo'),
    EDITS: t('tasks.imageEdit'),
  };
  const labels = mode === 'image' ? imageLabels : videoLabels;
  return labels[action] || action || t('tasks.unknown');
};

const isUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  return /^(https?:\/\/|\/|data:)/.test(value.trim());
};

const firstVideoUrl = (value) => {
  if (isUrl(value)) return value.trim();
  if (!value || typeof value !== 'string') return '';
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const match = parsed.find((item) => isUrl(item));
      return match || '';
    }
  } catch (e) {
    return '';
  }
  return '';
};

const getImageTaskResult = (item) => {
  if (item.image_url) return { type: 'image', url: item.image_url };
  const videoUrl = firstVideoUrl(item.video_url) || firstVideoUrl(item.video_urls);
  if (videoUrl) return { type: 'video', url: videoUrl };
  return null;
};

export default function Tasks() {
  const { t } = useTranslation();
  const [mode, setMode] = useState('video');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});
  const [preview, setPreview] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const params = useMemo(() => {
    const startMs = parseDateTimeLocalMs(appliedFilters.startTime);
    const endMs = parseDateTimeLocalMs(appliedFilters.endTime);
    const base = { p: page, page_size: PAGE_SIZE };
    if (mode === 'image') {
      if (appliedFilters.taskId) base.mj_id = appliedFilters.taskId;
      if (startMs) base.start_timestamp = String(startMs);
      if (endMs) base.end_timestamp = String(endMs);
      return base;
    }
    if (appliedFilters.taskId) base.task_id = appliedFilters.taskId;
    if (startMs) base.start_timestamp = Math.floor(startMs / 1000);
    if (endMs) base.end_timestamp = Math.floor(endMs / 1000);
    return base;
  }, [appliedFilters, mode, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = mode === 'image' ? await getUserMjTasks(params) : await getUserTasks(params);
      if (res.data.success) {
        const payload = res.data.data || {};
        setItems(payload.items || []);
        setTotal(payload.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, params]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({
      taskId: taskId.trim(),
      startTime,
      endTime,
    });
  };

  const resetFilters = () => {
    setTaskId('');
    setStartTime('');
    setEndTime('');
    setPage(1);
    setAppliedFilters({});
  };

  const setQuickRange = (days) => {
    const now = new Date();
    const start = new Date(now);
    if (days === 0) {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - days);
    }
    setStartTime(formatDateTimeLocal(start));
    setEndTime(formatDateTimeLocal(now));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setPage(1);
    setItems([]);
    setTotal(0);
  };

  const renderProgress = (progress, status) => {
    const percent = Number.parseInt(String(progress || '0').replace('%', ''), 10);
    const value = Number.isNaN(percent) ? 0 : Math.max(0, Math.min(100, percent));
    return (
      <div className="flex min-w-[140px] items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-page-inset">
          <div
            className={`h-full rounded-full ${status === 'FAILURE' ? 'bg-amber-500' : 'bg-brand-600'}`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-xs text-page-muted">{progress || `${value}%`}</span>
      </div>
    );
  };

  const renderVideoRows = () => items.map((item) => {
    const resultUrl = item.result_url || (isUrl(item.fail_reason) ? item.fail_reason : '');
    return (
      <tr key={`video-${item.id || item.task_id}`} className="border-b border-page-divider last:border-0">
        <td className="px-4 py-3 whitespace-nowrap text-page-secondary">{formatUnix(item.submit_time)}</td>
        <td className="px-4 py-3 whitespace-nowrap">{formatDuration(item.submit_time, item.finish_time, 's')}</td>
        <td className="px-4 py-3 whitespace-nowrap">{taskTypeLabel(item.action, 'video', t)}</td>
        <td className="px-4 py-3 font-mono text-xs">{item.task_id || '-'}</td>
        <td className="px-4 py-3 whitespace-nowrap">{statusLabel(item.status, t)}</td>
        <td className="px-4 py-3">{renderProgress(item.progress, item.status)}</td>
        <td className="px-4 py-3">
          {resultUrl && item.status === 'SUCCESS' ? (
            <button type="button" className="rounded-md border border-page-divider px-2.5 py-1 text-xs hover:bg-page-surface-hover" onClick={() => setPreview({ type: 'video', url: resultUrl })}>
              {t('tasks.previewVideo')}
            </button>
          ) : item.fail_reason ? (
            <button type="button" className="max-w-[180px] truncate text-left text-xs text-page-danger" title={item.fail_reason} onClick={() => setPreview({ type: 'text', text: item.fail_reason })}>
              {item.fail_reason}
            </button>
          ) : '-'}
        </td>
      </tr>
    );
  });

  const renderImageRows = () => items.map((item) => {
    const result = getImageTaskResult(item);
    return (
      <tr key={`image-${item.id || item.mj_id}`} className="border-b border-page-divider last:border-0">
        <td className="px-4 py-3 whitespace-nowrap text-page-secondary">{formatMs(item.submit_time)}</td>
        <td className="px-4 py-3 whitespace-nowrap">{formatDuration(item.submit_time, item.finish_time, 'ms')}</td>
        <td className="px-4 py-3 whitespace-nowrap">{taskTypeLabel(item.action, 'image', t)}</td>
        <td className="px-4 py-3 font-mono text-xs">{item.mj_id || '-'}</td>
        <td className="px-4 py-3 whitespace-nowrap">{statusLabel(item.status, t)}</td>
        <td className="px-4 py-3">{renderProgress(item.progress, item.status)}</td>
        <td className="px-4 py-3">
          {result ? (
            <button type="button" className="rounded-md border border-page-divider px-2.5 py-1 text-xs hover:bg-page-surface-hover" onClick={() => setPreview(result)}>
              {result.type === 'video' ? t('tasks.previewVideo') : t('tasks.previewImage')}
            </button>
          ) : item.fail_reason ? (
            <button type="button" className="max-w-[180px] truncate text-left text-xs text-page-danger" title={item.fail_reason} onClick={() => setPreview({ type: 'text', text: item.fail_reason })}>
              {item.fail_reason}
            </button>
          ) : '-'}
        </td>
        <td className="max-w-[220px] truncate px-4 py-3 text-xs text-page-secondary" title={item.prompt || item.prompt_en || ''}>
          {item.prompt || item.prompt_en || '-'}
        </td>
      </tr>
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="mb-1 text-2xl font-heading font-bold text-page">{t('tasks.title')}</h1>
        <p className="text-sm text-page-secondary">{t('tasks.subtitle')}</p>
      </div>
      <LogSubnav active="tasks" />

      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-full bg-page-surface p-1">
          {[
            { key: 'video', label: t('tasks.videoTasks'), icon: Video },
            { key: 'image', label: t('tasks.imageTasks'), icon: Image },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => switchMode(item.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === item.key
                    ? 'bg-brand-600 text-white'
                    : 'text-page-muted hover:bg-page-surface-hover hover:text-page'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <form className="glass mb-6 rounded-2xl p-4" onSubmit={applyFilters}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input w-full" title={t('tasks.startTime')} />
          <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input w-full" title={t('tasks.endTime')} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-page-muted" />
            <input value={taskId} onChange={(e) => setTaskId(e.target.value)} className="input w-full pl-10" placeholder={mode === 'image' ? t('tasks.filterImageTask') : t('tasks.filterVideoTask')} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setQuickRange(0)} className="btn-secondary flex-1 px-3">{t('logs.today')}</button>
            <button type="button" onClick={() => setQuickRange(7)} className="btn-secondary flex-1 px-3">{t('logs.last7Days')}</button>
            <button type="button" onClick={() => setQuickRange(30)} className="btn-secondary flex-1 px-3">{t('logs.last30Days')}</button>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={resetFilters} className="btn-secondary inline-flex items-center gap-2 px-4">
            <RotateCcw className="h-4 w-4" />
            {t('logs.clearFilter')}
          </button>
          <button type="submit" className="btn-primary inline-flex items-center gap-2 px-4" disabled={loading}>
            <Search className="h-4 w-4" />
            {t('logs.search')}
          </button>
        </div>
      </form>

      <div className="glass overflow-hidden rounded-2xl">
        {loading && page === 1 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-page-muted" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-page-muted">
            {mode === 'image' ? <Image className="mb-3 h-8 w-8" /> : <Video className="mb-3 h-8 w-8" />}
            <p className="text-sm">{t('tasks.noTasks')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-page-divider text-left text-page-muted">
                  <th className="px-4 py-3 font-medium">{t('tasks.submitTime')}</th>
                  <th className="px-4 py-3 font-medium">{t('tasks.duration')}</th>
                  <th className="px-4 py-3 font-medium">{t('tasks.type')}</th>
                  <th className="px-4 py-3 font-medium">{t('tasks.taskId')}</th>
                  <th className="px-4 py-3 font-medium">{t('tasks.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('tasks.progress')}</th>
                  <th className="px-4 py-3 font-medium">{t('tasks.result')}</th>
                  {mode === 'image' && <th className="px-4 py-3 font-medium">Prompt</th>}
                </tr>
              </thead>
              <tbody>{mode === 'image' ? renderImageRows() : renderVideoRows()}</tbody>
            </table>
          </div>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-page-muted">
            {t('logs.showing', {
              from: (page - 1) * PAGE_SIZE + 1,
              to: Math.min(page * PAGE_SIZE, total),
              total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="btn-secondary px-3 disabled:opacity-40">
              {t('logs.prev')}
            </button>
            <span className="text-sm text-page-muted">{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="btn-secondary px-3 disabled:opacity-40">
              {t('logs.next')}
            </button>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)}>
          <div className="relative max-h-[90vh] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-2 text-slate-900 shadow-lg" onClick={() => setPreview(null)}>
              <X className="h-4 w-4" />
            </button>
            {preview.type === 'video' && (
              <div className="rounded-2xl bg-black p-2 shadow-2xl">
                <video src={preview.url} controls autoPlay className="max-h-[82vh] max-w-[88vw] rounded-xl" />
                <a href={preview.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-white/80 hover:text-white">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('tasks.openNewTab')}
                </a>
              </div>
            )}
            {preview.type === 'image' && (
              <img src={preview.url} alt={t('tasks.previewImage')} className="max-h-[88vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" onClick={() => window.open(preview.url, '_blank')} />
            )}
            {preview.type === 'text' && (
              <div className="max-h-[70vh] w-[min(760px,90vw)] overflow-auto rounded-2xl bg-white p-5 text-sm text-slate-800 shadow-2xl">
                <pre className="whitespace-pre-wrap break-words">{preview.text}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
