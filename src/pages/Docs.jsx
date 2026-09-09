import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { getSiteModels } from '../api';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Braces,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  FileJson,
  Image,
  KeyRound,
  ListChecks,
  MessageSquare,
  ShieldCheck,
  Terminal,
  Video,
} from 'lucide-react';

const SECTION_LINKS = [
  { id: 'models', labelKey: 'docs.nav.models', icon: ListChecks },
  { id: 'quickstart', labelKey: 'docs.nav.quickstart', icon: Terminal },
  { id: 'text', labelKey: 'docs.nav.text', icon: MessageSquare },
  { id: 'images', labelKey: 'docs.nav.images', icon: Image },
  { id: 'videos', labelKey: 'docs.nav.videos', icon: Video },
  { id: 'endpoints', labelKey: 'docs.nav.endpoints', icon: Braces },
  { id: 'errors', labelKey: 'docs.nav.errors', icon: AlertCircle },
];

const ENDPOINTS = [
  ['POST', '/v1/chat/completions', 'docs.endpoints.chat', 'text'],
  ['POST', '/v1/responses', 'docs.endpoints.responses', 'text'],
  ['POST', '/v1/messages', 'docs.endpoints.anthropic', 'text'],
  ['POST', '/v1/images/generations', 'docs.endpoints.imageGeneration', 'image'],
  ['POST', '/v1/images/generations/async', 'docs.endpoints.imageGenerationAsync', 'image'],
  ['POST', '/v1/images/edits', 'docs.endpoints.imageEdit', 'image'],
  ['POST', '/v1/images/edits/async', 'docs.endpoints.imageEditAsync', 'image'],
  ['POST', '/v1/videos', 'docs.endpoints.videoGeneration', 'video'],
  ['GET', '/v1/videos/{task_id}', 'docs.endpoints.videoTask', 'video'],
  ['GET', '/v1/videos/{task_id}/content', 'docs.endpoints.videoContent', 'video'],
  ['GET', '/v1/tasks/{task_id}', 'docs.endpoints.mediaTask', 'media'],
  ['POST', '/v1/embeddings', 'docs.endpoints.embeddings', 'embedding'],
  ['POST', '/v1/rerank', 'docs.endpoints.rerank', 'rerank'],
  ['POST', '/v1/audio/speech', 'docs.endpoints.speech', 'audio'],
  ['POST', '/v1/audio/transcriptions', 'docs.endpoints.transcription', 'audio'],
  ['GET', '/v1/models', 'docs.endpoints.models', 'always'],
];

const MODEL_GROUPS = [
  ['text', 'docs.models.text'],
  ['image', 'docs.models.image'],
  ['video', 'docs.models.video'],
  ['embedding', 'docs.models.embedding'],
  ['audio', 'docs.models.audio'],
  ['rerank', 'docs.models.rerank'],
];

function normalizeDocModelType(model) {
  const rawCategory = String(model?.category || '').trim().toLowerCase();
  if (rawCategory === 'chat' || rawCategory === 'completion' || rawCategory === 'multimodal') {
    return 'text';
  }
  if (rawCategory === 'image' || rawCategory.includes('image-generation') || rawCategory === 'text-to-image' || rawCategory === 'image-to-image') {
    return 'image';
  }
  if (rawCategory === 'video' || rawCategory.includes('video-generation') || rawCategory === 'text-to-video' || rawCategory === 'image-to-video') {
    return 'video';
  }
  if (rawCategory === 'embedding' || rawCategory === 'embeddings') return 'embedding';
  if (rawCategory === 'audio' || rawCategory === 'speech' || rawCategory.includes('speech-to-') || rawCategory.includes('text-to-speech')) return 'audio';
  if (rawCategory === 'rerank' || rawCategory === 'reranking') return 'rerank';

  const endpointTypes = Array.isArray(model?.supported_endpoint_types)
    ? model.supported_endpoint_types.map((item) => String(item).toLowerCase())
    : [];
  const name = String(model?.model_name || model?.display_name || '').toLowerCase();
  if (endpointTypes.some((item) => item.includes('video')) || /sora|seedance|kling|veo|video/.test(name)) return 'video';
  if (endpointTypes.some((item) => item.includes('image')) || /dall-e|imagen|flux|cogview|image/.test(name)) return 'image';
  if (endpointTypes.some((item) => item.includes('embedding')) || /embed|embedding/.test(name)) return 'embedding';
  if (endpointTypes.some((item) => item.includes('rerank')) || /rerank/.test(name)) return 'rerank';
  if (endpointTypes.some((item) => item.includes('audio')) || /whisper|tts|audio|speech/.test(name)) return 'audio';
  return 'text';
}

