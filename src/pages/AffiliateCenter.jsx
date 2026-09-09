import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Copy,
  CreditCard,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAffCode, getAffDashboard } from "../api";
import { useCurrency } from "../context/SiteContext";
import { formatSiteQuota } from "../utils/logBilling";

const RANGES = [7, 30, 90];
const PAGE_SIZE = 20;

const formatTime = (timestamp) => {
  if (!timestamp) return "-";
  return new Date(timestamp * 1000).toLocaleString();
};

const formatCount = (value) => Number(value || 0).toLocaleString();
const formatPercent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;
const clampPercent = (value, total) =>
  total > 0 ? Math.min(100, Math.max(0, (Number(value || 0) / total) * 100)) : 0;

function MetricCard({ icon: Icon, label, value, hint, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-500/10 text-page-link",
    green: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    sky: "bg-sky-500/10 text-sky-600",
    rose: "bg-rose-500/10 text-rose-600",
    violet: "bg-violet-500/10 text-violet-600",
  };

  return (
    <article className="glass min-w-0 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-page-secondary">{label}</p>
          <p className="mt-2 break-words text-xl font-semibold tabular-nums text-page">
            {value}
          </p>
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 min-h-4 text-xs text-page-muted">{hint}</p>
    </article>
  );
}

function FunnelStep({ label, value, total, detail, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-500",
    sky: "bg-sky-500",
    green: "bg-emerald-500",
  };
  const percent = clampPercent(value, total);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-page">{label}</p>
          <p className="mt-0.5 truncate text-xs text-page-muted">{detail}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-page">{formatCount(value)}</p>
          <p className="text-xs tabular-nums text-page-muted">{percent.toFixed(1)}%</p>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-page-surface-hover">
        <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function PeriodMetric({ label, value, tone = "text-page" }) {
  return (
    <div className="min-w-0 border-l border-page-divider pl-3 first:border-l-0 first:pl-0">
      <p className="text-xs text-page-muted">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function TrendChart({ title, description, data, series, emptyLabel, formatValue = formatCount }) {
  const maximum = useMemo(
    () =>
      Math.max(
        1,
        ...data.flatMap((item) =>
          series.map((itemSeries) => Number(item[itemSeries.key] || 0)),
        ),
      ),
    [data, series],
  );
  const hasData = data.some((item) =>
    series.some((itemSeries) => Number(item[itemSeries.key] || 0) > 0),
  );

  return (
    <section className="glass min-w-0 rounded-xl p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-page">{title}</h2>
          <p className="mt-1 text-xs text-page-muted">{description}</p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-page-secondary">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      {hasData ? (
        <div className="overflow-x-auto pb-1">
          <div
            className="flex h-44 items-end gap-1.5 border-b border-page-divider pt-4"
            style={{ minWidth: `${Math.max(360, data.length * 18)}px` }}
          >
            {data.map((point) => (
              <div
                key={point.date}
                className="flex min-w-0 flex-1 items-end justify-center gap-px self-stretch"
              >
                {series.map((item) => {
                  const value = Number(point[item.key] || 0);
                  const height = value > 0 ? Math.max(3, (value / maximum) * 100) : 0;
                  return (
                    <span
                      key={item.key}
                      className={`w-full rounded-t-sm transition-opacity hover:opacity-75 ${item.color}`}
                      style={{ height: `${height}%` }}
                      title={`${point.date} · ${item.label}: ${formatValue(value)}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div
            className="mt-2 flex justify-between text-[11px] text-page-muted"
            style={{ minWidth: `${Math.max(360, data.length * 18)}px` }}
          >
            <span>{data[0]?.date?.slice(5)}</span>
            <span>{data[data.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center text-sm text-page-muted">{emptyLabel}</div>
      )}
    </section>
  );
}

function InviteeName({ user }) {
  const name = user.display_name || user.username || `ID ${user.id}`;

  return (
    <div className="min-w-0">
      <p className="max-w-44 truncate font-medium text-page">{name}</p>
      {user.display_name && <p className="max-w-44 truncate text-xs text-page-muted">{user.username}</p>}
    </div>
  );
}

export default function AffiliateCenter() {
  const { t } = useTranslation();
  const { symbol, rate } = useCurrency();
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState("");
  const [dashboard, setDashboard] = useState(null);

  const loadLink = useCallback(async () => {
    try {
      const response = await getAffCode();
      if (response.data?.success && response.data.data) {
        setLink(`${window.location.origin}/register?aff=${response.data.data}`);
      }
    } catch {
      // The shared interceptor provides feedback for failed API requests.
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAffDashboard({ days, page, page_size: PAGE_SIZE });
      if (response.data?.success) {
        setDashboard(response.data.data);
      }
    } catch {
      toast.error(t("affiliate.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [days, page, t]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const setRange = (nextDays) => {
    setDays(nextDays);
    setPage(1);
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("affiliate.copied"));
    } catch {
      toast.error(t("affiliate.copyFailed"));
    }
  };

  const summary = dashboard?.summary || {};
  const trend = dashboard?.trend || [];
  const users = dashboard?.users || [];
  const total = Number(dashboard?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const formatQuota = useCallback(
    (quota) => formatSiteQuota(quota, symbol, rate),
    [rate, symbol],
  );
  const period = useMemo(
    () =>
      trend.reduce(
        (totals, point) => ({
          newInvites: totals.newInvites + Number(point.new_invites || 0),
          activeUsers: totals.activeUsers + Number(point.active_users || 0),
          requests: totals.requests + Number(point.requests || 0),
          consumeQuota: totals.consumeQuota + Number(point.consume_quota || 0),
          topupQuota: totals.topupQuota + Number(point.topup_quota || 0),
          commissionQuota: totals.commissionQuota + Number(point.commission_quota || 0),
        }),
        {
          newInvites: 0,
          activeUsers: 0,
          requests: 0,
          consumeQuota: 0,
          topupQuota: 0,
          commissionQuota: 0,
        },
      ),
    [trend],
  );

  const totalInvites = Number(summary.total_invites || 0);
  const activeUsers = Number(summary.active_users || 0);
  const payingUsers = Number(summary.paying_users || 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-page-link">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {t("affiliate.siteScope")}
          </div>
          <h1 className="text-2xl font-heading font-bold text-page">{t("affiliate.title")}</h1>
          <p className="mt-1 text-sm text-page-secondary">{t("affiliate.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-page-divider bg-page-surface p-1" role="group" aria-label={t("affiliate.range")}>
            {RANGES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={`h-8 rounded-md px-3 text-xs font-medium transition-colors ${days === item ? "bg-brand-500 text-white shadow-sm" : "text-page-secondary hover:bg-page-surface-hover hover:text-page"}`}
              >
                {t(`affiliate.range${item}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            className="btn-secondary inline-flex h-10 w-10 items-center justify-center p-0"
            disabled={loading}
            title={t("common.refresh")}
            aria-label={t("common.refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <section className="glass mb-6 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-sm font-medium text-page-label" htmlFor="affiliate-link">
              {t("affiliate.inviteLink")}
            </label>
            <div className="flex gap-2">
              <input
                id="affiliate-link"
                value={link}
                readOnly
                className="input min-w-0 flex-1 bg-page-surface-hover/60 text-page-secondary"
                aria-label={t("affiliate.inviteLink")}
              />
              <button
                type="button"
                onClick={copyLink}
                className="btn-primary flex h-10 w-10 shrink-0 items-center justify-center p-0"
                disabled={!link}
                title={t("affiliate.copy")}
                aria-label={t("affiliate.copy")}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 border-t border-page-divider pt-3 lg:max-w-sm lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <TrendingUp className="h-4 w-4 shrink-0 text-page-link" />
            <p className="text-sm text-page-secondary">{t("affiliate.inviteLinkHint")}</p>
          </div>
        </div>
      </section>

      {loading && !dashboard ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="glass h-32 animate-pulse rounded-xl bg-page-surface" />
          ))}
        </div>
      ) : (
        <div className={loading ? "opacity-70 transition-opacity" : "transition-opacity"} aria-busy={loading}>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard icon={Users} label={t("affiliate.totalInvites")} value={formatCount(totalInvites)} hint={t("affiliate.totalInvitesHint")} />
            <MetricCard icon={UserCheck} label={t("affiliate.activeUsers")} value={formatCount(activeUsers)} hint={`${t("affiliate.activeRate")}: ${formatPercent(summary.active_rate)}`} tone="sky" />
            <MetricCard icon={CreditCard} label={t("affiliate.payingUsers")} value={formatCount(payingUsers)} hint={`${t("affiliate.payingRate")}: ${formatPercent(summary.paying_rate)}`} tone="green" />
            <MetricCard icon={MousePointerClick} label={t("affiliate.totalConsumption")} value={formatQuota(summary.total_consume_quota)} hint={`${t("affiliate.requests")}: ${formatCount(summary.total_requests)}`} tone="amber" />
            <MetricCard icon={WalletCards} label={t("affiliate.totalTopups")} value={formatQuota(summary.total_topup_quota)} hint={t("affiliate.totalTopupsHint")} tone="violet" />
            <MetricCard icon={CircleDollarSign} label={t("affiliate.totalCommission")} value={formatQuota(summary.commission_quota)} hint={t("affiliate.totalCommissionHint")} tone="rose" />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
            <section className="glass rounded-xl p-4 sm:p-5">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-page-link">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-page">{t("affiliate.funnel")}</h2>
                  <p className="mt-1 text-xs text-page-muted">{t("affiliate.funnelSubtitle")}</p>
                </div>
              </div>
              <div className="space-y-5">
                <FunnelStep label={t("affiliate.registeredUsers")} value={totalInvites} total={totalInvites} detail={t("affiliate.registeredDetail")} />
                <FunnelStep label={t("affiliate.activeUsers")} value={activeUsers} total={totalInvites} detail={t("affiliate.callsDetail", { count: formatCount(summary.total_requests) })} tone="sky" />
                <FunnelStep label={t("affiliate.payingUsers")} value={payingUsers} total={totalInvites} detail={formatQuota(summary.total_topup_quota)} tone="green" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-page-divider pt-4">
                <PeriodMetric label={t("affiliate.averageConsumption")} value={formatQuota(summary.average_user_consume)} />
                <PeriodMetric label={t("affiliate.totalRequests")} value={formatCount(summary.total_requests)} tone="text-page-link" />
              </div>
            </section>

            <section className="glass min-w-0 rounded-xl p-4 sm:p-5">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                  <Activity className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-page">{t("affiliate.periodPerformance")}</h2>
                  <p className="mt-1 text-xs text-page-muted">{t("affiliate.periodPerformanceHint", { days })}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                <PeriodMetric label={t("affiliate.newInvites")} value={formatCount(period.newInvites)} />
                <PeriodMetric label={t("affiliate.periodActiveUsers")} value={formatCount(period.activeUsers)} tone="text-sky-600" />
                <PeriodMetric label={t("affiliate.requests")} value={formatCount(period.requests)} tone="text-page-link" />
                <PeriodMetric label={t("affiliate.totalConsumption")} value={formatQuota(period.consumeQuota)} tone="text-amber-600" />
                <PeriodMetric label={t("affiliate.totalTopups")} value={formatQuota(period.topupQuota)} tone="text-emerald-600" />
                <PeriodMetric label={t("affiliate.totalCommission")} value={formatQuota(period.commissionQuota)} tone="text-rose-600" />
              </div>
            </section>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TrendChart
              title={t("affiliate.conversionTrend")}
              description={t("affiliate.conversionTrendHint")}
              data={trend}
              emptyLabel={t("affiliate.noTrend")}
              series={[
                { key: "new_invites", label: t("affiliate.newInvites"), color: "bg-brand-500" },
                { key: "active_users", label: t("affiliate.activeUsers"), color: "bg-sky-500" },
                { key: "paying_users", label: t("affiliate.payingUsers"), color: "bg-emerald-500" },
              ]}
            />
            <TrendChart
              title={t("affiliate.valueTrend")}
              description={t("affiliate.valueTrendHint")}
              data={trend}
              emptyLabel={t("affiliate.noTrend")}
              formatValue={formatQuota}
              series={[
                { key: "consume_quota", label: t("affiliate.totalConsumption"), color: "bg-amber-500" },
                { key: "topup_quota", label: t("affiliate.totalTopups"), color: "bg-emerald-500" },
                { key: "commission_quota", label: t("affiliate.totalCommission"), color: "bg-rose-500" },
              ]}
            />
          </section>

          <section className="glass mt-6 overflow-hidden rounded-xl">
            <div className="flex flex-col gap-3 border-b border-page-divider px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-page-link" />
                <div>
                  <h2 className="text-base font-semibold text-page">{t("affiliate.invitees")}</h2>
                  <p className="mt-0.5 text-xs text-page-muted">{t("affiliate.inviteesHint")}</p>
                </div>
              </div>
              <span className="text-sm text-page-secondary">{t("affiliate.total", { count: formatCount(total) })}</span>
            </div>

            {users.length === 0 ? (
              <div className="flex min-h-52 items-center justify-center px-4 text-sm text-page-muted">
                {t("affiliate.noInvitees")}
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[940px] text-sm">
                    <thead className="border-b border-page-divider bg-page-surface-hover/50 text-left text-xs text-page-secondary">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t("affiliate.invitee")}</th>
                        <th className="px-4 py-3 font-medium">{t("affiliate.registeredAt")}</th>
                        <th className="px-4 py-3 text-right font-medium">{t("affiliate.requests")}</th>
                        <th className="px-4 py-3 text-right font-medium">{t("affiliate.totalConsumption")}</th>
                        <th className="px-4 py-3 text-right font-medium">{t("affiliate.totalTopups")}</th>
                        <th className="px-4 py-3 text-right font-medium">{t("affiliate.totalCommission")}</th>
                        <th className="px-4 py-3 font-medium">{t("affiliate.lastActive")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-page-divider">
                      {users.map((user) => (
                        <tr key={user.id} className="text-page transition-colors hover:bg-page-surface-hover/60">
                          <td className="px-4 py-3"><InviteeName user={user} /></td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-page-secondary">{formatTime(user.created_time)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCount(user.request_count)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatQuota(user.used_quota)}</td>
                          <td className={`px-4 py-3 text-right font-medium tabular-nums ${user.has_topup ? "text-page-success" : "text-page-muted"}`}>{formatQuota(user.topup_quota)}</td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-page-success">{formatQuota(user.commission_quota)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-page-secondary">{formatTime(user.last_active_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-page-divider md:hidden">
                  {users.map((user) => (
                    <article key={user.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <InviteeName user={user} />
                        <span className="shrink-0 text-xs text-page-muted">{formatTime(user.created_time)}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                        <div><p className="text-page-muted">{t("affiliate.requests")}</p><p className="mt-1 font-medium tabular-nums text-page">{formatCount(user.request_count)}</p></div>
                        <div><p className="text-page-muted">{t("affiliate.lastActive")}</p><p className="mt-1 truncate font-medium text-page">{formatTime(user.last_active_time)}</p></div>
                        <div><p className="text-page-muted">{t("affiliate.totalConsumption")}</p><p className="mt-1 font-medium tabular-nums text-page">{formatQuota(user.used_quota)}</p></div>
                        <div><p className="text-page-muted">{t("affiliate.totalTopups")}</p><p className={`mt-1 font-medium tabular-nums ${user.has_topup ? "text-page-success" : "text-page-muted"}`}>{formatQuota(user.topup_quota)}</p></div>
                        <div><p className="text-page-muted">{t("affiliate.totalCommission")}</p><p className="mt-1 font-medium tabular-nums text-page-success">{formatQuota(user.commission_quota)}</p></div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 border-t border-page-divider px-4 py-3">
                <span className="text-sm text-page-secondary">{t("affiliate.page", { page, total: totalPages })}</span>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary h-8 px-3 text-sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>{t("affiliate.previous")}</button>
                  <button type="button" className="btn-secondary h-8 px-3 text-sm" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>{t("affiliate.next")}</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
