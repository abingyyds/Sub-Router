import axios from 'axios';
import toast from 'react-hot-toast';

export const Q = 500000; // QuotaPerUnit — single source of truth

const previewModels = [
  { id: 'preview-1', model_name: 'gpt-4o-mini', display_name: 'GPT-4o Mini', enabled: true },
  { id: 'preview-2', model_name: 'claude-sonnet-4-5', display_name: 'Claude Sonnet 4.5', enabled: true },
  { id: 'preview-3', model_name: 'gemini-2.5-pro', display_name: 'Gemini 2.5 Pro', enabled: true },
  { id: 'preview-4', model_name: 'deepseek-chat', display_name: 'DeepSeek Chat', enabled: true },
  { id: 'preview-5', model_name: 'qwen-max', display_name: 'Qwen Max', enabled: true },
  { id: 'preview-6', model_name: 'grok-4', display_name: 'Grok 4', enabled: true },
  { id: 'preview-7', model_name: 'claude-haiku-4-5', display_name: 'Claude Haiku 4.5', enabled: true },
  { id: 'preview-8', model_name: 'gpt-5-mini', display_name: 'GPT-5 Mini', enabled: true },
];

const previewPackages = [
  {
    id: 'preview-basic',
    name: 'Starter Pack',
    description: '适合个人试用和轻量 API 调用。',
    price: 29,
    original_price: 49,
    duration: 30,
    quota_amount: Q * 6,
    quota_reset_period: 'never',
    enabled: true,
  },
  {
    id: 'preview-pro',
    name: 'Pro Relay',
    description: '高频调用、自动路由、失败重试的主力套餐。',
    price: 99,
    original_price: 149,
    duration: 30,
    quota_amount: Q * 24,
    quota_reset_period: 'never',
    enabled: true,
  },
  {
    id: 'preview-team',
    name: 'Team Scale',
    description: '适合团队共享密钥、模型分组和稳定生产调用。',
    price: 299,
    original_price: 399,
    duration: 30,
    quota_amount: Q * 90,
    quota_reset_period: 'never',
    enabled: true,
  },
];

const getPreviewTheme = () => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('preview_theme') || '';
};

const previewResponse = (data) => Promise.resolve({ data: { success: true, data } });

const api = axios.create({
  baseURL: '',
  timeout: 30000,
  withCredentials: true, // CRITICAL: send session cookies on every request
  headers: { 'Content-Type': 'application/json' },
});

// Attach New-Api-User header (required by backend auth middleware)
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem('dist_user_id');
  if (userId) {
    config.headers['New-Api-User'] = userId;
  }
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
    const msg = err.response?.data?.message || err.message || 'Request failed';
    if (err.response?.status === 401) {
      localStorage.removeItem('dist_user_id');
      // Emit event so AuthContext can clear React state
      window.dispatchEvent(new Event('auth:logout'));
      if (!shouldSkipErrorHandler(err.config)) {
        toast.error('Session expired, please log in again');
      }
    } else if (!shouldSkipErrorHandler(err.config)) {
      toast.error(msg);
    }
    return Promise.reject(err);
  }
);

// ===== Public =====
export const getSiteInfo = () => {
  const theme = getPreviewTheme();
  if (theme) {
    return previewResponse({
      name: 'SubRouter Preview',
      theme_template: theme,
      enable_topup: true,
      top_up_link: 'https://example.com/redeem-codes',
      allow_sub_dist: true,
      currency: {
        code: 'CNY',
        symbol: '¥',
        exchange_rate: 7,
        usd_exchange_rate: 7,
      },
    });
  }
  return api.get('/api/dist/site/info');
};
export const getSiteModels = () => getPreviewTheme() ? previewResponse(previewModels) : api.get('/api/dist/site/models');
export const getSitePricing = () => api.get('/api/dist/site/pricing');
export const getSitePackages = () => getPreviewTheme() ? previewResponse(previewPackages) : api.get('/api/dist/site/packages');
export const getSiteKeyGroups = () => api.get('/api/dist/site/key-groups');
export const getSiteKeyGroupPricing = (id) => api.get(`/api/dist/site/key-groups/${id}/pricing`);
export const getSubDistributorInfo = () => api.get('/api/dist/site/sub-distributor/info');

// ===== Auth =====
export const register = (data) => api.post('/api/dist/user/register', data);
export const login = (data) => api.post('/api/dist/user/login', data);
export const logout = () => api.post('/api/dist/user/logout');

// ===== User =====
export const getUserSelf = (config) => api.get('/api/dist/user/self', config);
export const getUserUsage = () => api.get('/api/dist/user/usage');
export const getUserLogs = (params) => api.get('/api/dist/user/logs', { params });
export const getUserLogsStat = (params) => api.get('/api/dist/user/logs/stat', { params });
export const getUserTasks = (params) => api.get('/api/dist/user/tasks', { params });
export const getUserMjTasks = (params) => api.get('/api/dist/user/mj', { params });

// ===== Tokens =====
export const getTokens = () => api.get('/api/dist/token/list');
export const getTokenSupportedModels = (id) => api.get(`/api/dist/token/${id}/models`);
export const createToken = (data) => api.post('/api/dist/token/create', data);
export const updateToken = (id, data) => api.put(`/api/dist/token/${id}`, data);
export const deleteToken = (id) => api.delete(`/api/dist/token/${id}`);

// ===== Purchase =====
export const redeemCode = (key) => api.post('/api/dist/topup/redeem', { key }); // backend field is "key"
export const subscribePackage = (packageId) => api.post('/api/dist/package/subscribe', { package_id: packageId });
export const getActiveSubscriptions = (config) =>
  api.get('/api/dist/package/subscriptions', config);

// ===== Online Topup =====
export const getTopupInfo = () => api.get('/api/dist/topup/info');
export const calculateAmount = (data) => api.post('/api/dist/topup/amount', data);
export const createEpayOrder = (data) => api.post('/api/dist/topup/pay', data);
export const createStripeOrder = (data) => api.post('/api/dist/topup/stripe/pay', data);
export const createCreemOrder = (data) => api.post('/api/dist/topup/creem/pay', data);
export const createCryptoOrder = (data) => api.post('/api/dist/topup/crypto/pay', data);
export const getCryptoOrderStatus = (tradeNo) => api.get(`/api/dist/topup/crypto/status?trade_no=${tradeNo}`);
export const getTopupHistory = (params) => api.get('/api/dist/topup/history', { params });

// ===== Affiliate / Invitation =====
export const getAffCode = () => api.get('/api/dist/aff');
export const transferAffQuota = (data) => api.post('/api/dist/aff_transfer', data);
export const getAffEarnings = (params) => api.get('/api/dist/aff_earnings', { params });
export const getAffPayouts = (params) => api.get('/api/dist/aff_payouts', { params });
export const requestAffWithdraw = (data) => api.post('/api/dist/aff_withdraw', data);
export const submitDistKolApply = (data) => api.post('/api/dist/kol_apply', data);
export const getDistKolStatus = () => api.get('/api/dist/kol_status');
export const createSubDistributorOrder = (data) => api.post('/api/dist/site/sub-distributor/pay', data);

// ===== Helpers =====
export const quotaToDollar = (quota) => (quota / Q).toFixed(4);
export const quotaToDollar6 = (quota) => (quota / Q).toFixed(6);

export default api;
