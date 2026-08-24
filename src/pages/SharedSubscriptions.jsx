import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Clock3,
  CircleDollarSign,
  ClipboardPaste,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileUp,
  HandCoins,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  UserRoundPlus,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Q,
  cancelSharedPayout,
  completeSharedOAuth,
  createSharedPlanToken,
  createSharedPayout,
  deleteToken,
  deleteSharedAccount,
  getSharedEarnings,
  getSharedPaymentProfile,
  getSharedPayouts,
  getSharedPlanCatalog,
  getSharedPlans,
  getSharedPlanProbes,
  getSharedSupplies,
  getTokens,
  importSharedAccounts,
  saveSharedPaymentProfile,
  startSharedOAuth,
  transferSharedEarnings,
  updateSharedAccountStatus,
} from "../api";
import { useCurrency, useSite } from "../context/SiteContext";
import {
  SHARED_ACCOUNT_IMPORT_EXAMPLE,
  parseSharedAccountBackup,
} from '../utils/sharedAccountBatchImport';
import { parseSharedProxyInput } from '../utils/sharedProxy';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
const translate = (key, options) => i18n.t(key, options);
const dataOf = (response) => response?.data?.data || {};

const downloadJSONExample = (filename, value) => {
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(value, null, 2)}\n`], {
      type: "application/json;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const openAuthorizationWindow = (url) => {
  if (!url) return;
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (popup) popup.opener = null;
};

const providerStateFromURL = (url) => {
  try {
    return new URL(url).searchParams.get("state") || "";
  } catch {
    return "";
  }
};

export default function SharedSubscriptions() {
  useTranslation();
  const { fmt } = useCurrency();
  const { site } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const fullMode = site?.full_mode === true || site?.display_mode === "full";
  const [tab, setTab] = useState(() => {
    const requested = searchParams.get("tab");
    return ["hosting", "earnings", "settlement", "rules", "market"].includes(
      requested,
    )
      ? requested
      : "market";
  });
  const [plans, setPlans] = useState([]);
  const [planCatalog, setPlanCatalog] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [earnings, setEarnings] = useState({ wallet: {}, items: [] });
  const [payouts, setPayouts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [initialImportPlatform, setInitialImportPlatform] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    method: "alipay",
    details: "",
  });
  const [amount, setAmount] = useState("");
  const [tokens, setTokens] = useState([]);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [probePeriod, setProbePeriod] = useState("24h");
  const [probeData, setProbeData] = useState(null);
  const [probeLoading, setProbeLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        plansRes,
        catalogRes,
        suppliesRes,
        earningsRes,
        profileRes,
        payoutsRes,
        tokensRes,
      ] = await Promise.all([
        getSharedPlans(),
        getSharedPlanCatalog(),
        getSharedSupplies(),
        getSharedEarnings(),
        getSharedPaymentProfile(),
        getSharedPayouts(),
        getTokens(),
      ]);
      if (plansRes.data.success) setPlans(dataOf(plansRes));
      if (catalogRes.data.success) setPlanCatalog(dataOf(catalogRes));
      if (suppliesRes.data.success) setSupplies(dataOf(suppliesRes));
      if (earningsRes.data.success) setEarnings(dataOf(earningsRes));
      if (profileRes.data.success) setProfile(dataOf(profileRes));
      if (payoutsRes.data.success) {
        setPayouts(dataOf(payoutsRes).items || []);
      }
      if (tokensRes.data.success) setTokens(dataOf(tokensRes));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeTab = (value) => {
    setTab(value);
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  const createPlanKey = async (entry, smart = false) => {
    if (!entry?.plan?.id) return;
    try {
      const suffix = smart ? translate('智能路由') : translate('固定');
      const response = await createSharedPlanToken(
        entry.plan.id,
        `${entry.plan.title} ${suffix} Key`,
        smart,
      );
      if (!response.data.success) {
        throw new Error(response.data.message || translate('生成 Key 失败'));
      }
      setGeneratedToken(response.data.data);
      toast.success(translate('Key 已生成'));
      await load();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          translate('生成 Key 失败'),
      );
    }
  };

  const loadPlanProbes = async (entry, period = probePeriod) => {
    if (!entry?.plan?.id) return;
    setSelectedPlan(entry);
    setProbePeriod(period);
    setProbeLoading(true);
    try {
      const response = await getSharedPlanProbes(entry.plan.id, period);
      if (!response.data.success) throw new Error(response.data.message);
      setProbeData(dataOf(response));
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          translate('可用度加载失败'),
      );
      setProbeData(null);
    } finally {
      setProbeLoading(false);
    }
  };

  const saveProfile = async () => {
    const response = await saveSharedPaymentProfile(paymentForm);
    if (response.data.success) {
      toast.success(translate('收款资料已保存'));
      setPaymentForm((previous) => ({ ...previous, details: '' }));
      await load();
    }
  };

  const amountQuota = () => Math.round(Number(amount || 0) * Q);

  const transfer = async () => {
    if (amountQuota() <= 0) {
      toast.error(translate('请输入金额'));
      return;
    }
    const response = await transferSharedEarnings({
      amount_quota: amountQuota(),
    });
    if (response.data.success) {
      toast.success(translate('已转入账户余额'));
      setAmount('');
      await load();
    }
  };

  const payout = async () => {
    if (amountQuota() <= 0) {
      toast.error(translate('请输入金额'));
      return;
    }
    const method = profile?.method || paymentForm.method;
    const response = await createSharedPayout({
      amount_quota: amountQuota(),
      method,
      note: "",
    });
    if (response.data.success) {
      toast.success(translate('提现申请已提交'));
      setAmount('');
      await load();
    }
  };

  const hostedAccounts = supplies.flatMap((entry) =>
    (entry.accounts || []).map((account) => ({
      account,
      supply: entry.supply,
      plan: entry.plan,
    })),
  );
  const onlineAccounts = hostedAccounts.filter(
    ({ account }) => account.schedulable && account.status === "active",
  ).length;
  const earningRows = (earnings.items || []).filter(
    (item) => item.entry_type === "earning_pending",
  );
  const sharedTokens = tokens.filter(
    (token) => token.type === "shared" || token.include_shared_subscriptions,
  );
  const metrics = [
    {
      label: translate('可用收益'),
      value: fmt(Number(earnings.wallet?.available_quota || 0) / Q, 2),
      note: translate('可转入平台余额或申请提现'),
      icon: Wallet,
    },
    {
      label: translate('待释放收益'),
      value: fmt(Number(earnings.wallet?.pending_quota || 0) / Q, 2),
      note: translate('调用后 7 天自动释放'),
      icon: Clock3,
    },
    {
      label: translate('累计收益'),
      value: fmt(Number(earnings.wallet?.lifetime_quota || 0) / Q, 2),
      note: translate('近 30 天 {{value1}}', {
        value1: fmt(Number(earnings.last_30_days_quota || 0) / Q, 2),
      }),
      icon: HandCoins,
    },
    {
      label: translate('在线容量'),
      value: `${onlineAccounts} / ${hostedAccounts.length}`,
      note: translate('已启用账号 / 全部账号'),
      icon: UsersRound,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 border-b border-page-divider pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className='text-2xl font-bold text-page sm:text-3xl'>
            {translate('订阅共享')}
          </h1>
          <p className='mt-1 text-sm text-page-secondary'>
            {translate('使用站长已进货上架的共享套餐、贡献账号并管理收益')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              changeTab("hosting");
              setBatchOpen(true);
            }}
          >
            <FileUp size={16} className='mr-2' />
            {translate('批量导入')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              changeTab("hosting");
              setInitialImportPlatform("");
              setImportOpen(true);
            }}
          >
            <UserRoundPlus size={16} className='mr-2' />
            {translate('添加托管账号')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={load}
            title={translate('刷新')}
            aria-label={translate('刷新')}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <section className="mt-5 grid overflow-hidden rounded-lg border border-page-divider bg-page-surface sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon }, index) => (
          <div
            key={label}
            className={`flex min-h-28 gap-3 px-4 py-5 ${index ? "border-t border-page-divider sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0" : ""}`}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-page-inset text-page-link">
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-sm text-page-muted">{label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-page">
                {value}
              </div>
              <div className="mt-1 text-xs leading-5 text-page-muted">
                {note}
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-5 flex max-w-full overflow-x-auto border-b border-page-divider">
        {[
          ['market', translate('共享市场')],
          ['hosting', translate('托管账号')],
          ['earnings', translate('收益明细')],
          ['settlement', translate('结算')],
          ['rules', translate('规则与费率')],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => changeTab(value)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
              tab === value
                ? "border-page-link text-page"
                : "border-transparent text-page-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "market" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.length === 0 ? (
              <div className='col-span-full rounded-lg border border-dashed border-page-divider px-5 py-12 text-center text-sm text-page-muted'>
                {translate('当前没有已上架且健康可调度的共享套餐')}
              </div>
            ) : (
              plans.map((entry) => (
                <article
                  key={entry.plan.id}
                  className="flex min-h-[440px] flex-col rounded-lg border border-page-divider bg-page-surface p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-page-inset text-lg font-bold text-page-link">
                      {(entry.plan.title || "S").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-semibold text-page">
                          {entry.plan.title}
                        </h2>
                        <span className='rounded border border-page-divider px-1.5 py-0.5 text-[10px] font-medium text-page-link'>
                          {translate('平台官方')}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-page-muted">
                        @{entry.plan.slug}
                      </p>
                    </div>
                    <Database size={18} className="shrink-0 text-page-link" />
                  </div>

                  <p className="mt-3 min-h-10 text-sm leading-5 text-page-secondary">
                    {entry.plan.description ||
                      translate('平台官方运营的 {{value1}} 订阅共享池', {
                        value1: entry.plan.title,
                      })}
                  </p>

                  {entry.pool_status?.total_accounts > 0 && (
                    <div className='mt-3 border-y border-page-divider py-3'>
                      <div className='flex items-center justify-between gap-3 text-xs'>
                        <span className='font-medium text-page'>
                          {translate('号池实时状态')}
                        </span>
                        <span
                          className={
                            entry.pool_status.health === "healthy"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }
                        >
                          {entry.pool_status.available_accounts}/
                          {entry.pool_status.total_accounts}
                          {translate('可用')}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="font-semibold tabular-nums text-page">
                            {entry.pool_status.available_concurrency}/
                            {entry.pool_status.total_concurrency}
                          </div>
                          <div className='text-[11px] text-page-muted'>
                            {translate('并发容量')}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                            {entry.pool_status.rate_limited_accounts || 0}
                          </div>
                          <div className='text-[11px] text-page-muted'>
                            {translate('限流账号')}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold tabular-nums text-page">
                            {Math.max(
                              0,
                              Number(
                                entry.pool_status.unavailable_accounts || 0,
                              ) -
                                Number(
                                  entry.pool_status.rate_limited_accounts || 0,
                                ),
                            )}
                          </div>
                          <div className='text-[11px] text-page-muted'>
                            {translate('其他不可用')}
                          </div>
                        </div>
                      </div>
                      {(entry.pool_status.next_recovery_at ||
                        entry.pool_status.last_synced_at) && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-page-muted">
                          {entry.pool_status.next_recovery_at && (
                            <span className="inline-flex items-center gap-1">
                              <Clock3 size={11} />
                              {translate('最近恢复')}{' '}
                              {new Date(
                                entry.pool_status.next_recovery_at,
                              ).toLocaleString()}
                            </span>
                          )}
                          {entry.pool_status.last_synced_at && (
                            <span>
                              {translate('同步于')}{' '}
                              {new Date(
                                entry.pool_status.last_synced_at,
                              ).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-2 border-b border-page-divider pb-3 text-center">
                    <div>
                      <div className="text-sm font-semibold text-page">
                        {entry.models?.length || 0}
                      </div>
                      <div className='text-[11px] text-page-muted'>
                        {translate('模型')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-page">
                        {entry.subscription_count || 0}
                      </div>
                      <div className='text-[11px] text-page-muted'>
                        {translate('订阅')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-page">
                        {Number(entry.availability) >= 0
                          ? `${Number(entry.availability).toFixed(1)}%`
                          : "--"}
                      </div>
                      <div className='text-[11px] text-page-muted'>
                        {translate('可用度')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex-1 space-y-2">
                    {(entry.models || []).slice(0, 4).map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-page">
                          {model.model_name}
                        </span>
                        <AvailabilityStrip
                          windows={model.availability_windows}
                        />
                      </div>
                    ))}
                    {(entry.models || []).length > 4 && (
                      <p className='text-xs text-page-muted'>
                        {translate('另有 {{count}} 个模型', {
                          count: (entry.models || []).length - 4,
                        })}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => createPlanKey(entry, false)}
                    >
                      <KeyRound size={15} className='mr-1.5' />
                      {translate('生成固定 Key')}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => loadPlanProbes(entry)}
                    >
                      <ShieldCheck size={15} className='mr-1.5' />
                      {translate('查看可用度')}
                    </button>
                    {fullMode && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => createPlanKey(entry, true)}
                      >
                        <KeyRound size={15} className='mr-1.5' />
                        {translate('智能路由 Key')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-secondary col-span-2"
                      onClick={() => {
                        changeTab("hosting");
                        setInitialImportPlatform(entry.plan.vendor || "");
                        setImportOpen(true);
                      }}
                    >
                      <Upload size={15} className='mr-1.5' />
                      {translate('接入账号')}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <SharedKeyManager
            tokens={sharedTokens}
            onDelete={async (token) => {
              if (
                !window.confirm(
                  translate('确认删除 Key「{{value1}}」？', {
                    value1: token.name,
                  }),
                )
              )
                return;
              await deleteToken(token.id);
              await load();
            }}
          />

          {selectedPlan && (
            <PlanAvailabilityPanel
              entry={selectedPlan}
              period={probePeriod}
              data={probeData}
              loading={probeLoading}
              onPeriodChange={(period) => loadPlanProbes(selectedPlan, period)}
              onClose={() => {
                setSelectedPlan(null);
                setProbeData(null);
              }}
            />
          )}
        </div>
      )}

      {tab === "hosting" && (
        <HostedAccounts
          rows={hostedAccounts}
          onAdd={() => {
            setInitialImportPlatform("");
            setImportOpen(true);
          }}
          onToggle={async (account, enabled) => {
            await updateSharedAccountStatus(account.id, enabled);
            await load();
          }}
          onDelete={async (account) => {
            if (!window.confirm(translate('确认删除这个共享账号？'))) return;
            await deleteSharedAccount(account.id);
            toast.success(translate('已删除'));
            await load();
          }}
        />
      )}

      {tab === 'earnings' && (
        <section className='mt-6'>
          <div className='mb-4'>
            <h2 className='text-lg font-semibold text-page'>
              {translate('收益明细')}
            </h2>
            <p className='mt-1 text-sm text-page-muted'>
              {translate(
                '每笔收益对应真实用量，并按调用发生时保存的分成比例计算。',
              )}
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-page-divider">
            <table className="w-full min-w-[840px] text-sm">
              <thead className="bg-page-inset text-left text-page-muted">
                <tr>
                  <th className='px-4 py-3'>{translate('调用时间')}</th>
                  <th className='px-4 py-3'>{translate('托管账号')}</th>
                  <th className='px-4 py-3'>{translate('模型')}</th>
                  <th className='px-4 py-3 text-right'>
                    {translate('计费金额')}
                  </th>
                  <th className='px-4 py-3 text-right'>
                    {translate('分成比例')}
                  </th>
                  <th className='px-4 py-3 text-right'>{translate('收益')}</th>
                  <th className='px-4 py-3'>{translate('释放状态')}</th>
                </tr>
              </thead>
              <tbody>
                {earningRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-page-muted"
                    >
                      {translate('暂无收益记录')}
                    </td>
                  </tr>
                ) : (
                  earningRows.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-page-divider text-page"
                    >
                      <td className="px-4 py-3">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {item.account_name ||
                          item.plan_title ||
                          translate('shared.supplyNumber', {
                            id: item.supply_id,
                          })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.model_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmt(Number(item.charged_quota || 0) / Q, 6)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(Number(item.revenue_bps || 0) / 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmt(Number(item.amount_quota || 0) / Q, 6)}
                      </td>
                      <td className='px-4 py-3'>
                        {item.released_at
                          ? translate('已释放')
                          : translate('待释放')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "rules" && (
        <section className="mt-6 space-y-5">
          <div>
            <h2 className='text-lg font-semibold text-page'>
              {translate('托管规则与分成')}
            </h2>
            <p className='mt-1 text-sm text-page-muted'>
              {translate(
                '贡献者分成遵循平台套餐配置；分站订单剩余抽成由站长与主平台各获得 50%。',
              )}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {planCatalog.map((plan) => (
              <div
                key={plan.id}
                className="rounded-lg border border-page-divider bg-page-surface p-4"
              >
                <p className='font-medium text-page'>{plan.title}</p>
                <p className='mt-3 text-xs text-page-muted'>
                  {translate('贡献者分成')}
                </p>
                <p className='mt-1 text-xl font-semibold text-page'>
                  {(Number(plan.contributor_revenue_bps || 0) / 100).toFixed(1)}
                  %
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              [
                '01',
                translate('即时上线与套餐检测'),
                translate(
                  'OAuth 账号导入并通过测试后立即进入调度，套餐和模型自动识别。',
                ),
              ],
              [
                '02',
                translate('按真实用量计费'),
                translate('只有账号实际承担且成功计费的请求才会生成收益记录。'),
              ],
              [
                '03',
                translate('7 天收益成熟期'),
                translate('新收益先进入待释放状态，成熟后转为可用收益。'),
              ],
              [
                '04',
                translate('账号自主控制'),
                translate('可随时暂停、恢复或移除账号，暂停后不再承接新请求。'),
              ],
              [
                '05',
                translate('分站抽成结算'),
                translate(
                  '贡献者分成后的抽成，50% 进入站长收益，50% 留给主平台。',
                ),
              ],
            ].map(([index, title, description]) => (
              <article
                key={index}
                className="border-t-2 border-page-divider pt-3"
              >
                <span className="text-xs font-semibold text-page-link">
                  {index}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-page">
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-page-muted">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "settlement" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              icon={Wallet}
              label={translate('可提现收益')}
              value={fmt(Number(earnings.wallet?.available_quota || 0) / Q, 4)}
            />
            <Metric
              icon={CircleDollarSign}
              label={translate('待释放收益')}
              value={fmt(Number(earnings.wallet?.pending_quota || 0) / Q, 4)}
            />
            <Metric
              icon={Wallet}
              label={translate('累计已提现')}
              value={fmt(Number(earnings.wallet?.withdrawn_quota || 0) / Q, 4)}
            />
          </div>
          <div className='grid gap-6 lg:grid-cols-2'>
            <section className='rounded-lg border border-page-divider bg-page-surface p-5'>
              <h2 className='font-semibold text-page'>
                {translate('收款资料')}
              </h2>
              {profile && (
                <p className="mt-2 text-sm text-page-secondary">
                  {profile.method} · {profile.details_masked}
                </p>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  className="input"
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm((previous) => ({
                      ...previous,
                      method: event.target.value,
                    }))
                  }
                  placeholder={translate('收款方式')}
                />
                <input
                  className="input"
                  value={paymentForm.details}
                  onChange={(event) =>
                    setPaymentForm((previous) => ({
                      ...previous,
                      details: event.target.value,
                    }))
                  }
                  placeholder={translate('收款账号')}
                />
              </div>
              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={saveProfile}
              >
                {translate('保存资料')}
              </button>
            </section>
            <section className='rounded-lg border border-page-divider bg-page-surface p-5'>
              <h2 className='font-semibold text-page'>
                {translate('收益操作')}
              </h2>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input mt-4"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={translate('USD 金额')}
              />
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={transfer}
                >
                  {translate('转入余额')}
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={payout}
                >
                  {translate('申请提现')}
                </button>
              </div>
            </section>
          </div>
          <section>
            <h2 className='text-lg font-semibold text-page'>
              {translate('提现记录')}
            </h2>
            <div className='mt-3 space-y-2'>
              {payouts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-page-divider bg-page-surface px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-page">
                      {fmt(Number(item.amount_quota || 0) / Q, 4)}
                    </span>
                    <span className='ml-3 text-page-muted'>
                      {translate(`shared.status.${item.status}`, {
                        defaultValue: item.status,
                      })}
                    </span>
                  </div>
                  {item.status === "pending" && (
                    <button
                      type="button"
                      className="text-page-danger"
                      onClick={async () => {
                        await cancelSharedPayout(item.id);
                        await load();
                      }}
                    >
                      {translate('取消')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <SharedAccountImportDialog
        open={importOpen}
        initialPlatform={initialImportPlatform}
        onClose={() => setImportOpen(false)}
        onDone={async () => {
          setImportOpen(false);
          await load();
        }}
      />
      <BatchImportDialog
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onDone={async () => {
          setBatchOpen(false);
          await load();
        }}
      />

      {generatedToken && (
        <div className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-page-divider p-5 shadow-xl"
            style={{ background: "var(--page-bg)" }}
          >
            <div className='flex items-start justify-between gap-4'>
              <div className='min-w-0'>
                <h2 className='break-words text-lg font-semibold text-page'>
                  {translate('共享订阅 Key 已生成')}
                </h2>
                <p className='mt-1 break-words text-sm text-page-muted'>
                  {translate('Key 只显示在当前窗口，请妥善保管。')}
                </p>
              </div>
              <button
                type="button"
                className="text-page-muted"
                onClick={() => setGeneratedToken(null)}
              >
                {translate('关闭')}
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-page-divider bg-page-inset p-3">
              <code className="min-w-0 flex-1 break-all text-xs text-page">
                sk-{generatedToken.key}
              </code>
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `sk-${generatedToken.key}`,
                  );
                  toast.success(translate('已复制'));
                }}
              >
                <Copy size={15} className='mr-1.5' />
                {translate('复制')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const sharedAccountTypes = {
  anthropic: [
    ["oauth", "Claude Code OAuth", "OAuth"],
    ["setup-token", "Claude Code Setup Token", "Setup Token"],
    ["bedrock", "AWS Bedrock", "SigV4"],
    ["service_account", "Vertex Service Account", "Service Account"],
  ],
  openai: [["oauth", "ChatGPT OAuth", "OAuth"]],
  gemini: [
    ["oauth:code_assist", "Gemini OAuth (Code Assist)", "OAuth"],
    ["oauth:google_one", "Gemini OAuth (Google One)", "OAuth"],
    ["service_account", "Vertex Service Account", "Service Account"],
  ],
  antigravity: [["oauth", "OAuth", "OAuth"]],
  grok: [["oauth", "OAuth", "OAuth"]],
};

const platformLabels = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
  antigravity: "Antigravity",
  grok: "Grok",
};

const platformInitials = {
  anthropic: "A",
  openai: "O",
  gemini: "G",
  antigravity: "AG",
  grok: "X",
};

function ModalShell({ open, title, description, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-page-divider shadow-2xl"
        style={{ background: "var(--page-bg)" }}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-page-divider px-5 py-4">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold text-page">{title}</h2>
            {description && (
              <p className="mt-1 break-words text-sm text-page-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            className="rounded p-1.5 text-page-muted hover:bg-page-inset hover:text-page"
            onClick={onClose}
            title={translate('关闭')}
            aria-label={translate('关闭')}
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
        {footer && (
          <footer className="flex shrink-0 justify-end gap-2 border-t border-page-divider px-5 py-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}

function SharedAccountImportDialog({ open, initialPlatform, onClose, onDone }) {
  const [platform, setPlatform] = useState("openai");
  const [accountType, setAccountType] = useState("oauth");
  const [authInput, setAuthInput] = useState("");
  const [authURL, setAuthURL] = useState("");
  const [authState, setAuthState] = useState("");
  const [providerState, setProviderState] = useState("");
  const [serviceAccountJSON, setServiceAccountJSON] = useState("");
  const [awsAccessKeyID, setAWSAccessKeyID] = useState("");
  const [awsSecretAccessKey, setAWSSecretAccessKey] = useState("");
  const [awsSessionToken, setAWSSessionToken] = useState("");
  const [awsRegion, setAWSRegion] = useState("us-east-1");
  const [proxyProtocol, setProxyProtocol] = useState("socks5");
  const [proxyHost, setProxyHost] = useState("");
  const [proxyPort, setProxyPort] = useState("");
  const [proxyUsername, setProxyUsername] = useState("");
  const [proxyPassword, setProxyPassword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const normalizedAccountType = accountType.startsWith("oauth:")
    ? "oauth"
    : accountType;
  const oauthType = accountType.startsWith("oauth:")
    ? accountType.split(":")[1]
    : "";
  const oauthAccount =
    normalizedAccountType === "oauth" ||
    normalizedAccountType === "setup-token";

  useEffect(() => {
    if (!open) return;
    const nextPlatform = sharedAccountTypes[initialPlatform]
      ? initialPlatform
      : "openai";
    setPlatform(nextPlatform);
    setAccountType(sharedAccountTypes[nextPlatform][0][0]);
    setAuthInput("");
    setAuthURL("");
    setAuthState("");
    setProviderState("");
    setServiceAccountJSON("");
    setAWSAccessKeyID("");
    setAWSSecretAccessKey("");
    setAWSSessionToken("");
    setAWSRegion("us-east-1");
    setProxyProtocol("socks5");
    setProxyHost("");
    setProxyPort("");
    setProxyUsername("");
    setProxyPassword("");
  }, [initialPlatform, open]);

  const resetAuthorization = () => {
    setAuthURL("");
    setAuthState("");
    setProviderState("");
    setAuthInput("");
  };

  const selectPlatform = (value) => {
    setPlatform(value);
    setAccountType(sharedAccountTypes[value][0][0]);
    resetAuthorization();
  };

  const selectAccountType = (value) => {
    setAccountType(value);
    resetAuthorization();
  };

  const proxyPayload = () => {
    const proxy = {
      protocol: proxyProtocol,
      host: proxyHost.trim(),
      port: Number(proxyPort || 0),
      username: proxyUsername.trim(),
      password: proxyPassword,
    };
    if (!proxy.host || proxy.port <= 0 || proxy.port > 65535) {
      throw new Error(translate('请输入有效的公网代理主机和端口'));
    }
    return proxy;
  };

  const applyProxyString = (value) => {
    const parsed = parseSharedProxyInput(value, proxyProtocol);
    if (!parsed) {
      toast.error(translate('无法识别代理格式，请检查主机、端口和认证信息'));
      return false;
    }
    setProxyProtocol(parsed.protocol);
    setProxyHost(parsed.host);
    setProxyPort(parsed.port);
    setProxyUsername(parsed.username);
    setProxyPassword(parsed.password);
    toast.success(translate('已自动识别代理信息'));
    return true;
  };

  const pasteProxyString = async () => {
    try {
      const value = await navigator.clipboard.readText();
      applyProxyString(value);
    } catch {
      toast.error(translate('无法读取剪贴板，请直接粘贴到主机输入框'));
    }
  };

  const handleProxyFieldPaste = (event) => {
    const value = event.clipboardData?.getData("text") || "";
    if (!parseSharedProxyInput(value, proxyProtocol)) return;
    event.preventDefault();
    applyProxyString(value);
  };

  const startOAuth = async () => {
    setGenerating(true);
    try {
      const response = await startSharedOAuth({
        platform,
        account_type: normalizedAccountType,
        oauth_type: oauthType,
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || translate('OAuth 启动失败'));
      }
      const session = dataOf(response);
      setAuthURL(session.auth_url || "");
      setAuthState(session.state || "");
      setProviderState(providerStateFromURL(session.auth_url || ""));
      setAuthInput("");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          translate('OAuth 启动失败'),
      );
    } finally {
      setGenerating(false);
    }
  };

  const completeOAuth = async () => {
    if (!authState) {
      toast.error(translate('请先生成授权链接'));
      return;
    }
    if (!authInput.trim()) {
      toast.error(translate('请输入授权链接或 Code'));
      return;
    }
    setSubmitting(true);
    try {
      const response = await completeSharedOAuth({
        state: authState,
        provider_state: providerState,
        code: authInput.trim(),
        concurrency: 1,
        priority: 0,
        proxy: proxyPayload(),
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || translate('接入失败'));
      }
      toast.success(translate('账号已接入，套餐已自动识别'));
      await onDone();
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || translate('接入失败'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitDirectAccount = async () => {
    let credentials;
    if (accountType === "bedrock") {
      if (!awsAccessKeyID.trim() || !awsSecretAccessKey.trim()) {
        toast.error(translate('请输入 AWS SigV4 凭证'));
        return;
      }
      credentials = {
        auth_mode: "sigv4",
        aws_access_key_id: awsAccessKeyID.trim(),
        aws_secret_access_key: awsSecretAccessKey.trim(),
        aws_region: awsRegion.trim() || "us-east-1",
      };
      if (awsSessionToken.trim()) {
        credentials.aws_session_token = awsSessionToken.trim();
      }
    } else {
      if (!serviceAccountJSON.trim()) {
        toast.error(translate('请输入 Service Account JSON'));
        return;
      }
      try {
        JSON.parse(serviceAccountJSON);
      } catch {
        toast.error(translate('Service Account JSON 格式无效'));
        return;
      }
      credentials = {
        service_account_json: serviceAccountJSON.trim(),
        tier_id: "vertex",
      };
    }
    setSubmitting(true);
    try {
      const response = await importSharedAccounts([
        {
          name: "",
          platform,
          type: normalizedAccountType,
          credentials,
          concurrency: 1,
          priority: 0,
          proxy: proxyPayload(),
        },
      ]);
      if (!response.data?.success || !response.data?.data?.succeeded) {
        throw new Error(
          response.data?.message ||
            response.data?.data?.items?.[0]?.message ||
            translate('接入失败'),
        );
      }
      toast.success(translate('账号已接入，套餐已自动识别'));
      await onDone();
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || translate('接入失败'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const callbackExample =
    platform === "grok"
      ? "http://127.0.0.1:56121/callback?code=...&state=..."
      : "http://localhost:xxxx/callback?code=...";

  return (
    <ModalShell
      open={open}
      title={translate('添加共享账号')}
      description={translate(
        '选择平台和账号类型后授权，系统会自动识别套餐并归入对应共享池。',
      )}
      onClose={onClose}
      footer={
        <>
          <button type='button' className='btn-secondary' onClick={onClose}>
            {translate('取消')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={oauthAccount ? completeOAuth : submitDirectAccount}
            disabled={submitting || generating}
          >
            {submitting && <Loader2 size={15} className='mr-2 animate-spin' />}
            {submitting ? translate('正在验证账号') : translate('提交')}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <div className='text-sm font-medium text-page-label'>
            {translate('选择平台')}
          </div>
          <div
            className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5'
            role='radiogroup'
            aria-label={translate('选择平台')}
          >
            {Object.entries(platformLabels).map(([value, label]) => {
              const selected = platform === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectPlatform(value)}
                  className={`relative flex min-h-[92px] min-w-0 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    selected
                      ? "border-brand-500 bg-brand-500/[0.08] shadow-sm"
                      : "border-page-divider bg-page-surface hover:border-brand-500/45 hover:bg-page-surface-hover"
                  }`}
                >
                  <span
                    className={`absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                      selected
                        ? "border-brand-500 bg-brand-500"
                        : "border-page-divider"
                    }`}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-md border border-page-divider bg-page-inset px-1 text-xs font-bold text-page">
                    {platformInitials[value]}
                  </span>
                  <span className="min-w-0 max-w-full">
                    <span className="block truncate text-xs font-semibold text-page">
                      {label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-page-muted">
                      OAuth
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-t border-page-divider pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-page-label">
            <span className="flex h-5 min-w-5 items-center justify-center rounded border border-page-divider bg-page-inset px-1 text-[9px] font-bold text-page">
              {platformInitials[platform]}
            </span>
            {platformLabels[platform]}
            {translate('账号类型')}
          </div>
          <div
            className='mt-3 grid gap-2 sm:grid-cols-2'
            role='radiogroup'
            aria-label={translate('{{value1}} 账号类型', {
              value1: platformLabels[platform],
            })}
          >
            {sharedAccountTypes[platform].map(([value, label, typeLabel]) => {
              const selected = accountType === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectAccountType(value)}
                  className={`flex min-h-14 min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    selected
                      ? "border-brand-500 bg-brand-500/[0.08]"
                      : "border-page-divider bg-page-surface hover:border-brand-500/45 hover:bg-page-surface-hover"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-brand-500 bg-brand-500"
                        : "border-page-divider"
                    }`}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-page">
                      {label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-page-muted">
                      {typeLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-t border-page-divider pt-4">
          <div>
            <div className='text-sm font-medium text-page-label'>
              {translate('绑定专属代理（必填）')}
            </div>
            <p className='mt-1 text-xs leading-5 text-page-muted'>
              {translate(
                '代理仅绑定当前托管账号，提交前会测试连通性；支持公网 IP 或域名。',
              )}
            </p>
            <p className='mt-1 text-xs font-medium leading-5 text-amber-600 dark:text-amber-400'>
              {translate('为提高账号存活率，建议购买并使用静态住宅 IP。')}
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={pasteProxyString}
              >
                <ClipboardPaste size={14} className='mr-2' />
                {translate('粘贴并自动识别')}
              </button>
              <span className='text-xs text-page-muted'>
                {translate('支持 URL、主机:端口:用户名:密码等常见格式')}
              </span>
            </div>
            <label className='text-sm font-medium text-page-label'>
              {translate('协议')}
              <select
                className="input mt-2"
                value={proxyProtocol}
                onChange={(event) => setProxyProtocol(event.target.value)}
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks5">SOCKS5</option>
                <option value="socks5h">SOCKS5H</option>
              </select>
            </label>
            <label className='text-sm font-medium text-page-label sm:col-span-2'>
              {translate('公网 IP / 域名')}
              <input
                className="input mt-2 font-mono"
                value={proxyHost}
                onChange={(event) => setProxyHost(event.target.value)}
                onPaste={handleProxyFieldPaste}
                placeholder={translate('48.45.22.14 或 proxy.example.com')}
                required
                aria-required="true"
              />
            </label>
            <label className='text-sm font-medium text-page-label'>
              {translate('端口')}
              <input
                className="input mt-2"
                type="number"
                min="1"
                max="65535"
                value={proxyPort}
                onChange={(event) => setProxyPort(event.target.value)}
                placeholder="1080"
                required
                aria-required="true"
              />
            </label>
            <label className='text-sm font-medium text-page-label'>
              {translate('用户名（可选）')}
              <input
                className="input mt-2"
                value={proxyUsername}
                onChange={(event) => setProxyUsername(event.target.value)}
                autoComplete="off"
              />
            </label>
            <label className='text-sm font-medium text-page-label'>
              {translate('密码（可选）')}
              <input
                className="input mt-2"
                type="password"
                value={proxyPassword}
                onChange={(event) => setProxyPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
          </div>
        </section>

        {oauthAccount ? (
          <section className='space-y-5 border-t border-page-divider pt-4'>
            <Step number='1' title={translate('生成授权链接')}>
              <button
                type="button"
                className="btn-primary mt-3"
                onClick={startOAuth}
                disabled={generating || submitting}
              >
                {generating && (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                )}
                {authURL ? translate('重新生成') : translate('生成授权链接')}
              </button>
            </Step>
            {authURL && (
              <div className="flex min-w-0 items-center gap-2">
                <input
                  readOnly
                  value={authURL}
                  className="input min-w-0 font-mono text-xs"
                />
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={async () => {
                    await navigator.clipboard.writeText(authURL);
                    toast.success(translate('已复制'));
                  }}
                  title={translate('复制授权链接')}
                  aria-label={translate('复制授权链接')}
                >
                  <Copy size={15} />
                </button>
              </div>
            )}
            <Step number='2' title={translate('在浏览器中完成授权')}>
              <p className='mt-1 text-sm text-page-muted'>
                {translate('登录您的 {{platform}} 账户并完成授权。', {
                  platform: platformLabels[platform],
                })}
              </p>
              {authURL && (
                <button
                  type="button"
                  className="btn-secondary mt-3"
                  onClick={() => openAuthorizationWindow(authURL)}
                >
                  <ExternalLink size={14} className='mr-2' />
                  {translate('打开授权链接')}
                </button>
              )}
            </Step>
            <Step number='3' title={translate('输入授权链接或 Code')}>
              <textarea
                value={authInput}
                onChange={(event) => setAuthInput(event.target.value)}
                rows={4}
                spellCheck={false}
                className='input mt-3 min-h-24 resize-y font-mono text-xs'
                placeholder={translate(
                  '完整回调链接，例如 {{value1}} 或仅输入 code 参数值',
                  {
                    value1: callbackExample,
                  },
                )}
              />
              <p className='mt-2 text-xs text-page-muted'>
                {translate('支持完整 callback URL、查询字符串或裸 code。')}
              </p>
            </Step>
          </section>
        ) : accountType === "bedrock" ? (
          <section className="grid gap-4 border-t border-page-divider pt-4 sm:grid-cols-2">
            <CredentialInput
              label="AWS Access Key ID"
              value={awsAccessKeyID}
              onChange={setAWSAccessKeyID}
            />
            <CredentialInput
              label="AWS Secret Access Key"
              value={awsSecretAccessKey}
              onChange={setAWSSecretAccessKey}
              secret
            />
            <CredentialInput
              label="AWS Region"
              value={awsRegion}
              onChange={setAWSRegion}
            />
            <CredentialInput
              label={translate('AWS Session Token（可选）')}
              value={awsSessionToken}
              onChange={setAWSSessionToken}
              secret
            />
          </section>
        ) : (
          <label className="block border-t border-page-divider pt-4 text-sm font-medium text-page-label">
            Service Account JSON
            <textarea
              value={serviceAccountJSON}
              onChange={(event) => setServiceAccountJSON(event.target.value)}
              rows={8}
              spellCheck={false}
              className="input mt-2 min-h-40 resize-y font-mono text-xs"
              placeholder='{ "type": "service_account", ... }'
            />
          </label>
        )}
      </div>
    </ModalShell>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page-link text-xs font-semibold text-white">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-page">{title}</div>
        {children}
      </div>
    </div>
  );
}

function CredentialInput({ label, value, onChange, secret = false }) {
  return (
    <label className="text-sm font-medium text-page-label">
      {label}
      <input
        className="input mt-2"
        type={secret ? "password" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
      />
    </label>
  );
}

function BatchImportDialog({ open, onClose, onDone }) {
  const fileInputRef = useRef(null);
  const [backup, setBackup] = useState(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBackup(null);
    setFileName("");
    setResult(null);
  }, [open]);

  const selectFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setBackup(null);
    setResult(null);
    try {
      if (!file.name.toLowerCase().endsWith('.json')) {
        throw new Error(translate('请选择 JSON (.json) 文件'));
      }
      const parsed = parseSharedAccountBackup(await file.text());
      setBackup(parsed);
      if (!parsed.oauthAccounts.length) {
        toast.error(translate('文件中没有可导入的 OAuth 账号'));
      } else if (parsed.missingProxy > 0) {
        toast.error(
          translate(
            '有 {{value1}} 个 OAuth 账号未绑定代理，请补充 proxy、proxy_url 或 proxy_id',
            {
              value1: parsed.missingProxy,
            },
          ),
        );
      }
    } catch (error) {
      toast.error(error.message || translate('账号备份文件解析失败'));
    }
  };

  const importAccounts = async () => {
    if (!backup?.oauthAccounts?.length) {
      toast.error(translate('请先选择包含 OAuth 账号的 JSON 备份文件'));
      return;
    }
    if (backup.missingProxy > 0) {
      toast.error(
        translate('有 {{value1}} 个 OAuth 账号未绑定专属代理，暂不能导入', {
          value1: backup.missingProxy,
        }),
      );
      return;
    }
    setImporting(true);
    try {
      const response = await importSharedAccounts(backup.oauthAccounts, true);
      if (!response.data?.success) {
        throw new Error(response.data?.message || translate('批量导入失败'));
      }
      const data = response.data?.data || {};
      const nextResult = {
        succeeded: Number(data.succeeded || 0),
        failed: Number(data.failed || 0),
        skipped: Number(data.skipped || 0) + Number(backup.skipped || 0),
      };
      setResult(nextResult);
      const message = translate(
        '已导入 {{value1}} 个，跳过 {{value2}} 个，失败 {{value3}} 个',
        {
          value1: nextResult.succeeded,
          value2: nextResult.skipped,
          value3: nextResult.failed,
        },
      );
      if (nextResult.failed > 0 || nextResult.succeeded === 0) {
        toast.error(message);
      } else {
        toast.success(message);
      }
      if (nextResult.succeeded > 0) await onDone();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          translate('批量导入失败'),
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      title={translate('批量导入托管账号')}
      description={translate(
        '支持 sub2api 账号备份格式，一次最多导入 200 个 OAuth 账号；每个账号必须绑定专属代理。',
      )}
      onClose={onClose}
      footer={
        <>
          <button type='button' className='btn-secondary' onClick={onClose}>
            {translate('取消')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={importAccounts}
            disabled={
              importing ||
              !backup?.oauthAccounts?.length ||
              backup?.missingProxy > 0
            }
          >
            {importing && <Loader2 size={15} className='mr-2 animate-spin' />}
            {translate('开始导入')}
          </button>
        </>
      }
    >
      <div className='space-y-4'>
        <div className='flex items-start justify-between gap-3'>
          <p className='text-sm leading-6 text-page-muted'>
            {translate(
              '支持内联 proxy、proxy_url，或顶层 proxies 配合账号 proxy_id。系统会逐个测试代理和账号。',
            )}
          </p>
          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() =>
              downloadJSONExample(
                "shared-account-import-example.json",
                SHARED_ACCOUNT_IMPORT_EXAMPLE,
              )
            }
          >
            <Download size={14} className='mr-2' />
            {translate('格式示例')}
          </button>
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-dashed border-page-divider bg-page-inset px-4 py-5 text-left"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp size={20} className='shrink-0 text-page-link' />
          <span className='min-w-0 flex-1'>
            <span className='block truncate text-sm font-medium text-page'>
              {fileName || translate('选择 JSON 文件')}
            </span>
            <span className='mt-1 block text-xs text-page-muted'>
              {translate(
                '仅导入已绑定专属代理的 OAuth 账号，其他认证类型会跳过',
              )}
            </span>
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={selectFile}
        />
        {backup && (
          <div className='grid grid-cols-2 gap-3 text-sm sm:grid-cols-5'>
            <ImportCount label={translate('文件账号')} value={backup.total} />
            <ImportCount
              label={translate('OAuth 账号')}
              value={backup.oauthAccounts.length}
            />
            <ImportCount
              label={translate('已绑定代理')}
              value={backup.proxyBound}
            />
            <ImportCount
              label={translate('缺少代理')}
              value={backup.missingProxy}
            />
            <ImportCount label={translate('跳过')} value={backup.skipped} />
          </div>
        )}
        {backup?.missingProxy > 0 && (
          <p className='rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'>
            {translate(
              '每个 OAuth 账号都必须配置可连通的公网代理。为提高账号存活率，建议使用静态住宅 IP。',
            )}
          </p>
        )}
        {result && (
          <p className='text-sm text-page-muted'>
            {translate(
              '成功 {{succeeded}} 个，跳过 {{skipped}} 个，失败 {{failed}} 个。',
              result,
            )}
          </p>
        )}
      </div>
    </ModalShell>
  );
}

function ImportCount({ label, value }) {
  return (
    <div className="rounded border border-page-divider px-3 py-3 text-page-muted">
      <span className="text-xs">{label}</span>
      <strong className="mt-1 block text-lg text-page">{value}</strong>
    </div>
  );
}

function HostedAccounts({ rows, onAdd, onToggle, onDelete }) {
  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-page-divider bg-page-surface">
      <div className="flex flex-col gap-3 border-b border-page-divider px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className='font-semibold text-page'>
            {translate('我的托管账号')}
          </h2>
          <p className='mt-1 text-sm text-page-muted'>
            {translate(
              '账号导入并通过测试后立即进入调度，模型和销售价格会自动同步。',
            )}
          </p>
        </div>
        <button type='button' className='btn-primary shrink-0' onClick={onAdd}>
          <UserRoundPlus size={15} className='mr-2' />
          {translate('添加托管账号')}
        </button>
      </div>
      {rows.length === 0 ? (
        <div className='px-5 py-14 text-center'>
          <UsersRound size={28} className='mx-auto text-page-muted' />
          <h3 className='mt-3 font-medium text-page'>
            {translate('还没有托管账号')}
          </h3>
          <p className='mt-1 text-sm text-page-muted'>
            {translate(
              '添加 Anthropic、OpenAI、Gemini、Antigravity 或 Grok 账号，完成后立即贡献容量。',
            )}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-page-inset text-xs text-page-muted">
              <tr>
                <th className='px-5 py-3 font-medium'>
                  {translate('托管账号')}
                </th>
                <th className='px-5 py-3 font-medium'>
                  {translate('厂商与套餐')}
                </th>
                <th className='px-5 py-3 font-medium'>
                  {translate('可用模型')}
                </th>
                <th className='px-5 py-3 font-medium'>
                  {translate('健康状态')}
                </th>
                <th className='px-5 py-3 text-right font-medium'>
                  {translate('进入调度')}
                </th>
                <th className='w-14 px-5 py-3' />
              </tr>
            </thead>
            <tbody className="divide-y divide-page-divider">
              {rows.map(({ account, supply, plan }) => {
                let modelCount = 0;
                try {
                  modelCount = JSON.parse(
                    account.available_models || "[]",
                  ).length;
                } catch {}
                const health = account.error_message
                  ? "error"
                  : supply.health_status || account.status;
                const healthy = ["active", "healthy"].includes(health);
                return (
                  <tr key={account.id}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-page">
                        {account.name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-page-muted">
                        <span>{account.account_type || "oauth"}</span>
                        {account.proxy_bound && (
                          <span className='rounded border border-page-divider px-1.5 py-0.5 text-[10px]'>
                            {translate('专属代理')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-page">
                        {plan?.title || account.platform}
                      </div>
                      <div className="mt-1 text-xs text-page-muted">
                        {account.detected_tier || plan?.tier || "-"}
                      </div>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-page">
                      {modelCount}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          healthy ? "text-page-success" : "text-page-danger"
                        }
                      >
                        {health
                          ? translate(`shared.status.${health}`, {
                              defaultValue: String(health).replaceAll('_', ' '),
                            })
                          : '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(account.schedulable)}
                        aria-label={translate('进入调度')}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          account.schedulable
                            ? "bg-page-link"
                            : "bg-page-divider"
                        }`}
                        onClick={() => onToggle(account, !account.schedulable)}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            account.schedulable
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        className="rounded p-2 text-page-danger hover:bg-page-inset"
                        onClick={() => onDelete(account)}
                        title={translate('删除账号')}
                        aria-label={translate('删除账号')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-page-divider bg-page-surface p-4">
      <div className="flex items-center gap-2 text-xs text-page-muted">
        <Icon size={15} />
        {label}
      </div>
      <p className="mt-2 text-xl font-bold text-page">{value}</p>
    </div>
  );
}

