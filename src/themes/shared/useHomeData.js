import { useEffect, useMemo, useState } from 'react';
import { getSiteModels, getSitePackages, Q } from '../../api';

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

const devPreviewTheme =
  import.meta.env.DEV && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('preview_theme')
    : '';

export function useHomeData() {
  const [models, setModels] = useState(devPreviewTheme ? previewModels : []);
  const [packages, setPackages] = useState(devPreviewTheme ? previewPackages : []);

  useEffect(() => {
    if (devPreviewTheme) return;
    getSiteModels().then(r => { if (r.data.success) setModels(r.data.data || []); }).catch(() => {});
    getSitePackages().then(r => { if (r.data.success) setPackages(r.data.data || []); }).catch(() => {});
  }, []);

  const enabledModels = useMemo(() => models.filter(m => m.enabled !== false), [models]);
  const visiblePackages = useMemo(() => packages.filter(p => p.enabled), [packages]);

  return { models, packages, enabledModels, visiblePackages };
}

export function packageQuotaDollars(pkg) {
  const quotaDollars = pkg.quota_amount > 0 ? pkg.quota_amount / Q : 0;
  const period = pkg.quota_reset_period || 'never';
  if (period === 'never' || pkg.duration <= 0 || quotaDollars <= 0) {
    return quotaDollars;
  }

  let count = 1;
  if (period === 'daily') count = pkg.duration;
  if (period === 'weekly') count = Math.floor(pkg.duration / 7);
  if (period === 'monthly') count = Math.floor(pkg.duration / 30);
  return quotaDollars * Math.max(count, 1);
}
