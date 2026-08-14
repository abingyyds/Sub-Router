import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Check,
  Clock3,
  Loader2,
  Megaphone,
  Save,
  Star,
  Store,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createMarketplaceReview,
  deleteMarketplaceReview,
  getMarketplaceProvider,
  getMarketplaceProviderAnnouncements,
  getMarketplaceProviderProbes,
  getMarketplaceReviews,
  getMarketplaceSelfReview,
  getMarketplaceSubscriptionStatus,
  subscribeMarketplaceProvider,
  unsubscribeMarketplaceProvider,
  updateMarketplaceReview,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/SiteContext";

export default function MarketplaceProvider() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [probeBuckets, setProbeBuckets] = useState([]);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myReview, setMyReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const probeSummary = useMemo(() => {
    const summary = probeBuckets.reduce(
      (result, bucket) => {
        const total = Number(bucket.total || 0);
        const successes = Number(bucket.successes || 0);
        result.total += total;
        result.successes += successes;
        result.latencyTotal += Number(bucket.avg_latency || 0) * successes;
        if (bucket.model_name) result.models.add(bucket.model_name);
        return result;
      },
      { total: 0, successes: 0, latencyTotal: 0, models: new Set() },
    );
    return {
      total: summary.total,
      successRate:
        summary.total > 0 ? (summary.successes / summary.total) * 100 : null,
      averageLatency:
        summary.successes > 0 ? summary.latencyTotal / summary.successes : null,
      modelCount: summary.models.size,
    };
  }, [probeBuckets]);

  const loadReviews = async (providerId) => {
    const reviewRes = await getMarketplaceReviews({
      target_type: "provider",
      target_id: providerId,
    }).catch(() => null);
    if (reviewRes?.data?.success)
      setReviews(reviewRes.data.data?.items || reviewRes.data.data || []);
  };

  useEffect(() => {
    let active = true;
    getMarketplaceProvider(slug)
      .then(async (res) => {
        if (!active || !res.data.success) return;
        const next = res.data.data;
        setProvider(next);
        const [reviewRes, announcementRes, probeRes] = await Promise.all([
          getMarketplaceReviews({
            target_type: "provider",
            target_id: next.id,
          }).catch(() => null),
          getMarketplaceProviderAnnouncements(slug).catch(() => null),
          getMarketplaceProviderProbes(slug, "24h").catch(() => null),
        ]);
        if (!active) return;
        if (reviewRes?.data?.success) {
          setReviews(reviewRes.data.data?.items || reviewRes.data.data || []);
        }
        if (announcementRes?.data?.success) {
          setAnnouncements(announcementRes.data.data || []);
        }
        if (probeRes?.data?.success) {
          setProbeBuckets(probeRes.data.data?.buckets || []);
        }
        if (user) {
          const [statusRes, selfReviewRes] = await Promise.all([
            getMarketplaceSubscriptionStatus([next.id]),
            getMarketplaceSelfReview({
              target_type: "provider",
              target_id: next.id,
            }),
          ]);
          if (active && statusRes.data.success)
            setSubscribed(Boolean(statusRes.data.data?.[next.id]));
          if (active && selfReviewRes.data.success) {
            const review = selfReviewRes.data.data || null;
            setMyReview(review);
            setRating(Number(review?.rating || 0));
            setContent(review?.content || "");
          }
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug, user]);

  const toggle = async () => {
    if (!user) return toast.error("请先登录");
    const res = subscribed
      ? await unsubscribeMarketplaceProvider(provider.id)
      : await subscribeMarketplaceProvider(provider.id);
    if (res.data.success) setSubscribed(!subscribed);
  };

  const submitReview = async () => {
    if (!provider || rating < 1 || rating > 5) {
      toast.error("请选择 1-5 星评分");
      return;
    }
    setSubmittingReview(true);
    try {
      const payload = {
        target_type: "provider",
        target_id: provider.id,
        rating,
        content: content.trim(),
      };
      const res = myReview
        ? await updateMarketplaceReview(myReview.id, {
            rating,
            content: payload.content,
          })
        : await createMarketplaceReview(payload);
      if (res.data.success) {
        setMyReview(res.data.data || myReview);
        toast.success(res.data.message || "评价已保存");
        await loadReviews(provider.id);
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const removeReview = async () => {
    if (!myReview || !provider) return;
    setSubmittingReview(true);
    try {
      const res = await deleteMarketplaceReview(myReview.id);
      if (res.data.success) {
        setMyReview(null);
        setRating(0);
        setContent("");
        toast.success(res.data.message || "评价已删除");
        await loadReviews(provider.id);
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!provider)
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-page">
        商家不存在或未被本站准入。
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Link
        to="/marketplace"
        className="mb-5 inline-flex items-center text-sm text-page-secondary hover:text-page"
      >
        <ArrowLeft size={16} className="mr-2" />
        返回市场
      </Link>
      <section className="border-b border-page-divider pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-page-inset">
              {provider.logo ? (
                <img
                  src={provider.logo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-page">
                {provider.company_name}
              </h1>
              <p className="mt-1 text-sm text-page-muted">@{provider.slug}</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-page-secondary">
                {provider.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggle}
            className={subscribed ? "btn-secondary" : "btn-primary"}
          >
            {subscribed && <Check size={15} className="mr-1.5" />}
            {subscribed ? "已订阅" : "订阅商家"}
          </button>
        </div>
      </section>
      <section className="grid border-b border-page-divider py-6 sm:grid-cols-3">
        <HealthMetric
          icon={Activity}
          label="24 小时成功率"
          value={
            probeSummary.successRate === null
              ? "暂无数据"
              : `${probeSummary.successRate.toFixed(2)}%`
          }
        />
        <HealthMetric
          icon={Clock3}
          label="成功请求平均延迟"
          value={
            probeSummary.averageLatency === null
              ? "暂无数据"
              : `${Math.round(probeSummary.averageLatency)} ms`
          }
        />
        <HealthMetric
          icon={Store}
          label="24 小时探测请求"
          value={
            probeSummary.total > 0
              ? `${probeSummary.total.toLocaleString()} 次 / ${probeSummary.modelCount} 个模型`
              : "暂无数据"
          }
        />
      </section>
      {announcements.length > 0 && (
        <section className="border-b border-page-divider py-7">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-page-link" />
            <h2 className="text-lg font-semibold text-page">商家公告</h2>
          </div>
          <div className="mt-4 divide-y divide-page-divider border-y border-page-divider">
            {announcements.map((announcement) => (
              <article key={announcement.id} className="py-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-page-secondary">
                  {announcement.content}
                </p>
                {announcement.created_time > 0 && (
                  <time className="mt-2 block text-xs text-page-muted">
                    {new Date(
                      announcement.created_time * 1000,
                    ).toLocaleString()}
                  </time>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="py-7">
        <h2 className="text-lg font-semibold text-page">可用模型</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-page-divider">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-page-inset text-left text-page-muted">
              <tr>
                <th className="px-4 py-3">模型</th>
                <th className="px-4 py-3">类型</th>
                <th className="px-4 py-3">上下文</th>
                <th className="px-4 py-3">本站最终价格</th>
              </tr>
            </thead>
            <tbody>
              {(provider.models || []).map((model) => (
                <tr
                  key={model.id || model.model_name}
                  className="border-t border-page-divider text-page"
                >
                  <td className="px-4 py-3 font-mono">{model.model_name}</td>
                  <td className="px-4 py-3">{model.category || "-"}</td>
                  <td className="px-4 py-3">
                    {Number(model.context_length || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {Number(model.fixed_price || 0) > 0
                      ? `${fmt(model.fixed_price, 6)} / call`
                      : `${fmt(model.input_price || 0, 6)} / ${fmt(model.output_price || 0, 6)} / M`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="border-t border-page-divider py-7">
        <h2 className="text-lg font-semibold text-page">用户评价</h2>
        {user && (
          <div className="mt-4 border-b border-page-divider pb-5">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="rounded p-1"
                  aria-label={`${value} 星`}
                >
                  <Star
                    size={20}
                    className={
                      value <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-page-muted"
                    }
                  />
                </button>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="input mt-3 min-h-24 resize-y"
              maxLength={2000}
              placeholder="分享实际使用体验"
            />
            <div className="mt-3 flex justify-end gap-2">
              {myReview && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={submittingReview}
                  onClick={removeReview}
                >
                  <Trash2 size={15} className="mr-1.5" />
                  删除
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                disabled={submittingReview}
                onClick={submitReview}
              >
                {submittingReview ? (
                  <Loader2 size={15} className="mr-1.5 animate-spin" />
                ) : (
                  <Save size={15} className="mr-1.5" />
                )}
                {myReview ? "更新评价" : "提交评价"}
              </button>
            </div>
          </div>
        )}
        <div className="mt-4 space-y-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-page-muted">暂无评价</p>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-page-divider bg-page-surface p-4"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-page">
                  <Star size={15} className="fill-amber-400 text-amber-400" />
                  {review.rating || 0}/5
                </div>
                <p className="mt-2 text-sm text-page-secondary">
                  {review.content || review.comment}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function HealthMetric({ icon: Icon, label, value }) {
  return (
    <div className="border-page-divider px-0 py-3 first:pt-0 last:pb-0 sm:border-r sm:px-5 sm:py-0 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
      <div className="flex items-center gap-2 text-xs text-page-muted">
        <Icon size={15} />
        {label}
      </div>
      <p className="mt-2 text-base font-semibold text-page">{value}</p>
    </div>
  );
}
