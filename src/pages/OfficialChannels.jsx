import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createOfficialChannelToken,
  deleteOfficialChannelToken,
  getOfficialChannelTokens,
  getSiteOfficialChannels,
} from '../api';
import { useAuth } from '../context/AuthContext';

const API_BASE_URLS = [
  { label: 'CF加速', value: 'https://subrouter.ai' },
  { label: '直连', value: 'https://test1122.up.railway.app/' },
];

const normalizeDiscount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1) : 0;
};

const normalizeMarkup = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
};

const formatDiscount = (value) => {
  const discount = normalizeDiscount(value);
  if (discount <= 0) return '不限';
  if (discount < 1) {
    return `${(discount * 10).toFixed(discount * 10 < 1 ? 1 : 2).replace(/\.?0+$/, '')}折`;
  }
  return `${discount.toFixed(discount >= 10 ? 1 : 2).replace(/\.?0+$/, '')}x`;
};

const formatPriceMultiplier = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '不限';
  if (n < 1) {
    return `${(n * 10).toFixed(n * 10 < 1 ? 1 : 2).replace(/\.?0+$/, '')}折`;
  }
  return `${n.toFixed(n >= 10 ? 1 : 2).replace(/\.?0+$/, '')}x`;
};

const formatCount = (value) => Number(value || 0).toLocaleString();

const formatMarkup = (value) => `${normalizeMarkup(value).toFixed(2).replace(/\.?0+$/, '')}%`;

const channelIdOf = (channel) => Number(channel?.official_channel_id || channel?.id || 0);

const fullKey = (value = '') => {
  const key = String(value || '').trim();
  if (!key) return '';
  return key.startsWith('sk-') ? key : `sk-${key}`;
};

const copyText = async (value, message) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch (error) {
    toast.error('复制失败');
  }
};

export default function OfficialChannels() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { channelId } = useParams();
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [creating, setCreating] = useState(false);

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

  const selectedChannelId = channelIdOf(selectedChannel);

  const loadTokens = useCallback(() => {
    if (!user || !selectedChannelId) {
      setTokens([]);
      return;
    }
    setTokensLoading(true);
    getOfficialChannelTokens(selectedChannelId)
      .then((res) => {
        if (res.data.success) {
          setTokens(res.data.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setTokensLoading(false));
  }, [selectedChannelId, user]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const summary = useMemo(() => {
    return channels.reduce(
      (acc, item) => {
        acc.models += Number(item.usable_model_count || 0);
        acc.keys += Number(item.available_key_count || 0);
        acc.providers += Number(item.available_provider_count || 0);
        const min = Number(
          item.min_allowed_final_discount ||
            item.min_allowed_price_discount ||
            item.min_price_discount ||
            0,
        );
        if (min > 0 && (acc.min === 0 || min < acc.min)) acc.min = min;
        return acc;
      },
      { models: 0, keys: 0, providers: 0, min: 0 },
    );
  }, [channels]);

  const handleCreateToken = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedChannelId) return;
    setCreating(true);
    try {
      const res = await createOfficialChannelToken(selectedChannelId, {
        name: `${selectedChannel.name || '官方渠道'} Key`,
      });
      if (res.data.success) {
        toast.success('Key 已生成');
        await loadTokens();
      }
    } catch (error) {
      // handled by interceptor
    }
    setCreating(false);
  };

  const handleDeleteToken = async (token) => {
    if (!selectedChannelId || !token?.id) return;
    if (!window.confirm('确定删除这个官方渠道 Key？')) return;
    try {
      const res = await deleteOfficialChannelToken(selectedChannelId, token.id);
      if (res.data.success) {
        toast.success('Key 已删除');
        await loadTokens();
      }
    } catch (error) {
      // handled by interceptor
    }
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
            返回官方渠道
          </button>
          <div className="rounded-2xl border border-dashed border-page-divider bg-page-surface px-5 py-12 text-center">
            <div className="text-base font-semibold text-page">官方渠道不存在</div>
            <p className="mt-2 text-sm text-page-secondary">该渠道可能已下架或当前经营站未上架。</p>
          </div>
        </div>
      );
    }
    return (
      <OfficialChannelDetail
        channel={selectedChannel}
        tokens={tokens}
        user={user}
        loading={tokensLoading}
        creating={creating}
        onBack={() => navigate('/official-channels')}
        onRefreshTokens={loadTokens}
        onCreateToken={handleCreateToken}
        onDeleteToken={handleDeleteToken}
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
        <SummaryCard label={t('officialChannels.statMin')} value={formatDiscount(summary.min)} />
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
          <Metric
            label={t('officialChannels.lowestPrice')}
            value={formatPriceMultiplier(
              channel.min_allowed_final_discount ||
                channel.min_allowed_price_discount ||
                channel.min_price_discount,
            )}
          />
          <Metric label={t('officialChannels.maxPrice')} value={formatPriceMultiplier(channel.max_final_discount || channel.max_discount)} />
          <Metric label={t('officialChannels.markup')} value={formatMarkup(channel.markup_percent)} />
          <Metric
            label={t('officialChannels.priceRange')}
            value={`${formatPriceMultiplier(
              channel.min_allowed_final_discount ||
                channel.min_allowed_price_discount ||
                channel.min_price_discount,
            )} - ${formatPriceMultiplier(channel.max_final_discount || channel.max_discount)}`}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Metric label={t('officialChannels.models')} value={formatCount(channel.usable_model_count)} />
          <Metric label={t('officialChannels.keys')} value={formatCount(channel.available_key_count)} />
          <Metric label={t('officialChannels.providers')} value={formatCount(channel.available_provider_count)} />
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-page-link px-4 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <KeyRound size={16} className="mr-2" />
          进入渠道详情
        </button>
      </div>
    </article>
  );
}

