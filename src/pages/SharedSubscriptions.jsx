import React, { useCallback, useEffect, useState } from "react";
import {
  CircleDollarSign,
  Database,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Q,
  cancelSharedPayout,
  completeSharedOAuth,
  createSharedPayout,
  deleteSharedAccount,
  getSharedEarnings,
  getSharedOAuthCapabilities,
  getSharedPaymentProfile,
  getSharedPayouts,
  getSharedPlans,
  getSharedSupplies,
  importSharedAccounts,
  saveSharedPaymentProfile,
  startSharedOAuth,
  subscribeSharedPlan,
  transferSharedEarnings,
  unsubscribeSharedPlan,
  updateSharedAccountStatus,
} from "../api";
import { useCurrency } from "../context/SiteContext";

const dataOf = (response) => response?.data?.data || {};

const oauthPlatforms = [
  { value: "openai", label: "OpenAI / Codex" },
  { value: "grok", label: "Grok" },
  { value: "gemini", label: "Gemini" },
  { value: "anthropic", label: "Anthropic" },
  { value: "antigravity", label: "Antigravity" },
];

const initialOAuthForm = {
  platform: "openai",
  account_type: "oauth",
  oauth_type: "code_assist",
  project_id: "",
  name: "",
  concurrency: 1,
  priority: 0,
  proxy_enabled: false,
  proxy_protocol: "socks5",
  proxy_host: "",
  proxy_port: "",
  proxy_username: "",
  proxy_password: "",
};

