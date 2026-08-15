import axios from "axios";
import toast from "react-hot-toast";
import i18n from "./i18n";
import {
  getStoredAppLanguage,
  normalizeAppLanguage,
} from "./i18n/languageUtils";

export const Q = 500000; // QuotaPerUnit — single source of truth

const previewModels = [
  {
    id: "preview-1",
    model_name: "gpt-4o-mini",
    display_name: "GPT-4o Mini",
    enabled: true,
  },
  {
    id: "preview-2",
    model_name: "claude-sonnet-4-5",
    display_name: "Claude Sonnet 4.5",
    enabled: true,
  },
  {
    id: "preview-3",
    model_name: "gemini-2.5-pro",
    display_name: "Gemini 2.5 Pro",
    enabled: true,
  },
  {
    id: "preview-4",
    model_name: "deepseek-chat",
    display_name: "DeepSeek Chat",
    enabled: true,
  },
  {
    id: "preview-5",
    model_name: "qwen-max",
    display_name: "Qwen Max",
    enabled: true,
  },
  {
    id: "preview-6",
    model_name: "grok-4",
    display_name: "Grok 4",
    enabled: true,
  },
  {
    id: "preview-7",
    model_name: "claude-haiku-4-5",
    display_name: "Claude Haiku 4.5",
    enabled: true,
  },
  {
    id: "preview-8",
    model_name: "gpt-5-mini",
    display_name: "GPT-5 Mini",
    enabled: true,
  },
];

const previewPackages = [
  {
    id: "preview-basic",
    name: "Starter Pack",
    description_key: "preview.starterDesc",
    price: 29,
    original_price: 49,
    duration: 30,
    quota_amount: Q * 6,
    quota_reset_period: "never",
    enabled: true,
  },
  {
    id: "preview-pro",
    name: "Pro Relay",
    description_key: "preview.proDesc",
    price: 99,
    original_price: 149,
    duration: 30,
    quota_amount: Q * 24,
    quota_reset_period: "never",
    enabled: true,
  },
  {
    id: "preview-team",
    name: "Team Scale",
    description_key: "preview.teamDesc",
    price: 299,
    original_price: 399,
    duration: 30,
    quota_amount: Q * 90,
    quota_reset_period: "never",
    enabled: true,
  },
];

const previewOfficialChannels = [
  {
    official_channel_id: 1,
    name: "OpenAI Official",
    description:
      "OpenAI official model catalog supplied by multiple provider keys.",
    max_final_discount: 0.5,
    min_allowed_final_discount: 0.32,
    min_final_price_discount: 0.32,
    usable_model_count: 24,
    available_key_count: 18,
    available_provider_count: 6,
    key_availability: 92.4,
    model_availability: 100,
    models: [
      {
        id: "preview-official-1",
        model_name: "gpt-4o-mini",
        category: "chat",
        price_currency: "USD",
        official_input_price: 0.15,
        official_output_price: 0.6,
        final_input_price: 0.048,
        final_output_price: 0.192,
        final_price_discount: 0.32,
        key_count: 12,
        available_key_count: 11,
        key_availability: 91.7,
      },
    ],
  },
  {
    official_channel_id: 2,
    name: "Anthropic Official",
    description: "Claude official models with station-level price caps.",
    max_final_discount: 0.6,
    min_allowed_final_discount: 0.4,
    min_final_price_discount: 0.4,
    usable_model_count: 8,
    available_key_count: 9,
    available_provider_count: 4,
    key_availability: 88.9,
    model_availability: 100,
    models: [
      {
        id: "preview-official-2",
        model_name: "claude-sonnet-4-5",
        category: "chat",
        price_currency: "USD",
        official_input_price: 3,
        official_output_price: 15,
        final_input_price: 1.2,
        final_output_price: 6,
        final_price_discount: 0.4,
        key_count: 7,
        available_key_count: 6,
        key_availability: 85.7,
      },
    ],
  },
];

