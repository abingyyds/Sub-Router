import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Check, Loader2, RefreshCw, Search, Store } from "lucide-react";
import toast from "react-hot-toast";
import {
  getMarketplaceModels,
  getMarketplaceProviders,
  getMarketplaceQuickStart,
  getMarketplaceRankings,
  getMarketplaceSubscriptionStatus,
  saveMarketplaceQuickStart,
  subscribeMarketplaceProvider,
  unsubscribeMarketplaceProvider,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/SiteContext";

const listData = (response) =>
  response?.data?.data?.items || response?.data?.data || [];

const modelPrice = (item, fmt) => {
  const fixed = Number(item?.fixed_price || item?.final_fixed_price || 0);
  if (fixed > 0) return `${fmt(fixed, 6)} / call`;
  const input = Number(item?.input_price || item?.final_input_price || 0);
  const output = Number(item?.output_price || item?.final_output_price || 0);
  if (input <= 0 && output <= 0) return "-";
  return `${fmt(input, 6)} / ${fmt(output, 6)} / M`;
};

export default function Marketplace() {
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const [tab, setTab] = useState("models");
  const [keyword, setKeyword] = useState("");
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [quickStart, setQuickStart] = useState(null);
  const [selectedProviders, setSelectedProviders] = useState(new Set());
  const [autoSubscribe, setAutoSubscribe] = useState(false);
  const [savingQuickStart, setSavingQuickStart] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [modelsRes, providersRes, rankingsRes] = await Promise.all([
        getMarketplaceModels(),
        getMarketplaceProviders({ page_size: 100 }),
        getMarketplaceRankings({
          sort: "tokens",
          period: "day",
          page_size: 100,
        }),
      ]);
      const nextModels = listData(modelsRes);
      const nextProviders = listData(providersRes);
      setModels(nextModels);
      setProviders(nextProviders);
      setRankings(listData(rankingsRes));
      if (user && nextProviders.length > 0) {
        const statusRes = await getMarketplaceSubscriptionStatus(
          nextProviders.map((item) => item.id),
        );
        if (statusRes.data.success) setSubscriptions(statusRes.data.data || {});
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredModels = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return models;
    return models.filter((item) =>
      String(item.model_name || item.name || "")
        .toLowerCase()
        .includes(needle),
    );
  }, [keyword, models]);

  const filteredProviders = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return providers;
    return providers.filter((item) =>
      `${item.company_name || ""} ${item.slug || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [keyword, providers]);

  const toggleSubscription = async (provider) => {
    if (!user) {
      toast.error("请先登录");
      return;
    }
    const subscribed = Boolean(
      subscriptions[String(provider.id)] ?? subscriptions[provider.id],
    );
    const res = subscribed
      ? await unsubscribeMarketplaceProvider(provider.id)
      : await subscribeMarketplaceProvider(provider.id);
    if (res.data.success) {
      setSubscriptions((prev) => ({ ...prev, [provider.id]: !subscribed }));
    }
  };

  const openQuickStart = async () => {
    const res = await getMarketplaceQuickStart();
    if (!res.data.success) return;
    const data = res.data.data || {};
    const items = data.providers || [];
    setQuickStart(items);
    setSelectedProviders(
      new Set(items.map((item) => item.provider?.id).filter(Boolean)),
    );
    setAutoSubscribe(Boolean(data.auto_subscribe_new));
  };

  const saveQuickStart = async () => {
    setSavingQuickStart(true);
    try {
      const res = await saveMarketplaceQuickStart({
        provider_ids: [...selectedProviders],
        auto_subscribe_new: autoSubscribe,
      });
      if (res.data.success) {
        toast.success("智能路由商家范围已保存");
        setQuickStart(null);
        await load();
      }
    } finally {
      setSavingQuickStart(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 border-b border-page-divider pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-page sm:text-3xl">模型市场</h1>
          <p className="mt-1 text-sm text-page-secondary">
            本站准入商家、最终售价和实时可用模型。
          </p>
        </div>
        <div className="flex gap-2">
          {user && (
            <button
              type="button"
              onClick={openQuickStart}
              className="btn-primary"
            >
              智能路由快速开始
            </button>
          )}
          <button
            type="button"
            onClick={load}
            className="btn-secondary"
            title="刷新"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-page-divider bg-page-surface p-1">
          {[
            ["models", "模型"],
            ["rankings", "排行"],
            ["providers", "商家"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${tab === value ? "bg-page text-page-inverse" : "text-page-secondary"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative block w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-page-muted" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="input pl-9"
            placeholder="搜索模型或商家"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="animate-spin text-page-muted" />
        </div>
      ) : tab === "models" ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredModels.map((item, index) => (
            <div
              key={`${item.model_name || item.name}-${item.provider_id || index}`}
              className="rounded-lg border border-page-divider bg-page-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-page">
                    {item.model_name || item.name}
                  </p>
                  <p className="mt-1 text-xs text-page-muted">
                    {item.provider_name || item.provider_slug || "智能路由"}
                  </p>
                </div>
                <Boxes size={18} className="shrink-0 text-page-link" />
              </div>
              <p className="mt-4 text-sm font-semibold text-page">
                {modelPrice(item, fmt)}
              </p>
              <p className="mt-1 text-xs text-page-secondary">
                {item.category || "AI model"} ·{" "}
                {Number(item.context_length || 0).toLocaleString()} context
              </p>
            </div>
          ))}
        </div>
      ) : tab === "rankings" ? (
        <div className="mt-6 divide-y divide-page-divider border-y border-page-divider">
          {rankings.map((item, index) => (
            <div
              key={`${item.id || item.model_name}-${index}`}
              className="grid gap-3 py-4 sm:grid-cols-[56px_minmax(0,1fr)_180px_160px] sm:items-center"
            >
              <span className="text-lg font-bold text-page-muted">
                #{item.rank || index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold text-page">
                  {item.model_name}
                </p>
                <p className="mt-1 text-xs text-page-muted">
                  {item.provider_name || item.provider_slug}
                </p>
              </div>
              <div className="text-sm text-page-secondary">
                {Number(item.total_tokens || 0).toLocaleString()} tokens
              </div>
              <div className="text-sm font-semibold text-page">
                {modelPrice(item, fmt)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredProviders.map((provider) => {
            const subscribed = Boolean(
              subscriptions[String(provider.id)] ?? subscriptions[provider.id],
            );
            return (
              <div
                key={provider.id}
                className="rounded-lg border border-page-divider bg-page-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-page-inset">
                    {provider.logo ? (
                      <img
                        src={provider.logo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Store size={20} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/marketplace/providers/${provider.slug}`}
                      className="font-semibold text-page hover:text-page-link"
                    >
                      {provider.company_name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs text-page-secondary">
                      {provider.description || "@" + provider.slug}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-page-muted">
                  <span>{provider.model_count || 0} models</span>
                  <span>{Number(provider.rating || 0).toFixed(1)} rating</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSubscription(provider)}
                  className={
                    subscribed
                      ? "btn-secondary mt-4 w-full"
                      : "btn-primary mt-4 w-full"
                  }
                >
                  {subscribed ? (
                    <>
                      <Check size={15} className="mr-1.5" />
                      已订阅
                    </>
                  ) : (
                    "订阅商家"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {quickStart && (
        <div
          className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setQuickStart(null)}
        >
          <div
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-page-surface shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-page-divider px-5 py-4">
              <h2 className="text-lg font-semibold text-page">
                选择智能路由商家
              </h2>
            </div>
            <div className="min-h-0 max-h-[55vh] flex-1 space-y-2 overflow-y-auto p-5">
              {quickStart.map((item) => {
                const provider = item.provider || {};
                const checked = selectedProviders.has(provider.id);
                return (
                  <label
                    key={provider.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-page-divider p-3"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedProviders((previous) => {
                          const next = new Set(previous);
                          checked
                            ? next.delete(provider.id)
                            : next.add(provider.id);
                          return next;
                        })
                      }
                    />
                    <span className="flex-1 text-sm font-medium text-page">
                      {provider.company_name}
                    </span>
                    <span className="text-xs text-page-muted">
                      @{provider.slug}
                    </span>
                  </label>
                );
              })}
              <label className="mt-4 flex items-center gap-3 text-sm text-page">
                <input
                  type="checkbox"
                  checked={autoSubscribe}
                  onChange={(event) => setAutoSubscribe(event.target.checked)}
                />
                以后自动订阅本站新准入商家
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-page-divider px-5 py-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setQuickStart(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={savingQuickStart}
                onClick={saveQuickStart}
              >
                {savingQuickStart ? "保存中" : "保存范围"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