const advancedAccountExample = JSON.stringify(
  [
    {
      name: "",
      platform: "gemini",
      type: "service_account",
      credentials: { service_account_json: "" },
      concurrency: 1,
      priority: 0,
      proxy: {
        protocol: "socks5",
        host: "8.8.8.8",
        port: 1080,
      },
    },
  ],
  null,
  2,
);

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
  const { fmt } = useCurrency();
  const [tab, setTab] = useState("plans");
  const [plans, setPlans] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [earnings, setEarnings] = useState({ wallet: {}, items: [] });
  const [payouts, setPayouts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountJson, setAccountJson] = useState(advancedAccountExample);
  const [paymentForm, setPaymentForm] = useState({
    method: "alipay",
    details: "",
  });
  const [amount, setAmount] = useState("");
  const [oauthForm, setOAuthForm] = useState(initialOAuthForm);
  const [oauthSession, setOAuthSession] = useState(null);
  const [oauthCode, setOAuthCode] = useState("");
  const [oauthStarting, setOAuthStarting] = useState(false);
  const [oauthCompleting, setOAuthCompleting] = useState(false);
  const [oauthCapabilities, setOAuthCapabilities] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, suppliesRes, earningsRes, profileRes, payoutsRes] =
        await Promise.all([
          getSharedPlans(),
          getSharedSupplies(),
          getSharedEarnings(),
          getSharedPaymentProfile(),
          getSharedPayouts(),
        ]);
      if (plansRes.data.success) setPlans(dataOf(plansRes));
      if (suppliesRes.data.success) setSupplies(dataOf(suppliesRes));
      if (earningsRes.data.success) setEarnings(dataOf(earningsRes));
      if (profileRes.data.success) setProfile(dataOf(profileRes));
      if (payoutsRes.data.success) {
        setPayouts(dataOf(payoutsRes).items || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    if (tab !== "supplies" || oauthForm.platform !== "grok") {
      setOAuthCapabilities(null);
      return () => {
        active = false;
      };
    }
    getSharedOAuthCapabilities("grok")
      .then((response) => {
        if (active && response.data.success) {
          setOAuthCapabilities(dataOf(response));
        }
      })
      .catch(() => {
        if (active) setOAuthCapabilities(null);
      });
    return () => {
      active = false;
    };
  }, [oauthForm.platform, tab]);

  const togglePlan = async (entry) => {
    const response = entry.subscribed
      ? await unsubscribeSharedPlan(entry.plan.id)
      : await subscribeSharedPlan(entry.plan.id);
    if (response.data.success) await load();
  };

  const importAccounts = async () => {
    let accounts;
    try {
      accounts = JSON.parse(accountJson);
    } catch {
      toast.error("账号数据不是有效 JSON");
      return;
    }
    if (!Array.isArray(accounts) || accounts.length === 0) {
      toast.error("请至少填写一个账号");
      return;
    }
    const response = await importSharedAccounts(accounts);
    if (response.data.success) {
      toast.success("共享账号已导入");
      await load();
    }
  };

  const changeOAuthPlatform = (platform) => {
    setOAuthForm((previous) => ({
      ...previous,
      platform,
      account_type: "oauth",
    }));
    setOAuthSession(null);
    setOAuthCode("");
  };

  const beginOAuth = async () => {
    setOAuthStarting(true);
    try {
      const response = await startSharedOAuth({
        platform: oauthForm.platform,
        account_type: oauthForm.account_type,
        oauth_type: oauthForm.platform === "gemini" ? oauthForm.oauth_type : "",
        project_id:
          oauthForm.platform === "gemini" ? oauthForm.project_id.trim() : "",
      });
      if (!response.data.success) return;
      const session = dataOf(response);
      const nextSession = {
        ...session,
        provider_state: providerStateFromURL(session.auth_url),
      };
      setOAuthSession(nextSession);
      setOAuthCode("");
      openAuthorizationWindow(nextSession.auth_url);
      toast.success("授权链接已生成");
    } finally {
      setOAuthStarting(false);
    }
  };

  const finishOAuth = async () => {
    if (!oauthSession?.state) {
      toast.error("请先生成授权链接");
      return;
    }
    if (!oauthCode.trim()) {
      toast.error("请输入回调链接或 Code");
      return;
    }
    setOAuthCompleting(true);
    try {
      const proxy = oauthForm.proxy_enabled
        ? {
            protocol: oauthForm.proxy_protocol,
            host: oauthForm.proxy_host.trim(),
            port: Number(oauthForm.proxy_port || 0),
            username: oauthForm.proxy_username.trim(),
            password: oauthForm.proxy_password,
          }
        : undefined;
      if (
        oauthForm.proxy_enabled &&
        (!proxy.host || proxy.port <= 0 || proxy.port > 65535)
      ) {
        toast.error("请输入有效的公网代理 IP 和端口");
        return;
      }
      const response = await completeSharedOAuth({
        state: oauthSession.state,
        provider_state: oauthSession.provider_state || "",
        code: oauthCode.trim(),
        name: oauthForm.name.trim(),
        concurrency: Math.max(1, Number(oauthForm.concurrency || 1)),
        priority: Number(oauthForm.priority || 0),
        proxy,
      });
      if (response.data.success) {
        toast.success("共享账号授权并导入成功");
        setOAuthSession(null);
        setOAuthCode("");
        await load();
      }
    } finally {
      setOAuthCompleting(false);
    }
  };

  const saveProfile = async () => {
    const response = await saveSharedPaymentProfile(paymentForm);
    if (response.data.success) {
      toast.success("收款资料已保存");
      setPaymentForm((previous) => ({ ...previous, details: "" }));
      await load();
    }
  };

  const amountQuota = () => Math.round(Number(amount || 0) * Q);

  const transfer = async () => {
    if (amountQuota() <= 0) {
      toast.error("请输入金额");
      return;
    }
    const response = await transferSharedEarnings({
      amount_quota: amountQuota(),
    });
    if (response.data.success) {
      toast.success("已转入账户余额");
      setAmount("");
      await load();
    }
  };

  const payout = async () => {
    if (amountQuota() <= 0) {
      toast.error("请输入金额");
      return;
    }
    const method = profile?.method || paymentForm.method;
    const response = await createSharedPayout({
      amount_quota: amountQuota(),
      method,
      note: "",
    });
    if (response.data.success) {
      toast.success("提现申请已提交");
      setAmount("");
      await load();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between border-b border-page-divider pb-5">
        <div>
          <h1 className="text-2xl font-bold text-page sm:text-3xl">订阅共享</h1>
          <p className="mt-1 text-sm text-page-secondary">
            共享计划消费与账号贡献独立结算。
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={load}
          title="刷新"
          aria-label="刷新"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="mt-5 inline-flex max-w-full overflow-x-auto rounded-lg border border-page-divider bg-page-surface p-1">
        {[
          ["plans", "共享计划"],
          ["supplies", "账号贡献"],
          ["earnings", "收益与提现"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ${
              tab === value
                ? "bg-page text-page-inverse"
                : "text-page-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plans" && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {plans.map((entry) => (
            <div
              key={entry.plan.id}
              className="rounded-lg border border-page-divider bg-page-surface p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-page">
                    {entry.plan.title}
                  </h2>
                  <p className="mt-1 text-sm text-page-secondary">
                    {entry.plan.description}
                  </p>
                </div>
                <Database className="text-page-link" />
              </div>
              <div className="mt-4 max-h-52 overflow-y-auto rounded-lg border border-page-divider">
                {(entry.models || []).map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between gap-3 border-b border-page-divider px-3 py-2 text-xs last:border-0"
                  >
                    <span className="truncate font-mono text-page">
                      {model.model_name}
                    </span>
                    <span className="shrink-0 text-page-secondary">
                      {Number(model.fixed_price || 0) > 0
                        ? `${fmt(model.fixed_price, 6)}/call`
                        : `${fmt(model.input_price || 0, 6)} / ${fmt(model.output_price || 0, 6)}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-page-muted">
                  {entry.supply_count || 0} 个可用账号
                </span>
                <button
                  type="button"
                  onClick={() => togglePlan(entry)}
                  className={entry.subscribed ? "btn-secondary" : "btn-primary"}
                >
                  {entry.subscribed ? "取消订阅" : "订阅计划"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "supplies" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
          <section>
            <h2 className="text-lg font-semibold text-page">我的共享账号</h2>
            <div className="mt-3 space-y-3">
              {supplies.length === 0 ? (
                <p className="text-sm text-page-muted">暂无贡献账号</p>
              ) : (
                supplies.map((entry) => (
                  <div
                    key={entry.supply.id}
                    className="rounded-lg border border-page-divider bg-page-surface p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-page">
                          {entry.plan?.title || `Plan #${entry.supply.plan_id}`}
                        </p>
                        <p className="mt-1 text-xs text-page-muted">
                          {entry.supply.status} · {entry.supply.health_status}
                        </p>
                      </div>
                      <span className="text-xs text-page-secondary">
                        {(entry.accounts || []).length} 个账号
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(entry.accounts || []).map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center gap-2 rounded-lg bg-page-inset px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate text-page">
                            {account.name || `Account #${account.id}`}
                          </span>
                          {account.proxy_bound && (
                            <span className="shrink-0 rounded border border-page-divider px-1.5 py-0.5 text-[10px] text-page-muted">
                              专属代理
                            </span>
                          )}
                          <button
                            type="button"
                            className="rounded p-1.5 text-page-link hover:bg-page-surface-hover"
                            title={
                              account.status === "active" ? "停用" : "启用"
                            }
                            aria-label={
                              account.status === "active" ? "停用" : "启用"
                            }
                            onClick={async () => {
                              await updateSharedAccountStatus(
                                account.id,
                                account.status !== "active",
                              );
                              await load();
                            }}
                          >
                            <Power size={15} />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1.5 text-page-danger hover:bg-page-surface-hover"
                            title="删除"
                            aria-label="删除"
                            onClick={async () => {
                              await deleteSharedAccount(account.id);
                              await load();
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-lg border border-page-divider bg-page-surface p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-page-link" />
                <h2 className="font-semibold text-page">安全授权导入</h2>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-page-label">
                    平台
                  </span>
                  <select
                    className="input"
                    value={oauthForm.platform}
                    onChange={(event) =>
                      changeOAuthPlatform(event.target.value)
                    }
                  >
                    {oauthPlatforms.map((platform) => (
                      <option key={platform.value} value={platform.value}>
                        {platform.label}
                      </option>
                    ))}
                  </select>
                </label>
                {oauthForm.platform === "anthropic" && (
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-page-label">
                      授权类型
                    </span>
                    <select
                      className="input"
                      value={oauthForm.account_type}
                      onChange={(event) => {
                        setOAuthForm((previous) => ({
                          ...previous,
                          account_type: event.target.value,
                        }));
                        setOAuthSession(null);
                        setOAuthCode("");
                      }}
                    >
                      <option value="oauth">OAuth</option>
                      <option value="setup-token">Setup Token</option>
                    </select>
                  </label>
                )}
                {oauthForm.platform === "gemini" && (
                  <>
                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-page-label">
                        OAuth 类型
                      </span>
                      <select
                        className="input"
                        value={oauthForm.oauth_type}
                        onChange={(event) =>
                          setOAuthForm((previous) => ({
                            ...previous,
                            oauth_type: event.target.value,
                          }))
                        }
                      >
                        <option value="code_assist">Code Assist</option>
                      </select>
                    </label>
                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-page-label">
                        Project ID
                      </span>
                      <input
                        className="input"
                        value={oauthForm.project_id}
                        onChange={(event) =>
                          setOAuthForm((previous) => ({
                            ...previous,
                            project_id: event.target.value,
                          }))
                        }
                        placeholder="可选"
                      />
                    </label>
                  </>
                )}
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-page-label">
                    账号名称
                  </span>
                  <input
                    className="input"
                    value={oauthForm.name}
                    onChange={(event) =>
                      setOAuthForm((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    placeholder="可选"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-page-label">
                      并发
                    </span>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={oauthForm.concurrency}
                      onChange={(event) =>
                        setOAuthForm((previous) => ({
                          ...previous,
                          concurrency: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-page-label">
                      优先级
                    </span>
                    <input
                      type="number"
                      className="input"
                      value={oauthForm.priority}
                      onChange={(event) =>
                        setOAuthForm((previous) => ({
                          ...previous,
                          priority: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="rounded-lg border border-page-divider p-3">
                  <label className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-sm font-medium text-page-label">
                        绑定专属代理 IP
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-page-muted">
                        仅绑定当前账号，提交前测试连通性；只允许公网 IP。
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={oauthForm.proxy_enabled}
                      onChange={(event) =>
                        setOAuthForm((previous) => ({
                          ...previous,
                          proxy_enabled: event.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4"
                    />
                  </label>
                  {oauthForm.proxy_enabled && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-page-label">
                          协议
                        </span>
                        <select
                          className="input"
                          value={oauthForm.proxy_protocol}
                          onChange={(event) =>
                            setOAuthForm((previous) => ({
                              ...previous,
                              proxy_protocol: event.target.value,
                            }))
                          }
                        >
                          <option value="http">HTTP</option>
                          <option value="https">HTTPS</option>
                          <option value="socks5">SOCKS5</option>
                          <option value="socks5h">SOCKS5H</option>
                        </select>
                      </label>
                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-page-label">
                          公网 IP
                        </span>
                        <input
                          className="input font-mono"
                          value={oauthForm.proxy_host}
                          onChange={(event) =>
                            setOAuthForm((previous) => ({
                              ...previous,
                              proxy_host: event.target.value,
                            }))
                          }
                          placeholder="8.8.8.8"
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-page-label">
                          端口
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="65535"
                          className="input"
                          value={oauthForm.proxy_port}
                          onChange={(event) =>
                            setOAuthForm((previous) => ({
                              ...previous,
                              proxy_port: event.target.value,
                            }))
                          }
                          placeholder="1080"
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-page-label">
                          用户名（可选）
                        </span>
                        <input
                          className="input"
                          value={oauthForm.proxy_username}
                          onChange={(event) =>
                            setOAuthForm((previous) => ({
                              ...previous,
                              proxy_username: event.target.value,
                            }))
                          }
                          autoComplete="off"
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="mb-1.5 block text-sm font-medium text-page-label">
                          密码（可选）
                        </span>
                        <input
                          type="password"
                          className="input"
                          value={oauthForm.proxy_password}
                          onChange={(event) =>
                            setOAuthForm((previous) => ({
                              ...previous,
                              proxy_password: event.target.value,
                            }))
                          }
                          autoComplete="new-password"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {oauthForm.platform === "grok" &&
                oauthCapabilities?.password_auth_enabled && (
                  <p className="mt-3 text-xs leading-5 text-page-muted">
                    上游支持密码授权；本站贡献入口固定使用 OAuth。
                  </p>
                )}

              <button
                type="button"
                className="btn-primary mt-4 w-full"
                onClick={beginOAuth}
                disabled={oauthStarting}
              >
                {oauthStarting ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <ExternalLink size={16} className="mr-2" />
                )}
                生成并打开授权链接
              </button>

              {oauthSession && (
                <div className="mt-5 border-t border-page-divider pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-page">
                      <KeyRound size={16} className="shrink-0 text-page-link" />
                      <span className="truncate">等待授权回调</span>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-page-link hover:underline"
                      onClick={() =>
                        openAuthorizationWindow(oauthSession.auth_url)
                      }
                    >
                      重新打开
                    </button>
                  </div>
                  {oauthSession.expires_at && (
                    <p className="mt-2 text-xs text-page-muted">
                      有效期至{" "}
                      {new Date(oauthSession.expires_at).toLocaleString()}
                    </p>
                  )}
                  <textarea
                    className="input mt-3 min-h-24 resize-y font-mono text-xs"
                    value={oauthCode}
                    onChange={(event) => setOAuthCode(event.target.value)}
                    placeholder="粘贴回调链接或 Code"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="btn-primary mt-3 w-full"
                    onClick={finishOAuth}
                    disabled={oauthCompleting}
                  >
                    {oauthCompleting && (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    )}
                    完成授权并导入
                  </button>
                </div>
              )}
            </section>

            <details className="rounded-lg border border-page-divider bg-page-surface p-5">
              <summary className="cursor-pointer text-sm font-medium text-page">
                高级 JSON 导入
              </summary>
              <p className="mt-3 text-xs leading-5 text-page-muted">
                用于服务账号或 Bedrock。OAuth 账号请使用安全授权入口。
              </p>
              <textarea
                value={accountJson}
                onChange={(event) => setAccountJson(event.target.value)}
                className="input mt-3 min-h-64 resize-y font-mono text-xs"
                spellCheck={false}
              />
              <button
                type="button"
                className="btn-secondary mt-3 w-full"
                onClick={importAccounts}
              >
                <Plus size={16} className="mr-2" />
                导入账号
              </button>
            </details>
          </div>
        </div>
      )}

      {tab === "earnings" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              icon={Wallet}
              label="可提现收益"
              value={fmt(Number(earnings.wallet?.available_quota || 0) / Q, 4)}
            />
            <Metric
              icon={CircleDollarSign}
              label="待释放收益"
              value={fmt(Number(earnings.wallet?.pending_quota || 0) / Q, 4)}
            />
            <Metric
              icon={Wallet}
              label="累计已提现"
              value={fmt(Number(earnings.wallet?.withdrawn_quota || 0) / Q, 4)}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-page-divider bg-page-surface p-5">
              <h2 className="font-semibold text-page">收款资料</h2>
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
                  placeholder="收款方式"
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
                  placeholder="收款账号"
                />
              </div>
              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={saveProfile}
              >
                保存资料
              </button>
            </section>
            <section className="rounded-lg border border-page-divider bg-page-surface p-5">
              <h2 className="font-semibold text-page">收益操作</h2>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input mt-4"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="USD 金额"
              />
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={transfer}
                >
                  转入余额
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={payout}
                >
                  申请提现
                </button>
              </div>
            </section>
          </div>
          <section>
            <h2 className="text-lg font-semibold text-page">收益明细</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-page-divider">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-page-inset text-left text-page-muted">
                  <tr>
                    <th className="px-4 py-3">时间</th>
                    <th className="px-4 py-3">计划</th>
                    <th className="px-4 py-3">类型</th>
                    <th className="px-4 py-3 text-right">金额</th>
                  </tr>
                </thead>
                <tbody>
                  {(earnings.items || []).map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-page-divider text-page"
                    >
                      <td className="px-4 py-3">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">{item.plan_title || "-"}</td>
                      <td className="px-4 py-3">{item.entry_type}</td>
                      <td className="px-4 py-3 text-right">
                        {fmt(Number(item.amount_quota || 0) / Q, 6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-page">提现记录</h2>
            <div className="mt-3 space-y-2">
              {payouts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-page-divider bg-page-surface px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-page">
                      {fmt(Number(item.amount_quota || 0) / Q, 4)}
                    </span>
                    <span className="ml-3 text-page-muted">{item.status}</span>
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
                      取消
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
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