const getPreviewTheme = () => {
  if (!import.meta.env.DEV || typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("preview_theme") || "";
};

const previewResponse = (data) =>
  Promise.resolve({ data: { success: true, data } });

const api = axios.create({
  baseURL: "",
  timeout: 30000,
  withCredentials: true, // CRITICAL: send session cookies on every request
  headers: { "Content-Type": "application/json" },
});

const idempotencyConfig = () => ({
  headers: {
    "Idempotency-Key":
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  },
});

// Public bootstrap data is shared by the home page and public detail pages.
// Keep one in-flight request and a very short cache to avoid duplicate work
// during React StrictMode mounts and rapid route changes.
const publicRequestCache = new Map();
const cachedPublicRequest = (key, request, ttl = 30000) => {
  const now = Date.now();
  const cached = publicRequestCache.get(key);
  if (cached && now < cached.expiresAt) {
    return cached.promise || Promise.resolve(cached.value);
  }
  const promise = request()
    .then((response) => {
      publicRequestCache.set(key, {
        value: response,
        expiresAt: Date.now() + ttl,
      });
      return response;
    })
    .catch((error) => {
      publicRequestCache.delete(key);
      throw error;
    });
  publicRequestCache.set(key, { promise, expiresAt: now + ttl });
  return promise;
};

let siteInfoPromise;

// Attach New-Api-User header (required by backend auth middleware)
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem("dist_user_id");
  if (userId) {
    config.headers["New-Api-User"] = userId;
  }
  config.headers["Accept-Language"] = normalizeAppLanguage(
    getStoredAppLanguage() || i18n.resolvedLanguage || navigator.language,
  );
  return config;
});

const shouldSkipErrorHandler = (config) => Boolean(config?.skipErrorHandler);

// Global error handler
api.interceptors.response.use(
  (res) => {
    // Handle success:false responses with user-visible errors
    if (
      res.data &&
      res.data.success === false &&
      res.data.message &&
      !shouldSkipErrorHandler(res.config)
    ) {
      toast.error(res.data.message);
    }
    return res;
  },
  (err) => {
    const msg = err.response?.data?.message || err.message || "Request failed";
    if (err.response?.status === 401) {
      localStorage.removeItem("dist_user_id");
      // Emit event so AuthContext can clear React state
      window.dispatchEvent(new Event("auth:logout"));
      if (!shouldSkipErrorHandler(err.config)) {
        toast.error(i18n.t("common.sessionExpired"));
      }
    } else if (!shouldSkipErrorHandler(err.config)) {
      toast.error(msg);
    }
    return Promise.reject(err);
  },
);

// ===== Public =====
export const getSiteInfo = () => {
  const theme = getPreviewTheme();
  if (theme) {
    return previewResponse({
      name: "API Preview",
      theme_template: theme,
      enable_topup: true,
      top_up_link: "https://example.com/redeem-codes",
      top_up_link_name: "Redeem Code Shop",
      allow_sub_dist: true,
      show_app_market: true,
      show_official_channels: true,
      has_official_channels: true,
      show_shared_subscriptions: true,
      currency: {
        code: "CNY",
        symbol: "¥",
        exchange_rate: 7,
        usd_exchange_rate: 7,
      },
    });
  }
  if (!siteInfoPromise) {
    siteInfoPromise = api
      .get("/api/dist/site/info", {
        timeout: 8000,
        skipErrorHandler: true,
      })
      .finally(() => {
        siteInfoPromise = undefined;
      });
  }
  return siteInfoPromise;
};
export const getSiteModels = (params = {}) =>
  getPreviewTheme()
    ? previewResponse(previewModels)
    : cachedPublicRequest(`site-models:${JSON.stringify(params)}`, () =>
        api.get("/api/dist/site/models", { params }),
      );
export const getSitePricing = () => api.get("/api/dist/site/pricing");
export const getSiteOfficialChannels = (params = {}) =>
  getPreviewTheme()
    ? previewResponse(
        params.channel_id
          ? previewOfficialChannels.filter(
              (channel) =>
                String(channel.official_channel_id) ===
                String(params.channel_id),
            )
          : previewOfficialChannels,
      )
    : api.get("/api/dist/site/official-channels", { params });
export const getSiteOfficialChannelAvailability = (
  channelId,
  modelId,
  period = "24h",
) => {
  const params = { period };
  if (modelId) params.model_id = modelId;
  return getPreviewTheme()
    ? previewResponse({
        official_channel_id: channelId,
        official_model_id: modelId || 0,
        period,
        availability: modelId ? 100 : 92.4,
        providers: modelId
          ? [
              {
                provider_index: 1,
                key_count: 10,
                availability: 100,
                price_discount: 0.32,
                buckets: [],
              },
            ]
          : [],
        keys: modelId
          ? [
              {
                key_index: 1,
                provider_key_index: 1,
                provider_index: 1,
                availability: 100,
                price_discount: 0.32,
                fixed_price: 0.0448,
                price_currency: "USD",
                probe_total: 10,
                probe_successes: 10,
                buckets: [],
              },
            ]
          : [],
        buckets: Array.from(
          { length: period === "7d" ? 14 : 24 },
          (_, index) => ({
            bucket_time: index,
            total: 10,
            successes: modelId ? 10 : index === 3 ? 8 : 10,
            availability: modelId ? 100 : index === 3 ? 80 : 100,
          }),
        ),
      })
    : api.get(`/api/dist/site/official-channels/${channelId}/availability`, {
        params,
      });
};
export const getSitePackages = () =>
  getPreviewTheme()
    ? previewResponse(
        previewPackages.map((item) => ({
          ...item,
          description: i18n.t(item.description_key),
        })),
      )
    : cachedPublicRequest("site-packages", () =>
        api.get("/api/dist/site/packages"),
      );
