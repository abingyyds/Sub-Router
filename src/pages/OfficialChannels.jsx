import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Boxes,
  Building2,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getSiteOfficialChannelAvailability, getSiteOfficialChannels } from '../api';
import OfficialChannelKeyCreateModal from '../components/OfficialChannelKeyCreateModal';
import { useAuth } from '../context/AuthContext';
import { useSite, useCurrency } from '../context/SiteContext';
import { SHARED_API_ENDPOINTS } from '../constants/apiEndpoints';

const API_BASE_URLS = SHARED_API_ENDPOINTS.map((endpoint) => ({
  labelKey: endpoint.nameKey,
  value: endpoint.url,
}));

const normalizeMultiplier = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const trimNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(n >= 10 ? 1 : 2).replace(/\.?0+$/, '');
};

const formatPriceMultiplier = (value, t) => {
  const n = normalizeMultiplier(value);
  if (n <= 0) return t('officialChannels.noLimit');
  if (n < 1) {
    return t('officialChannels.discountLabel', {
      value: trimNumber(n * 10),
      multiplier: trimNumber(n),
      percent: trimNumber(n * 100),
    });
  }
  return t('officialChannels.multiplierLabel', { value: trimNumber(n) });
};

const finalMinPriceOf = (channel) =>
  normalizeMultiplier(channel?.min_allowed_final_discount || channel?.min_final_price_discount);

const finalMaxPriceOf = (channel) =>
  normalizeMultiplier(channel?.max_final_discount);

const formatPriceRange = (channel, t) => {
  const min = finalMinPriceOf(channel);
  const max = finalMaxPriceOf(channel);
  if (min <= 0 && max <= 0) return t('officialChannels.noLimit');
  if (min > 0 && max > 0) {
    return `${formatPriceMultiplier(min, t)} - ${formatPriceMultiplier(max, t)}`;
  }
  if (min > 0) return t('officialChannels.rangeFrom', { value: formatPriceMultiplier(min, t) });
  return t('officialChannels.rangeMax', { value: formatPriceMultiplier(max, t) });
};

const formatCount = (value) => Number(value || 0).toLocaleString();

const formatPercent = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? `${n.toFixed(1)}%` : '--';
};

const availabilityNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(100, Math.max(0, n)) : -1;
};

const availabilityClass = (value) => {
  const n = availabilityNumber(value);
  if (n < 0) return 'bg-page-inset';
  if (n < 50) return 'bg-rose-500';
  if (n < 80) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const formatModelPrice = (model, final = false, t) => {
  const input = Number(model?.[final ? 'final_input_price' : 'official_input_price'] || 0);
  const output = Number(model?.[final ? 'final_output_price' : 'official_output_price'] || 0);
  const fixed = Number(model?.[final ? 'final_fixed_price' : 'official_fixed_price'] || 0);
  const currency = model?.price_currency === 'CNY' ? '¥' : '$';
  if (fixed > 0) return `${currency}${fixed.toFixed(fixed < 0.01 ? 6 : 4).replace(/\.?0+$/, '')}/${t('pricing.perCallUnit')}`;
  if (input <= 0 && output <= 0) return '--';
  const format = (value) => value > 0 ? `${currency}${value.toFixed(value < 0.01 ? 6 : 4).replace(/\.?0+$/, '')}` : '-';
  return `${format(input)} / ${format(output)} / M`;
};

const channelIdOf = (channel) => Number(channel?.official_channel_id || channel?.id || 0);

const copyText = async (value, message, errorMessage = 'Copy failed') => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch (error) {
    toast.error(errorMessage);
  }
};