function AvailabilityStrip({ windows = [] }) {
  const normalized = Array.isArray(windows) ? windows.slice(-3) : [];
  while (normalized.length < 3) normalized.unshift({ availability: -1 });
  return (
    <span
      className='flex shrink-0 gap-1'
      title={translate('最近 3 个可用度窗口')}
    >
      {normalized.map((window, index) => {
        const availability = Number(window?.availability ?? -1);
        const tone =
          availability < 0
            ? "bg-page-divider"
            : availability >= 95
              ? "bg-emerald-500"
              : availability >= 80
                ? "bg-amber-500"
                : "bg-red-500";
        return (
          <span
            key={`${window?.bucket_time || index}-${index}`}
            className={`h-2.5 w-5 rounded-sm ${tone}`}
          />
        );
      })}
    </span>
  );
}

function SharedKeyManager({ tokens, onDelete }) {
  return (
    <section className='rounded-lg border border-page-divider bg-page-surface'>
      <div className='border-b border-page-divider px-5 py-4'>
        <h2 className='font-semibold text-page'>{translate('共享订阅 Key')}</h2>
        <p className='mt-1 text-xs text-page-muted'>
          {translate('在当前分站生成并管理可调用共享套餐的 API Key。')}
        </p>
      </div>
      {tokens.length === 0 ? (
        <p className='px-5 py-10 text-center text-sm text-page-muted'>
          {translate('尚未生成共享订阅 Key')}
        </p>
      ) : (
        <div className="divide-y divide-page-divider">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-page">{token.name}</p>
                <code className="mt-1 block truncate text-xs text-page-muted">
                  sk-{token.key}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`sk-${token.key}`);
                    toast.success(translate('已复制'));
                  }}
                >
                  <Copy size={15} className='mr-1.5' />
                  {translate('复制')}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-page-danger"
                  onClick={() => onDelete(token)}
                >
                  <Trash2 size={15} className='mr-1.5' />
                  {translate('删除')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PlanAvailabilityPanel({
  entry,
  period,
  data,
  loading,
  onPeriodChange,
  onClose,
}) {
  const aggregate = new Map();
  for (const bucket of data?.buckets || []) {
    const key = Number(bucket.bucket_time || 0);
    const current = aggregate.get(key) || { total: 0, successes: 0 };
    current.total += Number(bucket.total || 0);
    current.successes += Number(bucket.successes || 0);
    aggregate.set(key, current);
  }
  const buckets = [...aggregate.entries()].sort((a, b) => a[0] - b[0]);
  return (
    <section className="rounded-lg border border-page-divider bg-page-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className='font-semibold text-page'>
            {entry.plan.title}
            {translate('服务状态')}
          </h2>
          <p className='mt-1 text-xs text-page-muted'>
            {translate('总可用度')}{' '}
            {Number(data?.availability) >= 0
              ? `${Number(data.availability).toFixed(1)}%`
              : translate('暂无数据')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["24h", "7d"].map((value) => (
            <button
              key={value}
              type="button"
              className={period === value ? "btn-primary" : "btn-secondary"}
              onClick={() => onPeriodChange(value)}
            >
              {value === '24h' ? translate('24 小时') : translate('7 天')}
            </button>
          ))}
          <button type='button' className='btn-secondary' onClick={onClose}>
            {translate('关闭')}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex min-h-28 items-center justify-center">
          <Loader2 className="animate-spin text-page-link" />
        </div>
      ) : buckets.length === 0 ? (
        <p className='py-10 text-center text-sm text-page-muted'>
          {translate('暂无监控数据')}
        </p>
      ) : (
        <div className="mt-5 flex h-24 items-end gap-1 overflow-hidden">
          {buckets.map(([time, bucket]) => {
            const availability =
              bucket.total > 0 ? (bucket.successes / bucket.total) * 100 : -1;
            const height = availability < 0 ? 8 : Math.max(8, availability);
            const tone =
              availability >= 95
                ? "bg-emerald-500"
                : availability >= 80
                  ? "bg-amber-500"
                  : "bg-red-500";
            return (
              <span
                key={time}
                className={`min-w-1 flex-1 rounded-sm ${availability < 0 ? "bg-page-divider" : tone}`}
                style={{ height: `${height}%` }}
                title={`${new Date(time * 1000).toLocaleString()} · ${availability < 0 ? translate('无数据') : `${availability.toFixed(1)}%`}`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