const STATUS_ROWS = [
  ['pending', 'docs.async.statusPending', 'docs.async.statusContinue'],
  ['processing', 'docs.async.statusProcessing', 'docs.async.statusContinue'],
  ['completed', 'docs.async.statusCompleted', 'docs.async.statusRead'],
  ['failed', 'docs.async.statusFailed', 'docs.async.statusError'],
];

const ERROR_ROWS = [
  ['400', 'docs.errors.400'],
  ['401', 'docs.errors.401'],
  ['402', 'docs.errors.402'],
  ['429', 'docs.errors.429'],
  ['500 / 502 / 503', 'docs.errors.5xx'],
];

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function CopyButton({ value, label }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyText(value);
      setCopied(true);
      toast.success(t('docs.common.copied'));
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(t('docs.common.copyFailed'));
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label || t('docs.common.copy')}
      aria-label={label || t('docs.common.copy')}
      className="docs-copy-button inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-page-divider text-page-muted transition-colors hover:bg-page-surface-hover hover:text-page"
    >
      {copied ? (
        <Check className="h-4 w-4 text-page-success" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

function CodeBlock({ title, code, language = 'bash' }) {
  return (
    <div className="docs-code-block overflow-hidden rounded-lg border border-page-divider bg-page-inset">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-page-divider px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Code2 className="h-4 w-4 shrink-0 text-page-link" aria-hidden="true" />
          <span className="truncate text-xs font-semibold text-page-label">{title}</span>
          <span className="hidden rounded bg-page-surface px-1.5 py-0.5 font-mono text-[10px] uppercase text-page-muted sm:inline">
            {language}
          </span>
        </div>
        <CopyButton value={code} />
      </div>
      <pre className="max-h-[34rem] overflow-auto p-3 font-mono text-[11px] leading-5 text-page-secondary sm:p-4 sm:text-xs sm:leading-6">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({ id, icon: Icon, eyebrow, title, description, children }) {
  return (
    <section id={id} className="docs-section scroll-mt-24 border-b border-page-divider py-10 last:border-b-0 sm:py-12">
      <div className="docs-section-heading mb-7 flex items-start gap-3">
        <div className="docs-section-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-page-divider bg-page-surface text-page-link">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase text-page-link">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-bold text-page sm:text-2xl">{title}</h2>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-page-secondary">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Callout({ icon: Icon = CheckCircle2, title, children, tone = 'info' }) {
  const tones = {
    info: 'border-page-divider bg-page-surface text-page-link',
    success: 'border-page-divider bg-page-surface text-page-success',
    warning: 'border-page-divider bg-page-surface text-page-warning',
  };

  return (
    <div className={`docs-callout docs-callout--${tone} flex gap-3 rounded-lg border p-4 ${tones[tone] || tones.info}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="text-sm font-semibold text-page">{title}</p>}
        <div className={`${title ? 'mt-1' : ''} text-xs leading-5 text-page-secondary`}>{children}</div>
      </div>
    </div>
  );
}

function EndpointTable({ rows }) {
  const { t } = useTranslation();
  return (
    <div className="docs-table overflow-x-auto rounded-lg border border-page-divider">
      <table className="w-full min-w-[620px] text-left text-xs">
        <thead className="bg-page-surface text-page-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">{t('docs.table.method')}</th>
            <th className="px-4 py-3 font-semibold">{t('docs.table.endpoint')}</th>
            <th className="px-4 py-3 font-semibold">{t('docs.table.description')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-page-divider">
          {rows.map(([method, path, labelKey]) => (
            <tr key={`${method}-${path}`}>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded px-2 py-1 font-mono text-[10px] font-bold ${method === 'GET' ? 'bg-page-success/10 text-page-success' : 'bg-brand-500/10 text-page-link'}`}>
                  {method}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-page-label">{path}</td>
              <td className="px-4 py-3 text-page-secondary">{t(labelKey)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskStatusTable() {
  const { t } = useTranslation();
  return (
    <div className="docs-table overflow-x-auto rounded-lg border border-page-divider">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead className="bg-page-surface text-page-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">status</th>
            <th className="px-4 py-3 font-semibold">{t('docs.table.meaning')}</th>
            <th className="px-4 py-3 font-semibold">{t('docs.table.action')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-page-divider">
          {STATUS_ROWS.map(([status, meaningKey, actionKey]) => (
            <tr key={status}>
              <td className="px-4 py-3 font-mono font-semibold text-page-label">{status}</td>
              <td className="px-4 py-3 text-page-secondary">{t(meaningKey)}</td>
              <td className="px-4 py-3 text-page-secondary">{t(actionKey)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Docs() {
  const { t } = useTranslation();
  const baseUrl = typeof window === 'undefined' ? 'https://your-site.example' : window.location.origin.replace(/\/$/, '');
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState(false);
  const [activeSection, setActiveSection] = useState('models');

  useEffect(() => {
    let active = true;

    getSiteModels({ include_official_channels: true })
      .then((response) => {
        if (!active) return;

        if (response?.data?.success) {
          setModels(
            Array.isArray(response.data.data)
              ? response.data.data.filter((model) => model?.enabled !== false)
              : [],
          );
        } else {
          setModelsError(true);
        }
      })
      .catch(() => {
        if (active) setModelsError(true);
      })
      .finally(() => {
        if (active) setModelsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const modelGroups = useMemo(
    () =>
      MODEL_GROUPS
        .map(([type, labelKey]) => ({
          type,
          labelKey,
          models: models.filter((model) => normalizeDocModelType(model) === type),
        }))
        .filter((group) => group.models.length > 0),
    [models],
  );
  const hasModelType = (type) => modelGroups.some((group) => group.type === type);
  const hasTextModels = hasModelType('text');
  const hasImageModels = hasModelType('image');
  const hasVideoModels = hasModelType('video');
  const docsReady = !modelsLoading && !modelsError;
  const imageEyebrow = String(2 + Number(hasTextModels)).padStart(2, '0');
  const videoEyebrow = String(2 + Number(hasTextModels) + Number(hasImageModels)).padStart(2, '0');
  const endpointsEyebrow = String(2 + Number(hasTextModels) + Number(hasImageModels) + Number(hasVideoModels)).padStart(2, '0');
  const errorsEyebrow = String(Number(endpointsEyebrow) + 1).padStart(2, '0');
  const visibleSectionLinks = SECTION_LINKS.filter(({ id }) => {
    if (id === 'text') return docsReady && hasTextModels;
    if (id === 'images') return docsReady && hasImageModels;
    if (id === 'videos') return docsReady && hasVideoModels;
    return true;
  });
  const sectionIds = visibleSectionLinks.map(({ id }) => id).join('|');
  const endpointRows = docsReady
    ? ENDPOINTS.filter(([, , , type]) =>
        type === 'always' || (type === 'media' ? hasImageModels || hasVideoModels : hasModelType(type)),
      )
    : [];
  const exampleModelNames = useMemo(() => {
    const findName = (type, fallback) => {
      const model = models.find((candidate) => normalizeDocModelType(candidate) === type);
      return model?.model_name || model?.display_name || fallback;
    };
    return {
      text: findName('text', 'your-model-name'),
      image: findName('image', 'your-image-model'),
      video: findName('video', 'your-video-model'),
    };
  }, [models]);

  const snippets = useMemo(() => {
    const auth = 'Authorization: Bearer $API_KEY';
    return {
      env: `export API_BASE_URL="${baseUrl}"
export API_KEY="sk-your-api-key"`,
      chat: `curl "$API_BASE_URL/v1/chat/completions" \\
  -H "${auth}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${exampleModelNames.text}",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "stream": true
  }'`,
      python: `from openai import OpenAI

client = OpenAI(
    api_key="sk-your-api-key",
    base_url="${baseUrl}/v1",
)

response = client.chat.completions.create(
    model="${exampleModelNames.text}",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)`,
      node: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "sk-your-api-key",
  baseURL: "${baseUrl}/v1",
});

const response = await client.chat.completions.create({
  model: "${exampleModelNames.text}",
  messages: [{ role: "user", content: "Hello" }],
});
console.log(response.choices[0].message.content);`,
      imageSubmit: `curl -X POST "$API_BASE_URL/v1/images/generations/async" \\
  -H "${auth}" \\
  -H "Idempotency-Key: image-request-001" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${exampleModelNames.image}",
    "prompt": "A product photo on a clean studio background",
    "size": "1024x1024",
    "n": 1
  }'`,
      imageEdit: `curl -X POST "$API_BASE_URL/v1/images/edits/async" \\
  -H "${auth}" \\
  -H "Idempotency-Key: image-edit-request-001" \\
  -F "model=${exampleModelNames.image}" \\
  -F "prompt=Replace the background with a city street" \\
  -F "image=@input.png"`,
      taskPoll: `curl "$API_BASE_URL/v1/tasks/TASK_ID" \\
  -H "${auth}"`,
      acceptedTask: `{
  "id": "task_xxxxxxxxx",
  "object": "media.task",
  "type": "image",
  "action": "generation",
  "status": "pending",
  "progress": 0,
  "model": "${exampleModelNames.image}",
  "created_at": 1787295996,
  "result": {"images": [], "videos": []},
  "usage": {"quota": 2206},
  "error": null
}`,
      completedImage: `{
  "id": "task_xxxxxxxxx",
  "object": "media.task",
  "type": "image",
  "status": "completed",
  "progress": 100,
  "result": {
    "images": [
      {"index": 0, "url": "https://.../image.png"}
    ],
    "videos": []
  },
  "error": null
}`,
      videoSubmit: `curl -X POST "$API_BASE_URL/v1/videos" \\
  -H "${auth}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${exampleModelNames.video}",
    "prompt": "A cinematic tracking shot through a rainy neon street",
    "seconds": "5",
    "size": "1280x720"
  }'`,
      videoReference: `curl -X POST "$API_BASE_URL/v1/videos" \\
  -H "${auth}" \\
  -F "model=${exampleModelNames.video}" \\
  -F "prompt=Animate this scene with a slow camera push" \\
  -F "seconds=5" \\
  -F "input_reference=@first-frame.png"`,
      completedVideo: `{
  "id": "task_xxxxxxxxx",
  "object": "media.task",
  "type": "video",
  "status": "completed",
  "progress": 100,
  "result": {
    "images": [],
    "videos": [
      {"index": 0, "url": "${baseUrl}/v1/videos/TASK_ID/content"}
    ]
  },
  "error": null
}`,
      videoDownload: `curl -L "$API_BASE_URL/v1/videos/TASK_ID/content" \\
  -H "${auth}" \\
  -o output.mp4`,
      polling: `const terminal = new Set(["completed", "failed"]);

while (true) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const response = await fetch(
    "${baseUrl}/v1/tasks/" + taskId,
    { headers: { Authorization: "Bearer " + apiKey } },
  );
  const task = await response.json();

  if (terminal.has(task.status)) {
    if (task.status === "failed") throw new Error(task.error?.message);
    return task.result;
  }
}`,
      error: `{
  "error": {
    "type": "invalid_request_error",
    "code": "invalid_request",
    "message": "Request parameter validation failed"
  }
}`,
    };
  }, [baseUrl, exampleModelNames]);

  const [sdkTab, setSdkTab] = useState('curl');
  const sdkExamples = {
    curl: { title: 'cURL', code: snippets.chat, language: 'bash' },
    python: { title: 'Python · OpenAI SDK', code: snippets.python, language: 'python' },
    node: { title: 'Node.js · OpenAI SDK', code: snippets.node, language: 'javascript' },
  };
  const activeExample = sdkExamples[sdkTab];

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return undefined;

    const ids = sectionIds.split('|').filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.1, 0.5] },
    );

    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <div className="docs-page min-h-screen bg-[var(--page-bg)] text-page">
      <div className="docs-hero border-b border-page-divider">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="max-w-3xl">
            <div className="docs-kicker mb-4 inline-flex items-center gap-2 rounded-md border border-page-divider bg-page-surface px-2.5 py-1 text-xs font-semibold text-page-link">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              {t('docs.badge')}
            </div>
            <h1 className="docs-title text-3xl font-bold tracking-normal text-page sm:text-4xl">{t('docs.title')}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-page-secondary sm:text-base sm:leading-7">
              {t('docs.subtitle')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/tokens" className="docs-primary-action inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {t('docs.createKey')}
              </Link>
              <Link to="/pricing" className="docs-secondary-action inline-flex items-center gap-2 rounded-lg border border-page-divider bg-page-surface px-4 py-2.5 text-sm font-semibold text-page transition-colors hover:bg-page-surface-hover">
                {t('docs.viewModels')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <div className="docs-meta-card rounded-lg border border-page-divider bg-page-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase text-page-muted">{t('docs.baseUrl')}</p>
                  <code className="mt-1 block truncate text-sm font-semibold text-page-label">{baseUrl}</code>
                </div>
                <CopyButton value={baseUrl} label={t('docs.copyBaseUrl')} />
              </div>
            </div>
            <div className="docs-meta-card rounded-lg border border-page-divider bg-page-surface p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-page-success" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase text-page-muted">{t('docs.authentication')}</p>
                  <code className="mt-1 block truncate text-sm font-semibold text-page-label">Authorization: Bearer sk-...</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="docs-content mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-12">
        <aside className="docs-sidebar hidden lg:block">
          <nav aria-label={t('docs.nav.label')} className="docs-sidebar-panel sticky top-24 my-10 rounded-xl border border-page-divider bg-page-surface p-3">
            <p className="mb-3 px-3 text-[11px] font-bold uppercase text-page-muted">{t('docs.onThisPage')}</p>
            <div className="space-y-1">
              {visibleSectionLinks.map(({ id, labelKey, icon: Icon }) => (
                <a key={id} href={`#${id}`} aria-current={activeSection === id ? 'page' : undefined} className={`docs-sidebar-link flex items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm font-medium text-page-secondary transition-colors hover:bg-page-surface hover:text-page ${activeSection === id ? 'bg-page-surface text-page-link' : ''}`}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t(labelKey)}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="docs-mobile-nav -mx-4 overflow-x-auto border-b border-page-divider px-4 py-3 sm:-mx-6 sm:px-6 lg:hidden">
            <nav aria-label={t('docs.nav.label')} className="flex min-w-max gap-2">
              {visibleSectionLinks.map(({ id, labelKey }) => (
                <a key={id} href={`#${id}`} aria-current={activeSection === id ? 'page' : undefined} className={`docs-mobile-link rounded-md border border-page-divider bg-page-surface px-3 py-2 text-xs font-semibold text-page-secondary ${activeSection === id ? 'border-page-link text-page-link' : ''}`}>
                  {t(labelKey)}
                </a>
              ))}
            </nav>
          </div>

          <Section
            id="models"
            icon={ListChecks}
            eyebrow="00"
            title={t('docs.models.title')}
            description={t('docs.models.description')}
          >
            {modelsLoading && (
              <Callout title={t('docs.models.loading')} icon={Clock3}>
                {t('docs.models.onlyListed')}
              </Callout>
            )}
            {modelsError && (
              <Callout title={t('docs.models.loadFailed')} icon={AlertCircle} tone="warning">
                {t('docs.models.notListed')}
              </Callout>
            )}
            {docsReady && modelGroups.length === 0 && (
              <Callout title={t('docs.models.empty')} icon={AlertCircle} tone="warning">
                {t('docs.models.notListed')}
              </Callout>
            )}
            {docsReady && modelGroups.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {modelGroups.map((group) => (
                  <div key={group.type} className="docs-panel-card rounded-lg border border-page-divider bg-page-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-page">{t(group.labelKey)}</h3>
                      <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-page-link">
                        {t('docs.models.availableCount', { count: group.models.length })}
                      </span>
                    </div>
                    <ul className="docs-model-list mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                      {group.models.map((model) => (
                        <li key={`${group.type}-${model.model_name || model.display_name || 'model'}`} className="truncate font-mono text-xs text-page-secondary" title={model.model_name || model.display_name}>
                          {model.model_name || model.display_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            id="quickstart"
            icon={Terminal}
            eyebrow="01"
            title={t('docs.quickstart.title')}
            description={t('docs.quickstart.description')}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['1', 'docs.quickstart.step1Title', 'docs.quickstart.step1Desc'],
                ['2', 'docs.quickstart.step2Title', 'docs.quickstart.step2Desc'],
                ['3', 'docs.quickstart.step3Title', 'docs.quickstart.step3Desc'],
              ].map(([number, titleKey, descKey]) => (
                <div key={number} className="docs-panel-card rounded-lg border border-page-divider bg-page-surface p-4">
                  <span className="font-mono text-xs font-bold text-page-link">{number.padStart(2, '0')}</span>
                  <h3 className="mt-3 text-sm font-semibold text-page">{t(titleKey)}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-page-secondary">{t(descKey)}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <CodeBlock title={t('docs.quickstart.envTitle')} code={snippets.env} />
            </div>
            <Callout title={t('docs.quickstart.authTitle')} icon={KeyRound}>
              {t('docs.quickstart.authDesc')}
            </Callout>
          </Section>

          {docsReady && hasTextModels && <Section
            id="text"
            icon={MessageSquare}
            eyebrow="02"
            title={t('docs.text.title')}
            description={t('docs.text.description')}
          >
            <div className="mb-4 inline-flex rounded-lg border border-page-divider bg-page-surface p-1">
              {Object.entries(sdkExamples).map(([key, example]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSdkTab(key)}
                  aria-pressed={sdkTab === key}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${sdkTab === key ? 'bg-brand-600 text-white' : 'text-page-secondary hover:text-page'}`}
                >
                  {example.title.split(' · ')[0]}
                </button>
              ))}
            </div>
            <CodeBlock title={activeExample.title} code={activeExample.code} language={activeExample.language} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Callout title={t('docs.text.streamTitle')} icon={Clock3}>
                {t('docs.text.streamDesc')}
              </Callout>
              <Callout title={t('docs.text.sdkTitle')} icon={Braces}>
                {t('docs.text.sdkDesc')}
              </Callout>
            </div>
          </Section>}

          {docsReady && hasImageModels && <Section
            id="images"
            icon={Image}
            eyebrow={imageEyebrow}
            title={t('docs.images.title')}
            description={t('docs.images.description')}
          >
            <Callout title={t('docs.images.asyncTitle')} icon={Clock3} tone="success">
              {t('docs.images.asyncDesc')}
            </Callout>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <CodeBlock title={t('docs.images.submitTitle')} code={snippets.imageSubmit} />
              <CodeBlock title={t('docs.images.acceptedTitle')} code={snippets.acceptedTask} language="json" />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <CodeBlock title={t('docs.images.pollTitle')} code={snippets.taskPoll} />
              <CodeBlock title={t('docs.images.completedTitle')} code={snippets.completedImage} language="json" />
            </div>
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-page">{t('docs.images.editTitle')}</h3>
              <CodeBlock title={t('docs.images.editExampleTitle')} code={snippets.imageEdit} />
            </div>
            <div className="mt-6">
              <TaskStatusTable />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Callout title={t('docs.images.syncTitle')} icon={ArrowRight}>
                {t('docs.images.syncDesc')}
              </Callout>
              <Callout title={t('docs.images.resultTitle')} icon={FileJson}>
                {t('docs.images.resultDesc')}
              </Callout>
              <Callout title={t('docs.images.limitsTitle')} icon={ShieldCheck} tone="warning">
                {t('docs.images.limitsDesc')}
              </Callout>
            </div>
          </Section>}

          {docsReady && hasVideoModels && <Section
            id="videos"
            icon={Video}
            eyebrow={videoEyebrow}
            title={t('docs.videos.title')}
            description={t('docs.videos.description')}
          >
            <Callout title={t('docs.videos.noAsyncTitle')} icon={CheckCircle2} tone="success">
              {t('docs.videos.noAsyncDesc')}
            </Callout>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <CodeBlock title={t('docs.videos.submitTitle')} code={snippets.videoSubmit} />
              <CodeBlock title={t('docs.videos.referenceTitle')} code={snippets.videoReference} />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <CodeBlock title={t('docs.videos.pollTitle')} code={snippets.taskPoll} />
              <CodeBlock title={t('docs.videos.completedTitle')} code={snippets.completedVideo} language="json" />
            </div>
            <div className="mt-4">
              <CodeBlock title={t('docs.videos.downloadTitle')} code={snippets.videoDownload} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Callout title={t('docs.videos.compatTitle')} icon={Braces}>
                {t('docs.videos.compatDesc')}
              </Callout>
              <Callout title={t('docs.videos.paramsTitle')} icon={ListChecks} tone="warning">
                {t('docs.videos.paramsDesc')}
              </Callout>
            </div>
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-page">{t('docs.async.pollingTitle')}</h3>
              <CodeBlock title="JavaScript" code={snippets.polling} language="javascript" />
              <p className="mt-3 text-xs leading-5 text-page-secondary">{t('docs.async.pollingDesc')}</p>
            </div>
          </Section>}

          <Section
            id="endpoints"
            icon={Braces}
            eyebrow={endpointsEyebrow}
            title={t('docs.endpoints.title')}
            description={t('docs.endpoints.description')}
          >
            {!docsReady && (
              <Callout
                title={modelsLoading ? t('docs.models.loading') : t('docs.models.loadFailed')}
                icon={modelsLoading ? Clock3 : AlertCircle}
                tone={modelsLoading ? 'info' : 'warning'}
              >
                {modelsLoading ? t('docs.models.onlyListed') : t('docs.models.notListed')}
              </Callout>
            )}
            {docsReady && (
              <>
                <EndpointTable rows={endpointRows} />
                <Callout title={t('docs.endpoints.protocolTitle')} icon={FileJson}>
                  {t('docs.endpoints.protocolDesc')}
                </Callout>
              </>
            )}
          </Section>

          <Section
            id="errors"
            icon={AlertCircle}
            eyebrow={errorsEyebrow}
            title={t('docs.errors.title')}
            description={t('docs.errors.description')}
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="overflow-x-auto rounded-lg border border-page-divider">
                <table className="w-full min-w-[430px] text-left text-xs">
                  <thead className="bg-page-surface text-page-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">HTTP</th>
                      <th className="px-4 py-3 font-semibold">{t('docs.table.description')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-page-divider">
                    {ERROR_ROWS.map(([status, labelKey]) => (
                      <tr key={status}>
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-page-label">{status}</td>
                        <td className="px-4 py-3 text-page-secondary">{t(labelKey)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <CodeBlock title={t('docs.errors.responseTitle')} code={snippets.error} language="json" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Callout title={t('docs.errors.retryTitle')} icon={Clock3}>
                {t('docs.errors.retryDesc')}
              </Callout>
              <Callout title={t('docs.errors.securityTitle')} icon={ShieldCheck} tone="warning">
                {t('docs.errors.securityDesc')}
              </Callout>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