function OfficialChannelDetail({
  channel,
  tokens,
  user,
  loading,
  creating,
  onBack,
  onRefreshTokens,
  onCreateToken,
  onDeleteToken,
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <button type="button" onClick={onBack} className="btn-secondary mb-6">
        <ArrowLeft size={16} className="mr-2" />
        返回官方渠道
      </button>

      <section className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex w-fit items-center rounded-full border border-page-divider bg-page-surface px-3 py-1 text-sm font-semibold text-page">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-page-link" />
              官方渠道
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
            onClick={onCreateToken}
            disabled={creating}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-page-link px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Plus size={16} className="mr-2" />}
            {user ? '生成 Key' : '登录后生成 Key'}
          </button>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-4">
          <Metric
            label={t('officialChannels.lowestPrice')}
            value={formatPriceMultiplier(
              channel.min_allowed_final_discount ||
                channel.min_allowed_price_discount ||
                channel.min_price_discount,
            )}
          />
          <Metric label={t('officialChannels.models')} value={formatCount(channel.usable_model_count)} />
          <Metric label={t('officialChannels.keys')} value={formatCount(channel.available_key_count)} />
          <Metric label={t('officialChannels.providers')} value={formatCount(channel.available_provider_count)} />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-page-divider bg-page-surface p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-page">API Base URL</h2>
            <p className="text-sm text-page-secondary">在线。复制任一地址作为官方渠道 Key 的调用地址。</p>
          </div>
          <span className="mt-2 inline-flex w-fit rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-page-success sm:mt-0">
            在线
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {API_BASE_URLS.map((item) => (
            <div key={item.value} className="rounded-xl border border-page-divider bg-page-inset px-4 py-3">
              <div className="mb-2 text-xs font-semibold text-page-secondary">{item.label}</div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-sm text-page">{item.value}</code>
                <button
                  type="button"
                  onClick={() => copyText(item.value, '调用地址已复制')}
                  className="inline-flex h-8 items-center rounded-md border border-page-divider bg-page-surface px-2.5 text-xs font-semibold text-page-secondary transition hover:text-page"
                >
                  <Copy size={13} className="mr-1" />
                  复制
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-page-divider bg-page-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-page">我的渠道 Key</h2>
            <p className="text-sm text-page-secondary">这里管理当前官方渠道生成的 Key。</p>
          </div>
          {user && (
            <button
              type="button"
              onClick={onRefreshTokens}
              className="inline-flex h-9 items-center rounded-lg border border-page-divider px-3 text-sm font-semibold text-page-secondary transition hover:text-page"
            >
              <RefreshCw size={15} className="mr-2" />
              刷新
            </button>
          )}
        </div>

        {!user ? (
          <div className="mt-4 rounded-xl border border-dashed border-page-divider bg-page-inset px-4 py-8 text-center">
            <p className="text-sm font-semibold text-page">登录后可以生成和管理该渠道 Key</p>
            <p className="mt-1 text-xs text-page-secondary">Key 会绑定当前经营站和当前官方渠道。</p>
          </div>
        ) : loading ? (
          <LoadingBlock label={t('common.loading')} compact />
        ) : tokens.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-page-divider bg-page-inset px-4 py-8 text-center">
            <p className="text-sm font-semibold text-page">还没有生成这个渠道的 Key</p>
            <p className="mt-1 text-xs text-page-secondary">点击上方生成按钮后会显示在这里。</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {tokens.map((token) => {
              const value = fullKey(token.key);
              return (
                <div key={token.id} className="rounded-xl border border-page-divider bg-page-inset p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-page">{token.name || '官方渠道 Key'}</p>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-page-success">
                          已绑定该渠道
                        </span>
                      </div>
                      <code className="mt-2 block break-all rounded-lg bg-page-surface px-3 py-2 text-xs text-page-muted">
                        {value}
                      </code>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyText(value, 'Key 已复制')}
                        className="inline-flex h-9 items-center rounded-lg border border-page-divider px-3 text-xs font-semibold text-page-secondary transition hover:text-page"
                      >
                        <Copy size={14} className="mr-1.5" />
                        复制
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteToken(token)}
                        className="inline-flex h-9 items-center rounded-lg border border-red-500/20 px-3 text-xs font-semibold text-page-danger transition hover:bg-red-500/10"
                      >
                        <Trash2 size={14} className="mr-1.5" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
