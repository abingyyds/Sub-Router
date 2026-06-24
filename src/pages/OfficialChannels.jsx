import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { getSiteOfficialChannels } from '../api';

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

export default function OfficialChannels() {
  const { t } = useTranslation();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadChannels = () => {
    setLoading(true);
    getSiteOfficialChannels()
      .then((res) => {
        if (res.data.success) {
          setChannels(res.data.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const summary = useMemo(() => {
    return channels.reduce(
      (acc, item) => {
        acc.models += Number(item.usable_model_count || 0);
        acc.keys += Number(item.available_key_count || 0);
        acc.providers += Number(item.available_provider_count || 0);
        const min = Number(item.min_allowed_final_discount || item.min_allowed_price_discount || item.min_price_discount || 0);
        if (min > 0 && (acc.min === 0 || min < acc.min)) acc.min = min;
        return acc;
      },
      { models: 0, keys: 0, providers: 0, min: 0 },
    );
  }, [channels]);

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
        <div className="flex items-center justify-center py-20 text-page-secondary">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('common.loading')}
        </div>
      ) : channels.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-page-divider bg-page-surface px-5 py-12 text-center">
          <div className="text-base font-semibold text-page">{t('officialChannels.emptyTitle')}</div>
          <p className="mt-2 text-sm text-page-secondary">{t('officialChannels.emptyDesc')}</p>
        </div>
      ) : (
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {channels.map((channel) => (
            <article key={channel.official_channel_id} className="glass rounded-2xl p-5 shadow-sm">
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
                  <Metric label={t('officialChannels.lowestPrice')} value={formatPriceMultiplier(channel.min_allowed_final_discount || channel.min_allowed_price_discount || channel.min_price_discount)} />
                  <Metric label={t('officialChannels.maxPrice')} value={formatPriceMultiplier(channel.max_final_discount || channel.max_discount)} />
                  <Metric label={t('officialChannels.markup')} value={formatMarkup(channel.markup_percent)} />
                  <Metric label={t('officialChannels.priceRange')} value={`${formatPriceMultiplier(channel.min_allowed_final_discount || channel.min_allowed_price_discount || channel.min_price_discount)} - ${formatPriceMultiplier(channel.max_final_discount || channel.max_discount)}`} />
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Metric label={t('officialChannels.models')} value={formatCount(channel.usable_model_count)} />
                  <Metric label={t('officialChannels.keys')} value={formatCount(channel.available_key_count)} />
                  <Metric label={t('officialChannels.providers')} value={formatCount(channel.available_provider_count)} />
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
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
