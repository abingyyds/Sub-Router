import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getSiteOfficialChannels } from '../api';
import { useAuth } from '../context/AuthContext';
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
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadChannels = useCallback(() => {
    setLoading(true);
    getSiteOfficialChannels()
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

  const selectedChannel = useMemo(() => {
    if (!channelId) return null;
    return channels.find((channel) => String(channelIdOf(channel)) === String(channelId));
  }, [channelId, channels]);

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

  const handleOpenTokens = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/tokens');
  };

  if (channelId) {
    if (loading) {
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
      <OfficialChannelDetail
        channel={selectedChannel}
        user={user}
        onBack={() => navigate('/official-channels')}
        onOpenTokens={handleOpenTokens}
      />
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
              onOpen={() => navigate(`/official-channels/${channelIdOf(channel)}`)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function OfficialChannelCard({ channel, onOpen }) {
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

        <div className="grid gap-2 sm:grid-cols-4">
          <Metric label={t('officialChannels.lowestPrice')} value={formatPriceMultiplier(finalMinPriceOf(channel), t)} />
          <Metric label={t('officialChannels.maxPrice')} value={formatPriceMultiplier(finalMaxPriceOf(channel), t)} />
          <Metric label={t('officialChannels.priceRange')} value={formatPriceRange(channel, t)} />
          <Metric label={t('officialChannels.keys')} value={formatCount(channel.available_key_count)} />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Metric label={t('officialChannels.models')} value={formatCount(channel.usable_model_count)} />
          <Metric label={t('officialChannels.providers')} value={formatCount(channel.available_provider_count)} />
          <Metric label={t('officialChannels.keyType')} value={t('officialChannels.groupKeyOnly')} />
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
  onBack,
  onOpenTokens,
}) {
  const { t } = useTranslation();
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

        <div className="mt-6 grid gap-2 sm:grid-cols-4">
          <Metric label={t('officialChannels.lowestPrice')} value={formatPriceMultiplier(finalMinPriceOf(channel), t)} />
          <Metric label={t('officialChannels.maxPrice')} value={formatPriceMultiplier(finalMaxPriceOf(channel), t)} />
          <Metric label={t('officialChannels.models')} value={formatCount(channel.usable_model_count)} />
          <Metric label={t('officialChannels.keys')} value={formatCount(channel.available_key_count)} />
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

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-page-divider bg-page-surface px-4 py-4 shadow-sm">
      <div className="text-sm text-page-secondary">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-page">{value}</div>
    </div>
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

function LoadingBlock({ label, compact = false }) {
  return (
    <div className={`flex items-center justify-center text-page-secondary ${compact ? 'py-8' : 'py-20'}`}>
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}