export const getSiteKeyGroups = () => api.get("/api/dist/site/key-groups");
export const getSiteKeyGroupPricing = (id) =>
  api.get(`/api/dist/site/key-groups/${id}/pricing`);
export const getSubDistributorInfo = () =>
  api.get("/api/dist/site/sub-distributor/info");
export const getAppRatings = () => api.get("/api/dist/app-market/ratings");
export const getAppReviews = (params) =>
  api.get("/api/dist/app-market/reviews", { params });

// ===== Auth =====
export const sendRegistrationEmailVerification = (email) =>
  api.post("/api/dist/user/email-verification", { email });
export const register = (data) => api.post("/api/dist/user/register", data);
export const login = (data) => api.post("/api/dist/user/login", data);
export const logout = () => api.post("/api/dist/user/logout");
export const completeOAuth = (provider, params) =>
  api.get(`/api/dist/oauth/${encodeURIComponent(provider)}/callback`, {
    params,
    skipErrorHandler: true,
  });

// ===== User =====
export const getUserSelf = (config) => api.get("/api/dist/user/self", config);
export const updateUserLanguage = (language) =>
  api.put("/api/dist/user/language", { language });
export const updateAnnouncementEmailPreference = (enabled) =>
  api.put("/api/dist/user/announcement-email", { enabled });
export const updateUserPassword = (data) =>
  api.put("/api/dist/user/password", data);
export const sendEmailBindingVerification = (email) =>
  api.post("/api/dist/user/email/bind-verification", { email });
export const bindUserEmail = (email, verificationCode) =>
  api.put("/api/dist/user/email", {
    email,
    verification_code: verificationCode,
  });
export const getDist2FAStatus = (config = {}) =>
  api.get("/api/dist/user/2fa/status", config);
export const setupDist2FA = (config = {}) =>
  api.post("/api/dist/user/2fa/setup", undefined, config);
export const enableDist2FA = (code, config = {}) =>
  api.post("/api/dist/user/2fa/enable", { code }, config);
export const disableDist2FA = (code, config = {}) =>
  api.post("/api/dist/user/2fa/disable", { code }, config);
export const regenerateDist2FABackupCodes = (code, config = {}) =>
  api.post("/api/dist/user/2fa/backup_codes", { code }, config);
export const verifyDist2FA = (code, config = {}) =>
  api.post("/api/dist/verify", { method: "2fa", code }, config);
export const getDistVerificationStatus = (config = {}) =>
  api.get("/api/dist/verify/status", config);
export const getUserUsage = () => api.get("/api/dist/user/usage");
export const getUserLogs = (params) =>
  api.get("/api/dist/user/logs", { params });
export const exportUserLogs = (params) =>
  api.get("/api/dist/user/logs/export", {
    params,
    responseType: "blob",
  });
export const getUserLogsStat = (params) =>
  api.get("/api/dist/user/logs/stat", { params });
export const getUserTasks = (params) =>
  api.get("/api/dist/user/tasks", { params });
export const getUserMjTasks = (params) =>
  api.get("/api/dist/user/mj", { params });
export const getMyAppReview = (appId, config = {}) =>
  api.get("/api/dist/app-market/reviews/self", {
    ...config,
    params: { ...(config.params || {}), app_id: appId },
  });
export const createAppReview = (data) =>
  api.post("/api/dist/app-market/reviews", data);
export const updateAppReview = (id, data) =>
  api.put(`/api/dist/app-market/reviews/${id}`, data);
export const deleteAppReview = (id) =>
  api.delete(`/api/dist/app-market/reviews/${id}`);
export const createAppReviewReply = (reviewId, content) =>
  api.post(`/api/dist/app-market/reviews/${reviewId}/replies`, { content });