export default function OfficialChannels() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { channelId } = useParams();
  const { user } = useAuth();
  const { site } = useSite();
  const { symbol, rate } = useCurrency();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailChannel, setDetailChannel] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createChannel, setCreateChannel] = useState(null);

  const loadChannels = useCallback(() => {
    setLoading(true);
    getSiteOfficialChannels({ details: 0 })
      .then((res) => {
        if (res.data.success) {
          setChannels(res.data.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (!channelId) {
      setDetailChannel(null);
      setDetailLoading(false);
      return undefined;
    }
    let active = true;
    setDetailLoading(true);
    getSiteOfficialChannels({ details: 1, channel_id: channelId })
      .then((res) => {
        if (active && res.data?.success) {
          setDetailChannel(res.data.data?.[0] || null);
        }
      })
      .catch(() => {
        if (active) setDetailChannel(null);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [channelId]);

  const selectedChannel = useMemo(() => {
    if (!channelId) return null;
    if (String(channelIdOf(detailChannel)) === String(channelId)) {
      return detailChannel;
    }
    return channels.find((channel) => String(channelIdOf(channel)) === String(channelId));
  }, [channelId, channels, detailChannel]);

  const summary = useMemo(() => {
    return channels.reduce(
      (acc, item) => {
        acc.models += Number(item.usable_model_count || 0);
        acc.keys += Number(item.available_key_count || 0);
        acc.providers += Number(item.available_provider_count || 0);
        const min = finalMinPriceOf(item);
        if (min > 0 && (acc.min === 0 || min < acc.min)) acc.min = min;
        return acc;
      },
      { models: 0, keys: 0, providers: 0, min: 0 },
    );
  }, [channels]);

  const handleOpenTokens = (channel) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setCreateChannel(channel || null);
  };

  if (channelId) {
    if ((loading || detailLoading) && !selectedChannel) {
      return <LoadingBlock label={t('common.loading')} />;
    }
    if (!selectedChannel) {
      return (
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          <button type="button" onClick={() => navigate('/official-channels')} className="btn-secondary mb-6">
            <ArrowLeft size={16} className="mr-2" />
            {t('officialChannels.back')}
          </button>
          <div className="rounded-2xl border border-dashed border-page-divider bg-page-surface px-5 py-12 text-center">
            <div className="text-base font-semibold text-page">{t('officialChannels.notFoundTitle')}</div>
            <p className="mt-2 text-sm text-page-secondary">{t('officialChannels.notFoundDesc')}</p>
          </div>
        </div>
      );
    }
    return (
      <>
        <OfficialChannelDetail
          channel={selectedChannel}
          user={user}
          hideProviderInfo={Boolean(site?.hide_provider_info)}
          detailsLoading={detailLoading}
          currencySymbol={symbol}
          onBack={() => navigate('/official-channels')}
          onOpenTokens={() => handleOpenTokens(selectedChannel)}
        />
        <OfficialChannelKeyCreateModal
          open={Boolean(createChannel)}
          channel={createChannel}
          currency={{ symbol, rate }}
          onClose={() => setCreateChannel(null)}
        />
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="inline-flex w-fit items-center rounded-full border border-page-divider bg-page-surface px-3 py-1 text-sm font-semibold text-page">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-page-link" />
            {t('officialChannels.badge')}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-page sm:text-4xl">
              {t('officialChannels.title')}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-page-secondary sm:text-base">
              {t('officialChannels.subtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadChannels}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-page-divider bg-page-surface px-4 text-sm font-semibold text-page transition hover:border-page-link/60"
        >
          <RefreshCw size={16} className="mr-2" />
          {t('common.refresh')}
        </button>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-4">
        <SummaryCard label={t('officialChannels.statChannels')} value={formatCount(channels.length)} />
        <SummaryCard label={t('officialChannels.statModels')} value={formatCount(summary.models)} />
        <SummaryCard label={t('officialChannels.statKeys')} value={formatCount(summary.keys)} />
        <SummaryCard label={t('officialChannels.statMin')} value={formatPriceMultiplier(summary.min, t)} />
      </section>

      {loading ? (
        <LoadingBlock label={t('common.loading')} />
      ) : channels.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-page-divider bg-page-surface px-5 py-12 text-center">
          <div className="text-base font-semibold text-page">{t('officialChannels.emptyTitle')}</div>
          <p className="mt-2 text-sm text-page-secondary">{t('officialChannels.emptyDesc')}</p>
        </div>
      ) : (
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {channels.map((channel) => (
            <OfficialChannelCard
              key={channelIdOf(channel)}
              channel={channel}
              hideProviderInfo={Boolean(site?.hide_provider_info)}
              onOpen={() => navigate(`/official-channels/${channelIdOf(channel)}`)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function OfficialChannelCard({ channel, onOpen, hideProviderInfo = false }) {
  const { t } = useTranslation();
  return (
    <article className="glass rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-page">{channel.name}</h2>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-page-success">
                <CheckCircle2 size={13} className="mr-1" />
                {t('officialChannels.available')}
              </span>
            </div>
            {channel.description && (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-page-secondary">
                {channel.description}
              </p>
            )}
          </div>
          <div className="shrink-0 rounded-xl bg-page-link/10 p-2 text-page-link">
            <SlidersHorizontal size={20} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t('officialChannels.lowestPrice')} value={formatPriceMultiplier(finalMinPriceOf(channel), t)} />
          <Metric label={t('officialChannels.maxPrice')} value={formatPriceMultiplier(finalMaxPriceOf(channel), t)} />
          <Metric label={t('officialChannels.keyAvailability')} value={formatPercent(channel.key_availability)} />
          <Metric label={t('officialChannels.modelAvailability')} value={formatPercent(channel.model_availability)} />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Metric label={t('officialChannels.models')} value={formatCount(channel.usable_model_count)} />
          {!hideProviderInfo && <Metric label={t('officialChannels.providers')} value={formatCount(channel.available_provider_count)} />}
          <Metric label={t('officialChannels.keyType')} value={t('officialChannels.groupKeyOnly')} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AvailabilityMeter label={t('officialChannels.keyAvailability')} value={channel.key_availability} />
          <AvailabilityMeter label={t('officialChannels.modelAvailability')} value={channel.model_availability} />
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-page-link px-4 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <KeyRound size={16} className="mr-2" />
          {t('officialChannels.enterDetails')}
        </button>
      </div>
    </article>
  );
}

function OfficialChannelDetail({
  channel,
  user,
  hideProviderInfo = false,
  currencySymbol = '$',
  detailsLoading = false,
  onBack,
  onOpenTokens,
}) {
  const { t } = useTranslation();
  const models = useMemo(
    () => (Array.isArray(channel.models) ? channel.models : []),
    [channel.models],
  );
  const officialChannelId = channelIdOf(channel);
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || null);
  const selectedModel = models.find((model) => String(model.id) === String(selectedModelId)) || models[0];
  const [channelAvailability, setChannelAvailability] = useState(null);
  const [channelAvailabilityLoading, setChannelAvailabilityLoading] = useState(true);
  const [modelAvailability, setModelAvailability] = useState(null);
  const [modelAvailabilityLoading, setModelAvailabilityLoading] = useState(false);

  useEffect(() => {
    setSelectedModelId((current) => {
      if (models.some((model) => String(model.id) === String(current))) {
        return current;
      }
      return models[0]?.id || null;
    });
  }, [officialChannelId, models]);

  useEffect(() => {
    let active = true;
    setChannelAvailabilityLoading(true);
    getSiteOfficialChannelAvailability(officialChannelId, 0, '24h')
      .then((res) => {
        if (active && res.data?.success) setChannelAvailability(res.data.data || null);
      })
      .catch(() => {
        if (active) setChannelAvailability(null);
      })
      .finally(() => {
        if (active) setChannelAvailabilityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [officialChannelId]);

  useEffect(() => {
    if (!selectedModel?.id) {
      setModelAvailability(null);
      return undefined;
    }
    let active = true;
    setModelAvailabilityLoading(true);
    getSiteOfficialChannelAvailability(officialChannelId, selectedModel.id, '24h')
      .then((res) => {
        if (active && res.data?.success) setModelAvailability(res.data.data || null);
      })
      .catch(() => {
        if (active) setModelAvailability(null);
      })
      .finally(() => {
        if (active) setModelAvailabilityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [officialChannelId, selectedModel?.id]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <button type="button" onClick={onBack} className="btn-secondary mb-6">
        <ArrowLeft size={16} className="mr-2" />
        {t('officialChannels.back')}
      </button>

      <section className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex w-fit items-center rounded-full border border-page-divider bg-page-surface px-3 py-1 text-sm font-semibold text-page">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-page-link" />
              {t('officialChannels.badge')}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-page sm:text-4xl">{channel.name}</h1>
            {channel.description && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-page-secondary sm:text-base">
                {channel.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenTokens}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-page-link px-4 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <KeyRound size={16} className="mr-2" />
            {user ? t('officialChannels.createGroupKey') : t('officialChannels.loginCreateGroupKey')}
          </button>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t('officialChannels.lowestPrice')} value={formatPriceMultiplier(finalMinPriceOf(channel), t)} />
          <Metric label={t('officialChannels.maxPrice')} value={formatPriceMultiplier(finalMaxPriceOf(channel), t)} />
          <Metric label={t('officialChannels.keyAvailability')} value={formatPercent(channel.key_availability)} />
          <Metric label={t('officialChannels.modelAvailability')} value={formatPercent(channel.model_availability)} />
        </div>
      </section>

      <AvailabilityGraph
        title={t('officialChannels.channelAvailabilityGraph')}
        data={channelAvailability}
        loading={channelAvailabilityLoading}
      />

      <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="rounded-2xl border border-page-divider bg-page-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-page">{t('officialChannels.modelCatalog')}</h2>
            <span className="text-xs text-page-secondary">{formatCount(models.length)}</span>
          </div>
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {detailsLoading ? (
              <div className="flex items-center justify-center px-3 py-8 text-sm text-page-secondary">
                <Loader2 size={18} className="mr-2 animate-spin" />
                {t('common.loading')}
              </div>
            ) : models.length === 0 ? (
              <div className="rounded-xl border border-dashed border-page-divider px-3 py-8 text-center text-sm text-page-secondary">
                {t('officialChannels.noModels')}
              </div>
            ) : models.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => setSelectedModelId(model.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${String(model.id) === String(selectedModel?.id) ? 'border-page-link bg-page-link/10' : 'border-page-divider bg-page-inset hover:border-page-link/50'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-page">{model.model_name}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${model.available ? 'bg-emerald-500/10 text-page-success' : 'bg-page-inset text-page-muted'}`}>
                    {model.available ? t('officialChannels.available') : t('officialChannels.unavailable')}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-page-secondary">
                  <span>{model.category || 'chat'}</span>
                  <span>{formatCount(model.available_key_count)} Key</span>
                  <span>{formatModelPrice(model, true, t)}</span>
                </div>
                <AvailabilityMeter label={t('officialChannels.modelAvailability')} value={model.key_availability} compact />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-page-divider bg-page-surface p-5">
          {selectedModel ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Boxes size={17} className="text-page-link" />
                    <h2 className="text-lg font-semibold text-page">{selectedModel.model_name}</h2>
                  </div>
                  <p className="mt-2 text-sm text-page-secondary">{selectedModel.description || t('officialChannels.modelPriceHint')}</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-page-success">
                  {formatPercent(channel.model_availability)}
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Metric label={t('officialChannels.originalPrice')} value={formatModelPrice(selectedModel, false, t)} />
                <Metric label={t('officialChannels.finalPrice')} value={formatModelPrice(selectedModel, true, t)} />
                <Metric label={t('officialChannels.discount')} value={formatPriceMultiplier(selectedModel.final_price_discount, t)} />
                <Metric label={t('officialChannels.modelKeys')} value={formatCount(selectedModel.key_count)} />
              </div>
              <AvailabilityGraph
                title={t('officialChannels.modelAvailabilityGraph')}
                data={modelAvailability}
                loading={modelAvailabilityLoading}
                compact
              />
              <div className="mt-4 rounded-xl border border-page-divider bg-page-inset px-4 py-3 text-xs text-page-secondary">
                {t('officialChannels.priceUnitHint', { currency: selectedModel.price_currency || currencySymbol })}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center text-sm text-page-secondary">{t('officialChannels.selectModel')}</div>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-page-divider bg-page-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-page">{t('officialChannels.groupKeyTitle')}</h2>
            <p className="mt-1 text-sm leading-6 text-page-secondary">{t('officialChannels.groupKeyDesc')}</p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-page-link/10 px-2.5 py-1 text-xs font-semibold text-page-link">
            {t('officialChannels.groupKeyOnly')}
          </span>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric label={t('officialChannels.models')} value={formatCount(channel.usable_model_count)} />
        {!hideProviderInfo && <Metric label={t('officialChannels.providers')} value={formatCount(channel.available_provider_count)} />}
      </section>

      {!hideProviderInfo && (
        <ProviderSupplySection providers={channel.providers} />
      )}

      <section className="mt-5 rounded-2xl border border-page-divider bg-page-surface p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-page">{t('officialChannels.endpointTitle')}</h2>
            <p className="text-sm text-page-secondary">{t('officialChannels.endpointDesc')}</p>
          </div>
          <span className="mt-2 inline-flex w-fit rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-page-success sm:mt-0">
            {t('officialChannels.online')}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {API_BASE_URLS.map((item) => (
            <div key={item.value} className="rounded-xl border border-page-divider bg-page-inset px-4 py-3">
              <div className="mb-2 text-xs font-semibold text-page-secondary">{t(item.labelKey)}</div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-sm text-page">{item.value}</code>
                <button
                  type="button"
                  onClick={() => copyText(item.value, t('officialChannels.endpointCopied'), t('officialChannels.copyFailed'))}
                  className="inline-flex h-8 items-center rounded-md border border-page-divider bg-page-surface px-2.5 text-xs font-semibold text-page-secondary transition hover:text-page"
                >
                  <Copy size={13} className="mr-1" />
                  {t('officialChannels.copy')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProviderSupplySection({ providers }) {
  const { t } = useTranslation();
  const items = Array.isArray(providers) ? providers : [];

  return (
    <section className="mt-5 rounded-2xl border border-page-divider bg-page-surface p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={17} className="text-page-link" />
            <h2 className="text-base font-semibold text-page">{t('officialChannels.providerSupplyTitle')}</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-page-secondary">{t('officialChannels.providerSupplyDesc')}</p>
        </div>
        <span className="mt-2 inline-flex w-fit rounded-full bg-page-link/10 px-2.5 py-1 text-xs font-semibold text-page-link sm:mt-0">
          {formatCount(items.length)}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-page-divider px-4 py-6 text-center text-sm text-page-secondary">
          {t('officialChannels.noProviderSupply')}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((provider, index) => (
            <div
              key={provider.provider_id || provider.provider_slug || provider.provider_name || index}
              className="rounded-xl border border-page-divider bg-page-inset p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-page">
                    {provider.provider_name || provider.provider_slug || t('officialChannels.unnamedProvider')}
                  </div>
                  {provider.provider_slug && provider.provider_name && (
                    <div className="mt-1 truncate text-xs text-page-secondary">{provider.provider_slug}</div>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-page-success">
                  {formatAvailability(provider.availability)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Metric label={t('officialChannels.providerKeys')} value={formatCount(provider.key_count)} />
                <Metric label={t('officialChannels.providerModels')} value={formatCount(provider.supported_model_count)} />
                <Metric label={t('officialChannels.providerPrice')} value={formatPriceMultiplier(provider.price_discount, t)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-page-divider bg-page-surface px-4 py-4 shadow-sm">
      <div className="text-sm text-page-secondary">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-page">{value}</div>
    </div>
  );
}

function AvailabilityMeter({ label, value, compact = false }) {
  const percent = availabilityNumber(value);
  return (
    <div className={`rounded-xl border border-page-divider bg-page-surface ${compact ? 'mt-2 px-2 py-1.5' : 'px-3 py-3'}`}>
      <div className="flex items-center justify-between gap-2 text-xs text-page-secondary">
        <span>{label}</span>
        <span className="font-semibold text-page">{formatPercent(percent)}</span>
      </div>
      <div className={`mt-1.5 w-full overflow-hidden rounded-full bg-page-inset ${compact ? 'h-1.5' : 'h-2'}`}>
        <div
          className={`h-full rounded-full transition-all ${availabilityClass(percent)}`}
          style={{ width: `${percent < 0 ? 0 : percent}%` }}
        />
      </div>
    </div>
  );
}

function AvailabilityGraph({ title, data, loading = false, compact = false }) {
  const { t } = useTranslation();
  const buckets = Array.isArray(data?.buckets) ? data.buckets : [];
  const providers = Array.isArray(data?.providers) ? data.providers : [];
  const availability = availabilityNumber(data?.availability);
  return (
    <section className={`rounded-2xl border border-page-divider bg-page-surface ${compact ? 'mt-4 p-4' : 'mt-5 p-5'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity size={17} className="text-page-link" />
          <h2 className="text-base font-semibold text-page">{title}</h2>
        </div>
        <span className="text-sm font-semibold text-page">{formatPercent(availability)}</span>
      </div>
      {loading ? (
        <div className="mt-4 flex h-12 items-center justify-center text-xs text-page-secondary">{t('common.loading')}</div>
      ) : buckets.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-page-divider px-3 py-5 text-center text-xs text-page-secondary">
          {t('officialChannels.noAvailabilityHistory')}
        </div>
      ) : (
        <>
          <div className={`mt-4 flex items-end gap-1 ${compact ? 'h-12' : 'h-16'}`}>
            {buckets.map((bucket, index) => (
              <div
                key={`${bucket.bucket_time}-${index}`}
                title={`${formatPercent(bucket.availability)} · ${formatCount(bucket.successes)}/${formatCount(bucket.total)}`}
                className={`min-w-0 flex-1 rounded-t-sm transition-opacity hover:opacity-80 ${availabilityClass(bucket.availability)}`}
                style={{ height: `${Math.max(8, availabilityNumber(bucket.availability) < 0 ? 8 : availabilityNumber(bucket.availability))}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-page-secondary">
            <span>{data?.period === '7d' ? t('officialChannels.sevenDaysAgo') : t('officialChannels.twentyFourHoursAgo')}</span>
            <span>{t('officialChannels.now')}</span>
          </div>
        </>
      )}
      {providers.length > 0 && (
        <div className="mt-4 border-t border-page-divider pt-4">
          <div className="flex items-center justify-between gap-2 text-xs text-page-secondary">
            <span>{t('officialChannels.modelProviders')}</span>
            <span>{formatCount(providers.length)}</span>
          </div>
          <div className="mt-3 space-y-2">
            {providers.map((provider, index) => {
              const providerAvailability = availabilityNumber(provider.availability);
              const providerLabel = provider.provider_name || t('officialChannels.providerFallback', { number: provider.provider_index || index + 1 });
              return (
                <div key={`${provider.provider_id || provider.provider_index || index}`} className="rounded-lg border border-page-divider bg-page-inset px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-semibold text-page">{providerLabel}</span>
                    <span className="shrink-0 font-semibold text-page">{formatPercent(providerAvailability)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-page-surface">
                    <div
                      className={`h-full rounded-full ${availabilityClass(providerAvailability)}`}
                      style={{ width: `${providerAvailability < 0 ? 0 : providerAvailability}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-page-secondary">
                    <span>{formatCount(provider.key_count)} Key</span>
                    <span>{formatPriceMultiplier(provider.price_discount, t)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-page-divider bg-page-surface px-3 py-3">
      <div className="text-xs text-page-secondary">{label}</div>
      <div className="mt-1 text-sm font-semibold text-page">{value}</div>
    </div>
  );
}

function formatAvailability(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? `${n.toFixed(1)}%` : '--';
}

function LoadingBlock({ label, compact = false }) {
  return (
    <div className={`flex items-center justify-center text-page-secondary ${compact ? 'py-8' : 'py-20'}`}>
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}
