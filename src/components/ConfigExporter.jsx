import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { getTokenSupportedModels } from '../api';
import { useSite } from '../context/SiteContext';
import {
  CCSWITCH_PRIMARY_DOWNLOAD,
  CCSWITCH_REPO_URL,
} from '../constants/downloads';

const TOOLS = [
  { id: 'claudecode', name: 'Claude Code', path: '~/.claude/settings.json' },
  { id: 'hermes', name: 'Hermes', path: 'hermes-subrouter.sh' },
  { id: 'openclaw', name: 'OpenClaw', path: '~/.openclaw/openclaw.json' },
  {
    id: 'opencode',
    name: 'OpenCode',
    path: '~/.config/opencode/opencode.json',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    path: 'Settings -> Models -> OpenAI API Key',
  },
  { id: 'curl', name: 'cURL', path: 'Terminal' },
  { id: 'python', name: 'Python SDK', path: 'main.py' },
  { id: 'anthropic', name: 'Anthropic SDK', path: 'main.py' },
];

const CCSWITCH_APPS = [
  { id: 'codex', name: 'Codex', endpointType: 'openai' },
  { id: 'claude', name: 'Claude Code', endpointType: 'anthropic' },
  { id: 'gemini', name: 'Gemini CLI', endpointType: 'gemini' },
  { id: 'opencode', name: 'OpenCode', endpointType: 'openai' },
  { id: 'openclaw', name: 'OpenClaw', endpointType: 'openclaw' },
  { id: 'hermes', name: 'Hermes', endpointType: 'hermes' },
];

const API_ENDPOINTS = [
  {
    id: 'overseas-direct',
    url: 'https://aiapi.up.railway.app',
    nameKey: 'config.apiEndpointOverseasDirectName',
    descKey: 'config.apiEndpointOverseasDirectDesc',
  },
  {
    id: 'overseas-cdn',
    url: 'https://ai.orbitlink.me',
    nameKey: 'config.apiEndpointOverseasCdnName',
    descKey: 'config.apiEndpointOverseasCdnDesc',
  },
];

function ThemedSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  renderValue,
  renderOption,
  emptyLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectedOption = options.find((option) => option.value === value);
  const displayLabel = selectedOption
    ? renderValue
      ? renderValue(selectedOption)
      : selectedOption.label
    : placeholder;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="input input-solid flex items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span
          className={`block truncate ${
            selectedOption ? 'text-page' : 'text-page-muted'
          }`}
        >
          {displayLabel}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-page-muted transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="select-panel absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl">
          <div className="max-h-72 overflow-y-auto p-1.5" role="listbox">
            {options.length > 0 ? (
              options.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? 'bg-brand-500/15 text-page'
                        : 'text-page-secondary hover:bg-page-surface-hover hover:text-page'
                    }`}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    role="option"
                    aria-selected={selected}
                  >
                    <span className="min-w-0 flex-1">
                      {renderOption ? renderOption(option) : option.label}
                    </span>
                    {selected && (
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-brand-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-page-muted">
                {emptyLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ConfigExporter = ({ tokens = [] }) => {
  const { t } = useTranslation();
  const { site } = useSite();
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedTool, setSelectedTool] = useState('claudecode');
  const [selectedCCSwitchApp, setSelectedCCSwitchApp] = useState('codex');
  const [selectedEndpointId, setSelectedEndpointId] = useState('overseas-direct');
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [launchingCCSwitch, setLaunchingCCSwitch] = useState(false);
  const [showCCSwitchDownload, setShowCCSwitchDownload] = useState(false);
  const ccSwitchLaunchFallbackMs = 4500;

  const serverAddress = window.location.origin;
  const selectedEndpoint = useMemo(
    () =>
      API_ENDPOINTS.find((endpoint) => endpoint.id === selectedEndpointId) ||
      API_ENDPOINTS[0],
    [selectedEndpointId],
  );
  const apiServerAddress = selectedEndpoint.url;

  const selectedToken = useMemo(
    () => tokens.find((token) => token.id === selectedTokenId) || null,
    [tokens, selectedTokenId],
  );

  const selectedToolMeta = useMemo(
    () => TOOLS.find((tool) => tool.id === selectedTool) || TOOLS[0],
    [selectedTool],
  );
  const tokenOptions = useMemo(
    () =>
      tokens.map((token) => ({
        value: token.id,
        label: `${token.name} (sk-${token.key.substring(0, 16)}...)`,
        token,
      })),
    [tokens],
  );
  const modelOptions = useMemo(
    () =>
      availableModels.map((model) => ({
        value: model,
        label: model,
      })),
    [availableModels],
  );

  useEffect(() => {
    if (tokens.length === 0) {
      setSelectedTokenId(null);
      setAvailableModels([]);
      setSelectedModel('');
      return;
    }

    const stillExists = tokens.some((token) => token.id === selectedTokenId);
    if (stillExists) return;

    const preferred = tokens.find((token) => token.status === 1) || tokens[0];
    setSelectedTokenId(preferred.id);
  }, [tokens, selectedTokenId]);

  useEffect(() => {
    if (!selectedToken?.id) {
      setAvailableModels([]);
      setSelectedModel('');
      return;
    }

    let cancelled = false;
    const loadModels = async () => {
      setLoadingModels(true);
      setModelsError(false);
      try {
        const res = await getTokenSupportedModels(selectedToken.id);
        if (cancelled) return;

        if (res.data.success) {
          const models = res.data.data?.models || [];
          setAvailableModels(models);
          setSelectedModel((prev) =>
            prev && models.includes(prev) ? prev : models[0] || '',
          );
        } else {
          setAvailableModels([]);
          setSelectedModel('');
          setModelsError(true);
        }
      } catch (e) {
        if (cancelled) return;
        setAvailableModels([]);
        setSelectedModel('');
        setModelsError(true);
      }
      if (!cancelled) {
        setLoadingModels(false);
      }
    };

    loadModels();
    return () => {
      cancelled = true;
    };
  }, [selectedToken?.id]);

  const getModelConnectionPreset = (modelName = '') => {
    const lower = modelName.toLowerCase();
    if (lower.includes('claude')) {
      return {
        family: 'anthropic',
        baseUrl: apiServerAddress,
        openclawApi: 'anthropic-messages',
        openclawProviderId: 'subrouter-anthropic',
        opencodeProviderId: 'anthropic',
      };
    }
    return {
      family: 'openai',
      baseUrl: `${apiServerAddress}/v1`,
      openclawApi: 'openai-completions',
      openclawProviderId: 'openai',
      opencodeProviderId: 'openai',
    };
  };

  const getCCSwitchEndpoint = () => {
    const app = CCSWITCH_APPS.find((item) => item.id === selectedCCSwitchApp);
    if (app?.endpointType === 'anthropic') {
      return apiServerAddress;
    }
    if (app?.endpointType === 'gemini') {
      return `${apiServerAddress}/v1beta`;
    }
    return `${apiServerAddress}/v1`;
  };

  const encodeBase64Utf8 = (value) => {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  };

  const sanitizeProviderId = (name = '') => {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');
    return sanitized || 'subrouter';
  };

  const buildCCSwitchConfigPayload = ({
    appId,
    providerName,
    endpoint,
    apiKey,
    modelName,
  }) => {
    switch (appId) {
      case 'claude':
        return {
          env: {
            ANTHROPIC_AUTH_TOKEN: apiKey,
            ANTHROPIC_BASE_URL: endpoint,
            ANTHROPIC_MODEL: modelName,
            ANTHROPIC_DEFAULT_HAIKU_MODEL: modelName,
            ANTHROPIC_DEFAULT_SONNET_MODEL: modelName,
            ANTHROPIC_DEFAULT_OPUS_MODEL: modelName,
          },
        };

      case 'codex': {
        const providerId = sanitizeProviderId(providerName);
        return {
          auth: {
            OPENAI_API_KEY: apiKey,
          },
          config: `model_provider = "${providerId}"
model = "${modelName}"
model_reasoning_effort = "high"
disable_response_storage = true

[model_providers.${providerId}]
name = "${providerId}"
base_url = "${endpoint}"
wire_api = "responses"
requires_openai_auth = true
`,
        };
      }

      case 'gemini':
        return {
          GEMINI_API_KEY: apiKey,
          GOOGLE_GEMINI_BASE_URL: endpoint,
          GEMINI_MODEL: modelName,
        };

      case 'opencode':
        return {
          npm: '@ai-sdk/openai-compatible',
          options: {
            baseURL: endpoint,
            apiKey,
          },
          models: {
            [modelName]: {
              name: modelName,
              options: {
                store: false,
              },
            },
          },
        };

      case 'openclaw':
        return {
          baseUrl: endpoint,
          apiKey,
          api: 'openai-completions',
          models: [
            {
              id: modelName,
              name: modelName,
            },
          ],
        };

      case 'hermes':
        return {
          name: providerName,
          base_url: endpoint,
          api_key: apiKey,
          api_mode: 'chat_completions',
          models: [
            {
              id: modelName,
              name: modelName,
            },
          ],
        };

      default:
        return null;
    }
  };

  const generateCCSwitchLink = () => {
    if (!selectedToken || !selectedModel) return '';
    const providerName = site?.name || window.location.hostname;
    const apiKey = `sk-${selectedToken.key}`;
    const endpoint = getCCSwitchEndpoint();
    const configPayload = buildCCSwitchConfigPayload({
      appId: selectedCCSwitchApp,
      providerName,
      endpoint,
      apiKey,
      modelName: selectedModel,
    });
    const params = new URLSearchParams({
      resource: 'provider',
      app: selectedCCSwitchApp,
      name: providerName,
      homepage: serverAddress,
      endpoint,
      apiKey,
      model: selectedModel,
      enabled: 'true',
      notes: `${providerName} - ${selectedModel}`,
    });
    if (configPayload) {
      params.set('configFormat', 'json');
      params.set('config', encodeBase64Utf8(JSON.stringify(configPayload)));
    }
    return `ccswitch://v1/import?${params.toString()}`;
  };

  const generateConfig = () => {
    if (!selectedToken || !selectedModel) return '';

    const apiKey = `sk-${selectedToken.key}`;

    switch (selectedTool) {
      case 'claudecode':
        return `{
  "env": {
    "ANTHROPIC_API_KEY": "${apiKey}",
    "ANTHROPIC_BASE_URL": "${apiServerAddress}",
    "ANTHROPIC_MODEL": "${selectedModel}"
  }
}`;
      case 'hermes':
        return `#!/usr/bin/env bash
set -euo pipefail

# Hermes uses profiles for isolated config, API keys, memory, and sessions.
# This creates/updates a SubRouter profile and exports it as a tar.gz archive.

PROFILE_NAME="subrouter"
PROFILE_DIR="$HOME/.hermes/profiles/$PROFILE_NAME"

if ! hermes profile show "$PROFILE_NAME" >/dev/null 2>&1; then
  hermes profile create "$PROFILE_NAME"
fi

mkdir -p "$PROFILE_DIR"
cat > "$PROFILE_DIR/config.yaml" <<'YAML'
model:
  default: ${selectedModel}
  provider: custom
  base_url: ${apiServerAddress}/v1
  api_key: ${apiKey}
YAML

hermes profile use "$PROFILE_NAME"
hermes profile export "$PROFILE_NAME" -o "./$PROFILE_NAME.tar.gz"

echo "Hermes profile exported to ./$PROFILE_NAME.tar.gz"`;
      case 'ccswitch':
        return generateCCSwitchLink();
      case 'openclaw': {
        const preset = getModelConnectionPreset(selectedModel);
        const modelRef = `${preset.openclawProviderId}/${selectedModel}`;
        return `{
  "agents": {
    "defaults": {
      "models": {
        "${modelRef}": {
          "alias": "${selectedModel}"
        }
      },
      "model": {
        "primary": "${modelRef}"
      }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "${preset.openclawProviderId}": {
        "baseUrl": "${preset.baseUrl}",
        "apiKey": "${apiKey}",
        "api": "${preset.openclawApi}",
        "models": [
          {
            "id": "${selectedModel}",
            "name": "${selectedModel}"
          }
        ]
      }
    }
  }
}`;
      }
      case 'opencode': {
        const preset = getModelConnectionPreset(selectedModel);
        const modelRef = `${preset.opencodeProviderId}/${selectedModel}`;
        return `{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "${preset.opencodeProviderId}": {
      "options": {
        "baseURL": "${preset.baseUrl}",
        "apiKey": "${apiKey}"
      },
      "models": {
        "${selectedModel}": {
          "name": "${selectedModel}",
          "options": {
            "store": false
          }
        }
      }
    }
  },
  "model": "${modelRef}"
}`;
      }
      case 'cursor':
        return `API Key: ${apiKey}
Base URL: ${apiServerAddress}/v1
Model: ${selectedModel}`;
      case 'curl':
        return `curl ${apiServerAddress}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "model": "${selectedModel}",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`;
      case 'python':
        return `from openai import OpenAI

client = OpenAI(
    api_key="${apiKey}",
    base_url="${apiServerAddress}/v1"
)

response = client.chat.completions.create(
    model="${selectedModel}",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)`;
      case 'anthropic':
        return `import anthropic

client = anthropic.Anthropic(
    api_key="${apiKey}",
    base_url="${apiServerAddress}"
)

message = client.messages.create(
    model="${selectedModel}",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(message.content[0].text)`;
      default:
        return '';
    }
  };

  const getFilename = () => {
    switch (selectedTool) {
      case 'curl':
        return 'api-call.sh';
      case 'hermes':
        return 'hermes-subrouter.sh';
      case 'python':
      case 'anthropic':
        return 'main.py';
      case 'cursor':
        return 'cursor-config.txt';
      default:
        return (
          selectedToolMeta.path.split('/').pop() ||
          `${selectedToolMeta.id}.json`
        );
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const getSelectedToolBaseUrl = () => {
    const preset = getModelConnectionPreset(selectedModel);
    if (selectedTool === 'claudecode' || selectedTool === 'anthropic') {
      return apiServerAddress;
    }
    if (selectedTool === 'openclaw' || selectedTool === 'opencode') {
      return preset.baseUrl;
    }
    return `${apiServerAddress}/v1`;
  };

  const handleCopyValue = async (text, successKey = 'config.copied') => {
    if (!text) return;
    await copyToClipboard(text);
    toast.success(t(successKey));
  };

  const handleCopy = async () => {
    const config = generateConfig();
    if (!config) return;
    await copyToClipboard(config);
    setCopied(true);
    toast.success(t('config.copied'));
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCCSwitchLink = async () => {
    const deeplink = generateCCSwitchLink();
    if (!deeplink) return;
    await copyToClipboard(deeplink);
    toast.success(t('config.importLinkCopied'));
  };

  const handleDownload = () => {
    const config = generateConfig();
    if (!config) return;

    const blob = new Blob([config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFilename();
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('config.downloaded'));
  };

  const handleImportCCSwitch = () => {
    const deeplink = generateCCSwitchLink();
    if (!deeplink) return;

    setShowCCSwitchDownload(false);
    setLaunchingCCSwitch(true);

    let dismissed = false;
    let timerId = null;

    const cleanup = () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };

    const handleSuccess = () => {
      if (dismissed) return;
      dismissed = true;
      cleanup();
      setLaunchingCCSwitch(false);
    };

    const handleBlur = () => {
      handleSuccess();
    };

    const handlePageHide = () => {
      handleSuccess();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSuccess();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    timerId = window.setTimeout(() => {
      if (dismissed) return;
      cleanup();
      setLaunchingCCSwitch(false);
      setShowCCSwitchDownload(true);
    }, ccSwitchLaunchFallbackMs);

    window.location.href = deeplink;
  };

  const config = generateConfig();
  const ccSwitchLink = generateCCSwitchLink();

  if (tokens.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <svg
          className="w-8 h-8 mx-auto mb-3 text-page-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <p className="text-sm text-page-secondary mb-1">
          {t('config.noKeyPrompt')}
        </p>
        <p className="text-xs text-page-muted">{t('config.noKeyDesc')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-page-divider">
          <h4 className="font-semibold text-sm text-page flex items-center gap-2">
            <svg
              className="w-4 h-4 text-brand-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {t('config.title')}
          </h4>
          <p className="text-xs text-page-muted mt-1">{t('config.subtitle')}</p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-page-label mb-2">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              {t('config.selectKey')}
            </label>
            <ThemedSelect
              value={selectedToken?.id ?? null}
              onChange={setSelectedTokenId}
              options={tokenOptions}
              placeholder={t('config.selectKey')}
              emptyLabel={t('config.noKeyDesc')}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-page-label mb-2">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              {t('config.selectModel')}
            </label>
            <ThemedSelect
              value={selectedModel}
              onChange={setSelectedModel}
              options={modelOptions}
              placeholder={
                loadingModels
                  ? t('config.loadingModels')
                  : t('config.selectModel')
              }
              disabled={loadingModels || modelOptions.length === 0}
              emptyLabel={
                modelsError
                  ? t('tokens.loadSupportedModelsFailed')
                  : t('tokens.noSupportedModels')
              }
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-page-label mb-2">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {t('config.selectApiEndpoint')}
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              {API_ENDPOINTS.map((endpoint) => (
                <button
                  key={endpoint.id}
                  type="button"
                  onClick={() => setSelectedEndpointId(endpoint.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${
                    selectedEndpointId === endpoint.id
                      ? 'border-brand-500 bg-brand-500/10 text-page'
                      : 'border-page-divider bg-page-inset/40 text-page-secondary hover:bg-page-surface-hover'
                  }`}
                >
                  <div className="text-xs font-semibold">
                    {t(endpoint.nameKey)}
                  </div>
                  <div className="mt-1 text-[11px] text-page-muted">
                    {t(endpoint.descKey)}
                  </div>
                  <code className="mt-1 block break-all text-[11px] text-page-muted">
                    {endpoint.url}
                  </code>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-page-divider bg-page-surface/50 px-4 py-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-page">
                  {t('config.apiUrlTitle')}
                </p>
                <p className="text-xs text-page-muted mt-1">
                  {t('config.apiUrlHint')}
                </p>
              </div>
              <button
                onClick={() =>
                  handleCopyValue(
                    getSelectedToolBaseUrl(),
                    'config.apiUrlCopied',
                  )
                }
                className="btn-secondary px-4 py-2"
              >
                {t('config.copyCurrentApiUrl')}
              </button>
            </div>

            <div className="space-y-2">
              <div className="rounded-lg bg-page-inset/60 px-3 py-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[11px] font-medium text-page-label">
                    {t('config.currentToolApiUrl')}
                  </span>
                  <code className="text-[11px] text-page-muted break-all">
                    {getSelectedToolBaseUrl()}
                  </code>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <button
                  onClick={() =>
                    handleCopyValue(
                      `${apiServerAddress}/v1`,
                      'config.apiUrlCopied',
                    )
                  }
                  className="rounded-lg border border-page-divider bg-page-inset/40 px-3 py-2 text-left hover:bg-page-surface-hover transition-colors"
                >
                  <div className="text-[11px] font-medium text-page-label">
                    {t('config.openaiApiUrl')}
                  </div>
                  <code className="block mt-1 text-[11px] text-page-muted break-all">
                    {apiServerAddress}/v1
                  </code>
                </button>
                <button
                  onClick={() =>
                    handleCopyValue(apiServerAddress, 'config.apiUrlCopied')
                  }
                  className="rounded-lg border border-page-divider bg-page-inset/40 px-3 py-2 text-left hover:bg-page-surface-hover transition-colors"
                >
                  <div className="text-[11px] font-medium text-page-label">
                    {t('config.anthropicApiUrl')}
                  </div>
                  <code className="block mt-1 text-[11px] text-page-muted break-all">
                    {apiServerAddress}
                  </code>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-page-label mb-2 block">
              {t('config.selectTool')}
            </label>
            <div className="flex flex-wrap gap-2">
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTool === tool.id
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'surface text-page-secondary hover:bg-page-surface-hover'
                  }`}
                >
                  {tool.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-4 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-page">
                  {t('config.ccswitchTitle')}
                </p>
                <p className="text-xs text-page-muted mt-1">
                  {t('config.ccswitchHint')}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-brand-500/15 text-brand-300">
                CC Switch
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-page-label mb-2">
                {t('config.selectCCSwitchApp')}
              </p>
              <div className="flex flex-wrap gap-2">
                {CCSWITCH_APPS.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedCCSwitchApp(app.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCCSwitchApp === app.id
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-transparent border border-page-divider text-page-secondary hover:bg-page-surface-hover'
                    }`}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleImportCCSwitch}
                disabled={!ccSwitchLink || launchingCCSwitch}
                className="btn-primary flex-1 min-w-[220px]"
                title={t('config.importToCCSwitch')}
              >
                {launchingCCSwitch
                  ? t('config.launchingCCSwitch')
                  : t('config.importToCCSwitch')}
              </button>
              <button
                onClick={handleCopyCCSwitchLink}
                disabled={!ccSwitchLink}
                className="btn-secondary px-4 py-2.5"
                title={t('config.copyImportLink')}
              >
                {t('config.copyImportLink')}
              </button>
            </div>

            <div className="rounded-lg bg-page-inset/60 px-3 py-2">
              <code className="text-[11px] leading-relaxed text-page-muted break-all">
                {ccSwitchLink}
              </code>
            </div>
          </div>
        </div>

        <div className="border-t border-page-divider">
          <div className="flex items-center justify-between px-4 py-2.5 bg-page-inset/70">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-page-muted ml-1 truncate">
                {selectedToolMeta.path}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!config}
                className="p-1.5 rounded-md hover:bg-page-surface-hover transition-colors text-page-muted hover:text-page disabled:opacity-50 disabled:cursor-not-allowed"
                title={t(
                  selectedTool === 'ccswitch'
                    ? 'config.copyImportLink'
                    : 'config.copy',
                )}
              >
                {copied ? (
                  <svg
                    className="w-3.5 h-3.5 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
              <button
                onClick={handleDownload}
                disabled={!config}
                className="p-1.5 rounded-md hover:bg-page-surface-hover transition-colors text-page-muted hover:text-page disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('config.download')}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <pre className="p-4 text-xs leading-relaxed overflow-x-auto max-h-72 font-mono text-page whitespace-pre-wrap break-all">
            <code>{config || t('tokens.noSupportedModels')}</code>
          </pre>
        </div>
      </div>

      {showCCSwitchDownload && (
        <div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCCSwitchDownload(false)}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-page mb-2">
              {t('config.ccswitchNotInstalledTitle')}
            </h3>
            <p className="text-sm text-page-secondary mb-5">
              {t('config.ccswitchNotInstalledDesc')}
            </p>
            <div className="space-y-3">
              <a
                href={CCSWITCH_PRIMARY_DOWNLOAD}
                className="btn-primary w-full text-center block"
              >
                {t('config.downloadCCSwitch')}
              </a>
              <a
                href={CCSWITCH_REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary w-full text-center block"
              >
                {t('config.openCCSwitchRepo')}
              </a>
            </div>
            <div className="flex justify-end mt-5">
              <button
                onClick={() => setShowCCSwitchDownload(false)}
                className="btn-secondary"
              >
                {t('topup.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfigExporter;