// ===== Tokens =====
export const getTokens = () => api.get("/api/dist/token/list");
export const getTokenSupportedModels = (id) =>
  api.get(`/api/dist/token/${id}/models`);
export const createToken = (data) => api.post("/api/dist/token/create", data);
export const updateToken = (id, data) => api.put(`/api/dist/token/${id}`, data);
export const deleteToken = (id) => api.delete(`/api/dist/token/${id}`);

// ===== Full marketplace =====
export const getMarketplaceModels = (params = {}) =>
  api.get("/api/dist/marketplace/models", { params });
export const getMarketplaceRankings = (params = {}) =>
  api.get("/api/dist/marketplace/rankings", { params });
export const getMarketplaceProviders = (params = {}) =>
  api.get("/api/dist/marketplace/providers", { params });
export const getMarketplaceProvider = (slug) =>
  api.get(`/api/dist/marketplace/providers/${encodeURIComponent(slug)}`);
export const getMarketplaceProviderAnnouncements = (slug) =>
  api.get(
    `/api/dist/marketplace/providers/${encodeURIComponent(slug)}/announcements`,
  );
export const getMarketplaceProviderProbes = (slug, period = "24h") =>
  api.get(
    `/api/dist/marketplace/providers/${encodeURIComponent(slug)}/probes`,
    { params: { period } },
  );
export const getMarketplaceReviews = (params = {}) =>
  api.get("/api/dist/marketplace/reviews", { params });
export const getMarketplaceSelfReview = (params = {}) =>
  api.get("/api/dist/marketplace/reviews/self", { params });
export const createMarketplaceReview = (data) =>
  api.post("/api/dist/marketplace/reviews", data);
export const updateMarketplaceReview = (id, data) =>
  api.put(`/api/dist/marketplace/reviews/${id}`, data);
export const deleteMarketplaceReview = (id) =>
  api.delete(`/api/dist/marketplace/reviews/${id}`);
export const getMarketplaceSubscriptionStatus = (providerIds) =>
  api.get("/api/dist/marketplace/subscription-status", {
    params: { provider_ids: providerIds.join(",") },
  });
export const subscribeMarketplaceProvider = (providerId) =>
  api.post("/api/dist/marketplace/subscribe", { provider_id: providerId });
export const unsubscribeMarketplaceProvider = (providerId) =>
  api.delete(`/api/dist/marketplace/subscribe/${providerId}`);
export const getMarketplaceQuickStart = () =>
  api.get("/api/dist/marketplace/quick-start");
export const saveMarketplaceQuickStart = (data) =>
  api.post("/api/dist/marketplace/quick-start", data);

// ===== Shared subscriptions =====
export const getSharedPlans = () =>
  api.get("/api/dist/shared-subscriptions/plans");
export const getSharedPlanCatalog = () =>
  api.get("/api/dist/shared-subscriptions/plans/catalog");
export const getSharedPlan = (id, params = {}) =>
  api.get(`/api/dist/shared-subscriptions/plans/${id}`, { params });
export const getSharedPlanProbes = (id, period = "24h") =>
  api.get(`/api/dist/shared-subscriptions/plans/${id}/probes`, {
    params: { period },
  });
export const subscribeSharedPlan = (id) =>
  api.post(`/api/dist/shared-subscriptions/plans/${id}/subscribe`);
export const unsubscribeSharedPlan = (id) =>
  api.delete(`/api/dist/shared-subscriptions/plans/${id}/subscribe`);
export const getSharedSupplies = () =>
  api.get("/api/dist/shared-subscriptions/supplies");
export const importSharedAccounts = (accounts, oauthOnly = false) =>
  api.post(
    "/api/dist/shared-subscriptions/accounts/import",
    { accounts, oauth_only: oauthOnly },
    { ...idempotencyConfig(), timeout: oauthOnly ? 0 : undefined },
  );
export const updateSharedAccountStatus = (id, enabled) =>
  api.patch(`/api/dist/shared-subscriptions/accounts/${id}/status`, {
    enabled,
  });
export const deleteSharedAccount = (id) =>
  api.delete(`/api/dist/shared-subscriptions/accounts/${id}`);
export const getSharedEarnings = (params = {}) =>
  api.get("/api/dist/shared-subscriptions/earnings", { params });
export const transferSharedEarnings = (data) =>
  api.post(
    "/api/dist/shared-subscriptions/earnings/transfer",
    data,
    idempotencyConfig(),
  );
export const getSharedPaymentProfile = () =>
  api.get("/api/dist/shared-subscriptions/payment-profile");
export const saveSharedPaymentProfile = (data) =>
  api.put("/api/dist/shared-subscriptions/payment-profile", data);
export const getSharedPayouts = () =>
  api.get("/api/dist/shared-subscriptions/payouts");
export const createSharedPayout = (data) =>
  api.post("/api/dist/shared-subscriptions/payouts", data, idempotencyConfig());
export const cancelSharedPayout = (id) =>
  api.post(`/api/dist/shared-subscriptions/payouts/${id}/cancel`);
export const getSharedOAuthCapabilities = (platform) =>
  api.get("/api/dist/shared-subscriptions/oauth/capabilities", {
    params: { platform },
    skipErrorHandler: true,
  });
export const startSharedOAuth = (data) =>
  api.post("/api/dist/shared-subscriptions/oauth/start", data);
export const completeSharedOAuth = (data) =>
  api.post(
    "/api/dist/shared-subscriptions/oauth/complete",
    data,
    idempotencyConfig(),
  );
export const createSharedPlanToken = (planId, name, smart = false) =>
  createToken({
    name,
    type: smart ? "normal" : "shared",
    shared_plan_id: smart ? 0 : planId,
    include_shared_subscriptions: true,
    include_official_channels: smart,
    unlimited_quota: true,
  });

// ===== Provider application =====
export const getProviderApplication = () =>
  api.get("/api/dist/provider/application");
export const sendProviderApplicationVerification = () =>
  api.post("/api/dist/provider/application/email-verification");
export const submitProviderApplication = (data) =>
  api.post("/api/dist/provider/application", data);

// ===== Purchase =====
export const redeemCode = (key) => api.post("/api/dist/topup/redeem", { key }); // backend field is "key"
export const subscribePackage = (packageId) =>
  api.post("/api/dist/package/subscribe", { package_id: packageId });
export const getActiveSubscriptions = (config) =>
  api.get("/api/dist/package/subscriptions", config);

// ===== Online Topup =====
export const getTopupInfo = () => api.get("/api/dist/topup/info");
export const calculateAmount = (data) =>
  api.post("/api/dist/topup/amount", data);
export const createEpayOrder = (data) => api.post("/api/dist/topup/pay", data);
export const createStripeOrder = (data) =>
  api.post("/api/dist/topup/stripe/pay", data);
export const createCreemOrder = (data) =>
  api.post("/api/dist/topup/creem/pay", data);
export const createCryptoOrder = (data) =>
  api.post("/api/dist/topup/crypto/pay", data);
export const getCryptoOrderStatus = (tradeNo) =>
  api.get(`/api/dist/topup/crypto/status?trade_no=${tradeNo}`);
export const reconcileCryptoOrder = (tradeNo) =>
  api.post("/api/dist/topup/crypto/reconcile", { trade_no: tradeNo });
export const claimCryptoOrderTransfer = (tradeNo, txHash) =>
  api.post("/api/dist/topup/crypto/claim", {
    trade_no: tradeNo,
    tx_hash: txHash,
  });
export const getTopupHistory = (params) =>
  api.get("/api/dist/topup/history", { params });

// ===== Invoice =====
export const getInvoiceInfo = () => api.get("/api/dist/invoice/info");
export const getInvoiceHistory = (params) =>
  api.get("/api/dist/invoice/history", { params });
export const createInvoice = (data) => api.post("/api/dist/invoice", data);

// ===== Affiliate / Invitation =====
export const getAffCode = () => api.get("/api/dist/aff");
export const transferAffQuota = (data) =>
  api.post("/api/dist/aff_transfer", data);
export const getAffEarnings = (params) =>
  api.get("/api/dist/aff_earnings", { params });
export const getAffPayouts = (params) =>
  api.get("/api/dist/aff_payouts", { params });
export const requestAffWithdraw = (data, config = {}) =>
  api.post("/api/dist/aff_withdraw", data, config);
export const submitDistKolApply = (data) =>
  api.post("/api/dist/kol_apply", data);
export const getDistKolStatus = () => api.get("/api/dist/kol_status");
export const createSubDistributorOrder = (data) =>
  api.post("/api/dist/site/sub-distributor/pay", data);

// ===== Helpers =====
export const quotaToDollar = (quota) => (quota / Q).toFixed(4);
export const quotaToDollar6 = (quota) => (quota / Q).toFixed(6);

export default api;
