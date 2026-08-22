import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Copy,
  KeyRound,
  Layers3,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import {
  getTokens,
  createToken,
  updateToken,
  deleteToken,
  getSiteKeyGroups,
  getSiteKeyGroupPricing,
  getSiteModels,
	getTokenSupportedModels,
	getMarketplaceProviders,
	saveMarketplaceQuickStart,
  Q,
} from '../api';
import ConfigExporter from '../components/ConfigExporter';
import DownloadCatalog from '../components/DownloadCatalog';
import { useCurrency, useSite } from '../context/SiteContext';
import { formatPricingDetailRows } from '../utils/pricingDetails';
import toast from 'react-hot-toast';

const DEFAULT_SUBROUTER_ROUTE_PREFERENCE =
  'first_token_first,stability_first,authenticity_first,price_first';

const normalizeOfficialKeyMaxDiscount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1) : 0;
};

const trimPriceMultiplier = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(n >= 10 ? 1 : 2).replace(/\.?0+$/, '');
};

const formatDiscountHint = (value, t) => {
  const discount = normalizeOfficialKeyMaxDiscount(value);
  if (discount <= 0) return '';
  if (discount < 1) {
    return t('officialChannels.discountLabel', {
      value: trimPriceMultiplier(discount * 10),
      multiplier: trimPriceMultiplier(discount),
      percent: trimPriceMultiplier(discount * 100),
    });
  }
  return t('officialChannels.multiplierLabel', { value: trimPriceMultiplier(discount) });
};

const emptyControlForm = () => ({
  unlimited_quota: true,
  quota_amount: '',
  expired_time: '',
  model_limits: [],
  allow_ips: '',
	subrouter_sort_mode: 'token_price_first',
	subrouter_route_preference: DEFAULT_SUBROUTER_ROUTE_PREFERENCE,
	subrouter_providers: [],
	subrouter_model_providers: '',
	subrouter_model_price_limits: '',
	include_provider_self: true,
	include_official_channels: true,
	official_key_max_discount: '',
	include_shared_subscriptions: true,
	shared_subscription_max_discount: '',
	auto_subscribe_new: false,
});

const padDatePart = (value) => String(value).padStart(2, '0');

const timestampToDateTimeLocal = (timestamp) => {
  const n = Number(timestamp);
  if (!Number.isFinite(n) || n <= 0) return '';
  const date = new Date(n * 1000);
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-') + `T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
};

const parseDateTimeLocal = (value) => {
  if (!value) return -1;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? Math.ceil(ms / 1000) : null;
};

const quotaToDisplayAmount = (quota, rate) => {
  const n = Number(quota || 0);
  const r = Number(rate || 1) || 1;
  if (!Number.isFinite(n) || n <= 0) return '';
  return Number(((n / Q) * r).toFixed(6)).toString();
};

const displayAmountToQuota = (amount, rate) => {
  const n = Number(amount || 0);
  const r = Number(rate || 1) || 1;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round((n / r) * Q);
};

const parseModelLimits = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildTokenControlPayload = (form, rate, t, includeModelLimits = true, fullMode = false) => {
  const expiredTime = parseDateTimeLocal(form.expired_time);
  if (expiredTime === null) {
    toast.error(t('tokens.invalidExpireTime'));
    return null;
  }
  const unlimitedQuota = Boolean(form.unlimited_quota);
  const remainQuota = unlimitedQuota ? 0 : displayAmountToQuota(form.quota_amount, rate);
  if (!unlimitedQuota && remainQuota < 0) {
    toast.error(t('tokens.invalidQuota'));
    return null;
  }
  const payload = {
    expired_time: expiredTime,
    unlimited_quota: unlimitedQuota,
    remain_quota: remainQuota,
    allow_ips: String(form.allow_ips || '').trim(),
    subrouter_sort_mode: form.subrouter_sort_mode || 'token_price_first',
  };
	if (includeModelLimits) {
	  payload.model_limits = parseModelLimits(form.model_limits).join(',');
	}
	if (fullMode && includeModelLimits) {
	  payload.subrouter_route_preference = form.subrouter_route_preference;
	  payload.subrouter_providers = parseModelLimits(form.subrouter_providers).join(',');
	  payload.subrouter_model_providers = String(form.subrouter_model_providers || '').trim();
	  payload.subrouter_model_price_limits = String(form.subrouter_model_price_limits || '').trim();
	  payload.include_provider_self = Boolean(form.include_provider_self);
	  payload.include_shared_subscriptions = Boolean(form.include_shared_subscriptions);
	  payload.shared_subscription_max_discount = Number(form.shared_subscription_max_discount || 0);
	}
	return payload;
};

const tokenToEditForm = (token, rate) => ({
  name: token?.name || '',
  unlimited_quota: token?.unlimited_quota !== false,
  quota_amount: quotaToDisplayAmount(token?.remain_quota, rate),
  expired_time: timestampToDateTimeLocal(token?.expired_time),
  model_limits: parseModelLimits(token?.model_limits),
  allow_ips: token?.allow_ips || '',
	subrouter_sort_mode: token?.subrouter_sort_mode || 'token_price_first',
	subrouter_route_preference:
	  token?.subrouter_route_preference || DEFAULT_SUBROUTER_ROUTE_PREFERENCE,
	subrouter_providers: parseModelLimits(token?.subrouter_providers),
	subrouter_model_providers: token?.subrouter_model_providers || '',
	subrouter_model_price_limits: token?.subrouter_model_price_limits || '',
	include_provider_self: token?.include_provider_self !== false,
	include_official_channels: Boolean(token?.include_official_channels),
  official_key_max_discount: token?.include_official_channels
    ? normalizeOfficialKeyMaxDiscount(token?.official_key_max_discount) || ''
		: normalizeOfficialKeyMaxDiscount(token?.official_key_max_discount),
	include_shared_subscriptions: token?.include_shared_subscriptions !== false,
	shared_subscription_max_discount: token?.shared_subscription_max_discount || '',
});

const isValidOfficialRoutingMaxDiscount = (value) => {
  if (String(value ?? '').trim() === '') return true;
  const discount = Number(value);
  return Number.isFinite(discount) && discount >= 0 && discount <= 1;
};

export default function Tokens() {
  const { t } = useTranslation();
  const { site } = useSite();
  const { symbol, rate, code, usdRate } = useCurrency();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingToken, setEditingToken] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [expandedTokens, setExpandedTokens] = useState({});
  const [tokenModels, setTokenModels] = useState({});
	const [modelOptions, setModelOptions] = useState([]);
	const [providerOptions, setProviderOptions] = useState([]);
	const [providerOptionsLoading, setProviderOptionsLoading] = useState(false);
  const [createModelSearch, setCreateModelSearch] = useState('');
  const [editModelSearch, setEditModelSearch] = useState('');

  // Key groups
  const [keyGroups, setKeyGroups] = useState([]);
  const [activePricingGroup, setActivePricingGroup] = useState(null);
  const [groupPricingCache, setGroupPricingCache] = useState({});
  const [loadingGroupPricingId, setLoadingGroupPricingId] = useState(0);
  const [groupPricingSearch, setGroupPricingSearch] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState('normal');
  const [createName, setCreateName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(0);
  const [createOfficialKeyMaxDiscount, setCreateOfficialKeyMaxDiscount] = useState(0);
  const [createControls, setCreateControls] = useState(emptyControlForm);
  const [creating, setCreating] = useState(false);
	const officialChannelsEnabled = site?.show_official_channels !== false && site?.has_official_channels;
	const sharedSubscriptionsEnabled = site?.show_shared_subscriptions !== false;
	const fullMode = site?.full_mode === true || site?.display_mode === 'full';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tokensRes, groupsRes] = await Promise.all([
        getTokens(),
        getSiteKeyGroups().catch(() => ({ data: { success: false } })),
      ]);
      if (tokensRes.data.success) setTokens(tokensRes.data.data || []);
      if (groupsRes.data.success) setKeyGroups(groupsRes.data.data || []);
    } catch (e) { /* interceptor */ }
    setLoading(false);
  }, []);

	useEffect(() => { load(); }, [load]);

	useEffect(() => {
	  if (!fullMode) {
		setProviderOptions([]);
		setProviderOptionsLoading(false);
		return;
	  }
	  setProviderOptionsLoading(true);
	  getMarketplaceProviders({ page_size: 200 })
		.then((res) => {
		  if (res.data.success) setProviderOptions(res.data.data || []);
		})
		.catch(() => {})
		.finally(() => setProviderOptionsLoading(false));
	}, [fullMode]);

  useEffect(() => {
    const createOfficialRouting = officialChannelsEnabled && showCreate && createType === 'normal'
      && createControls.include_official_channels;
    const editingOfficialToken = editingToken?.type === 'official' || editingToken?.group === 'dist_official';
    const editOfficialRouting = officialChannelsEnabled && Boolean(editingToken) && !editingOfficialToken
      && editForm?.include_official_channels;
    const maxDiscount = createOfficialRouting
      ? Number(createControls.official_key_max_discount)
      : editOfficialRouting
        ? Number(editForm.official_key_max_discount)
        : 0;
    const includeProviderSelf = showCreate
      ? Boolean(createControls.include_provider_self)
      : editForm
        ? Boolean(editForm.include_provider_self)
        : true;
    const params = createOfficialRouting || editOfficialRouting
      ? {
          include_provider_self: includeProviderSelf,
          include_official_channels: true,
          ...(maxDiscount > 0 ? { official_key_max_discount: maxDiscount } : {}),
        }
      : { include_provider_self: includeProviderSelf };
    let active = true;
    const timer = window.setTimeout(() => {
      getSiteModels(params)
        .then((res) => {
          if (!active || !res.data.success) return;
          const names = new Set();
          (res.data.data || []).forEach((item) => {
            const name = item?.model_name || item?.id || item?.name || item;
            if (name) names.add(String(name));
          });
          setModelOptions([...names].sort());
        })
        .catch(() => {});
    }, maxDiscount > 0 ? 250 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    createControls.include_official_channels,
    createControls.include_provider_self,
    createControls.official_key_max_discount,
    createType,
    editForm?.include_official_channels,
    editForm?.include_provider_self,
    editForm?.official_key_max_discount,
    editingToken,
    officialChannelsEnabled,
    showCreate,
  ]);

  // Group by vendor_category
  const groupedByVendor = useMemo(() => {
    const map = {};
    keyGroups.forEach((g) => {
      const cat = g.vendor_category || t('tokens.otherGroups');
      if (!map[cat]) map[cat] = [];
      map[cat].push(g);
    });
    return map;
  }, [keyGroups, t]);

  const openCreateFromGroup = (group) => {
    if (group.is_unavailable) return;
    setCreateType('normal');
    setSelectedGroupId(group.id);
	  setCreateName(group.name);
	  setCreateOfficialKeyMaxDiscount(0);
	  setCreateControls({
		...emptyControlForm(),
		subrouter_route_preference:
		  site?.subrouter_route_preference || DEFAULT_SUBROUTER_ROUTE_PREFERENCE,
		include_provider_self: fullMode ? true : site?.include_provider_self !== false,
		subrouter_providers: [],
	  });
    setCreateModelSearch('');
    setShowCreate(true);
  };

	const openCreateDefault = () => {
    setCreateType('normal');
    setSelectedGroupId(0);
    setCreateName('');
    setCreateOfficialKeyMaxDiscount(0);
	  setCreateControls({
		...emptyControlForm(),
		subrouter_route_preference:
		  site?.subrouter_route_preference || DEFAULT_SUBROUTER_ROUTE_PREFERENCE,
		include_provider_self: fullMode ? true : site?.include_provider_self !== false,
		subrouter_providers: [],
	  });
    setCreateModelSearch('');
    setShowCreate(true);
  };

  const openCreateOfficial = () => {
    setCreateType('official');
    setSelectedGroupId(0);
    setCreateName(t('tokens.officialKeyDefaultName'));
    setCreateOfficialKeyMaxDiscount(0);
    setCreateControls(emptyControlForm());
    setCreateModelSearch('');
    setShowCreate(true);
  };

  const openCreateShared = () => {
    setCreateType('shared');
    setSelectedGroupId(0);
    setCreateName(t('tokens.sharedKeyDefaultName'));
    setCreateOfficialKeyMaxDiscount(0);
    setCreateControls({
      ...emptyControlForm(),
      include_provider_self: false,
      include_official_channels: false,
      include_shared_subscriptions: true,
      subrouter_providers: [],
    });
    setCreateModelSearch('');
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setCreateType('normal');
    setSelectedGroupId(0);
    setCreateOfficialKeyMaxDiscount(0);
    setCreateControls(emptyControlForm());
    setCreateModelSearch('');
  };

  const openGroupPricing = async (group) => {
    setActivePricingGroup(group);
    setGroupPricingSearch('');
    if (groupPricingCache[group.id] || loadingGroupPricingId === group.id) {
      return;
    }
    setLoadingGroupPricingId(group.id);
    try {
      const res = await getSiteKeyGroupPricing(group.id);
      if (res.data.success) {
        setGroupPricingCache((prev) => ({
          ...prev,
          [group.id]: res.data.data || { items: [], summary: null, group },
        }));
      }
    } catch (e) { /* interceptor */ }
    setLoadingGroupPricingId(0);
  };

  const closeGroupPricing = () => {
    setActivePricingGroup(null);
    setGroupPricingSearch('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast.error(t('tokens.enterName'));
      return;
    }
    setCreating(true);
    try {
      const payload = { name: createName.trim(), type: createType };
      if (createType === 'normal' && selectedGroupId > 0) payload.key_group_id = selectedGroupId;
	  const controlPayload = buildTokenControlPayload(
		createControls,
		rate,
		t,
		createType === 'normal',
		fullMode && createType === 'normal',
	  );
      if (!controlPayload) {
        setCreating(false);
        return;
      }
		Object.assign(payload, controlPayload);
		if (fullMode && createType === 'normal') {
		  if (normalTokens.length === 0 && providerOptionsLoading) {
			toast.error(t('tokens.loadingProviders'));
			setCreating(false);
			return;
		  }
		  const selectedSlugs = new Set(parseModelLimits(createControls.subrouter_providers));
		  if (normalTokens.length === 0) {
			const selectedProviders = selectedSlugs.size > 0
			  ? providerOptions.filter((provider) => selectedSlugs.has(provider.slug))
			  : providerOptions;
			await saveMarketplaceQuickStart({
			  provider_ids: selectedProviders.map((provider) => provider.id),
			  auto_subscribe_new: Boolean(createControls.auto_subscribe_new),
			});
		  }
		}
      if (createType === 'official') {
        payload.official_key_max_discount = normalizeOfficialKeyMaxDiscount(createOfficialKeyMaxDiscount);
      } else if (createType === 'shared') {
		payload.shared_plan_id = 0;
		payload.include_provider_self = false;
		payload.include_official_channels = false;
		payload.include_shared_subscriptions = true;
      } else if (officialChannelsEnabled) {
        payload.include_official_channels = Boolean(createControls.include_official_channels);
        if (payload.include_official_channels) {
          if (!isValidOfficialRoutingMaxDiscount(createControls.official_key_max_discount)) {
            toast.error(t('tokens.invalidOfficialRoutingMaxDiscount'));
            setCreating(false);
            return;
          }
          const maxDiscount = normalizeOfficialKeyMaxDiscount(createControls.official_key_max_discount);
          if (maxDiscount > 0) payload.official_key_max_discount = maxDiscount;
        }
      }
      const res = await createToken(payload);
      if (res.data.success) {
        setCreateName('');
        setCreateControls(emptyControlForm());
        setCreateModelSearch('');
        closeCreateModal();
        const createdKey = res.data.data?.key;
        if (createdKey) setNewKey(createdKey);
        await load();
      }
    } catch (e) { /* interceptor */ }
    setCreating(false);
  };

  const handleToggle = async (token) => {
    try {
      const res = await updateToken(token.id, {
        status: token.status === 1 ? 2 : 1,
      });
      if (res.data.success) {
        toast.success(token.status === 1 ? t('tokens.tokenDisabled') : t('tokens.tokenEnabled'));
        await load();
      }
    } catch (e) { /* interceptor */ }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await deleteToken(deleteConfirm.id);
      if (res.data.success) {
        toast.success(t('tokens.tokenDeleted'));
        setDeleteConfirm(null);
        await load();
      }
    } catch (e) { /* interceptor */ }
  };

	const openEditToken = (token) => {
	  setEditingToken(token);
	  const next = tokenToEditForm(token, rate);
	  setEditForm(next);
    setEditModelSearch('');
  };

  const closeEditToken = () => {
    setEditingToken(null);
    setEditForm(null);
    setEditModelSearch('');
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingToken || !editForm) return;
    if (!String(editForm.name || '').trim()) {
      toast.error(t('tokens.enterName'));
      return;
	}
	const isOfficialToken = editingToken.type === 'official' || editingToken.group === 'dist_official';
	const isSharedToken = editingToken.type === 'shared';
	const payload = buildTokenControlPayload(
	  editForm,
	  rate,
	  t,
	  !isOfficialToken && !isSharedToken,
	  fullMode && !isOfficialToken && !isSharedToken,
	);
    if (!payload) return;
    payload.name = String(editForm.name || '').trim();
    if (isOfficialToken) {
      payload.official_key_max_discount = normalizeOfficialKeyMaxDiscount(editForm.official_key_max_discount);
	} else if (!isSharedToken && officialChannelsEnabled) {
      payload.include_official_channels = Boolean(editForm.include_official_channels);
      if (payload.include_official_channels) {
        if (!isValidOfficialRoutingMaxDiscount(editForm.official_key_max_discount)) {
          toast.error(t('tokens.invalidOfficialRoutingMaxDiscount'));
          return;
        }
        const maxDiscount = normalizeOfficialKeyMaxDiscount(editForm.official_key_max_discount);
        if (maxDiscount > 0) payload.official_key_max_discount = maxDiscount;
      }
    }
    setSavingEdit(true);
    try {
      const res = await updateToken(editingToken.id, payload);
      if (res.data.success) {
        toast.success(t('tokens.tokenUpdated'));
        closeEditToken();
        await load();
      }
    } catch (err) { /* interceptor */ }
    setSavingEdit(false);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(text);
    toast.success(t('tokens.copiedToClipboard'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const parseTags = (tagsStr) => {
    try { return JSON.parse(tagsStr || '[]'); } catch { return []; }
  };

  const handleToggleSupportedModels = async (tokenId) => {
    const isExpanded = !!expandedTokens[tokenId];
    setExpandedTokens((prev) => ({ ...prev, [tokenId]: !isExpanded }));
    if (isExpanded) return;

    setTokenModels((prev) => ({
      ...prev,
      [tokenId]: { loading: true, models: [], count: 0, provider_names: [], restricted_by_providers: false, restricted_by_models: false },
    }));

    try {
      const res = await getTokenSupportedModels(tokenId);
      if (res.data.success) {
        const data = res.data.data || {};
        setTokenModels((prev) => ({
          ...prev,
          [tokenId]: {
            loading: false,
            models: data.models || [],
            count: data.count || 0,
            provider_names: data.provider_names || [],
            restricted_by_providers: Boolean(data.restricted_by_providers),
            restricted_by_models: Boolean(data.restricted_by_models),
          },
        }));
      } else {
        setTokenModels((prev) => ({
          ...prev,
          [tokenId]: { loading: false, error: true, models: [], count: 0, provider_names: [], restricted_by_providers: false, restricted_by_models: false },
        }));
      }
    } catch (e) {
      setTokenModels((prev) => ({
        ...prev,
        [tokenId]: { loading: false, error: true, models: [], count: 0, provider_names: [], restricted_by_providers: false, restricted_by_models: false },
      }));
    }
  };

  const hasGroups = keyGroups.length > 0;
  const sharedTokens = tokens.filter((token) => token.type === 'shared');
  const normalTokens = tokens.filter((token) => token.type !== 'shared' && token.type !== 'official' && token.group !== 'dist_official');
  const officialTokens = tokens.filter((token) => token.type === 'official' || token.group === 'dist_official');
  const activeGroupPricing = activePricingGroup
    ? groupPricingCache[activePricingGroup.id] || null
    : null;
  const formatOfficialDiscount = useCallback(
    (value) => formatDiscountHint(value, t),
    [t],
  );
  const selectedCreateGroup = selectedGroupId > 0
    ? keyGroups.find((group) => group.id === selectedGroupId)
    : null;
  const createDiscountHint = formatOfficialDiscount(createOfficialKeyMaxDiscount);
  const filteredGroupPricingItems = useMemo(() => {
    const items = activeGroupPricing?.items || [];
    const keyword = groupPricingSearch.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => {
      const modelName = (item.model_name || '').toLowerCase();
      const displayName = (item.display_name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      return (
        modelName.includes(keyword) ||
        displayName.includes(keyword) ||
        category.includes(keyword)
      );
    });
  }, [activeGroupPricing, groupPricingSearch]);
  const activeTokenCount = tokens.filter((token) => token.status === 1).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="relative mb-8 overflow-hidden rounded-[28px] border border-page-divider bg-[var(--page-surface)] px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:px-8 sm:py-8">
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] lg:items-end">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-500">
              <Sparkles className="h-3.5 w-3.5" />
              {t('tokens.selectGroup')}
            </div>
            <h1 className="max-w-2xl text-3xl font-black tracking-tight text-page sm:text-4xl">
              {t('tokens.title')}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-page-secondary sm:text-base">
              {t('tokens.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-page-divider bg-[var(--page-card-bg)] px-4 py-3">
              <KeyRound className="mb-3 h-4 w-4 text-brand-500" />
              <p className="text-2xl font-black tracking-tight text-page">{tokens.length}</p>
              <p className="mt-1 text-[11px] font-semibold text-page-muted">{t('tokens.title')}</p>
            </div>
            <div className="rounded-2xl border border-page-divider bg-[var(--page-card-bg)] px-4 py-3">
              <CheckCircle2 className="mb-3 h-4 w-4 text-emerald-500" />
              <p className="text-2xl font-black tracking-tight text-page">{activeTokenCount}</p>
              <p className="mt-1 text-[11px] font-semibold text-page-muted">{t('tokens.enabled')}</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-page-divider bg-[var(--page-card-bg)] px-4 py-3 sm:col-span-1">
              <WalletCards className="mb-3 h-4 w-4 text-page-muted" />
              <p className="text-2xl font-black tracking-tight text-page">{keyGroups.length}</p>
              <p className="mt-1 text-[11px] font-semibold text-page-muted">{t('tokens.groupCount')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Section 1: Create Key with Groups ========== */}
      <div className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-500">{t('tokens.quickStart')}</p>
            <h2 className="text-xl font-bold tracking-tight text-page sm:text-2xl">{t('tokens.selectGroup')}</h2>
            <p className="mt-1 text-sm text-page-secondary">{t('tokens.selectGroupSubtitle')}</p>
          </div>
          <div className="hidden items-center gap-2 text-xs font-semibold text-page-muted sm:flex">
            <Activity className="h-4 w-4 text-emerald-500" />
            {t('tokens.defaultGroupDesc')}
          </div>
        </div>

        {/* Default (All Providers) Card */}
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={openCreateDefault}
            className="group relative flex min-h-36 items-center gap-4 overflow-hidden rounded-2xl border border-brand-500/25 bg-brand-500/[0.07] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-xl hover:shadow-brand-500/10"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
              <Plus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-page">{t('tokens.defaultGroup')}</p>
                <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-500">{t('tokens.recommended')}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-page-secondary">{t('tokens.defaultGroupDesc')}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-500">
                {t('tokens.create')} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </button>

        {officialChannelsEnabled && (
            <button
              type="button"
              onClick={openCreateOfficial}
              className="group relative flex min-h-36 items-center gap-4 overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-page">{t('tokens.officialKeyGroup')}</p>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{t('tokens.officialKeyBadge')}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-page-secondary">{t('tokens.officialKeyGroupDesc')}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {t('tokens.create')} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </button>
        )}

        {sharedSubscriptionsEnabled && (
            <button
              type="button"
              onClick={openCreateShared}
              className="group relative flex min-h-36 items-center gap-4 overflow-hidden rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.07] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500 text-white shadow-lg shadow-cyan-500/20">
                <Layers3 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-page">{t('tokens.sharedKeyGroup')}</p>
                <p className="mt-1 text-xs leading-5 text-page-secondary">{t('tokens.sharedKeyGroupDesc')}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  {t('tokens.create')} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </button>
        )}
        </div>

        {/* Vendor Category Sections */}
        {hasGroups && Object.entries(groupedByVendor).map(([vendor, groups]) => (
          <div key={vendor} className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-semibold text-page">{vendor}</h2>
              <span className="text-[11px] text-page-muted bg-page-surface px-2 py-0.5 rounded-full">
                {groups.length} {t('tokens.groupCount')}
              </span>
            </div>
            <div className="space-y-2">
              {groups.map((group) => (
                <KeyGroupCard
                  key={group.id}
                  group={group}
                  parseTags={parseTags}
                  onSelect={openCreateFromGroup}
                  onViewPricing={openGroupPricing}
                  t={t}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ========== Create Modal ========== */}
      {showCreate && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={closeCreateModal}>
          <div className="glass flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 border-b border-page-divider px-4 py-4 sm:px-6">
              <h2 className="text-lg font-semibold text-page">
                {createType === 'official'
                  ? t('tokens.createOfficialKey')
                  : createType === 'shared'
                    ? t('tokens.createSharedKey')
                    : t('tokens.createApiKey')}
              </h2>
            </div>
            <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
                {createType === 'normal' && selectedGroupId > 0 && (() => {
                  return selectedCreateGroup ? (
                    <div className="rounded-lg border border-page-divider bg-page-surface p-3">
                      <p className="text-xs text-page-muted">{t('tokens.selectedGroup')}</p>
                      <p className="break-words text-sm font-medium text-page">{selectedCreateGroup.name}</p>
                    </div>
                  ) : null;
                })()}
                {createType === 'official' && (
                  <div className="rounded-lg border border-page-divider bg-page-surface p-3">
                    <p className="text-sm font-medium text-page">{t('tokens.officialKeyGroup')}</p>
                    <p className="mt-1 break-words text-xs text-page-secondary">{t('tokens.officialKeyCreateDesc')}</p>
                  </div>
                )}
                {createType === 'shared' && (
                  <div className="rounded-lg border border-page-divider bg-page-surface p-3">
                    <p className="text-sm font-medium text-page">{t('tokens.sharedKeyGroup')}</p>
                    <p className="mt-1 break-words text-xs text-page-secondary">{t('tokens.sharedKeyCreateDesc')}</p>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-page-label">{t('tokens.name')}</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="input"
                    placeholder={t('tokens.namePlaceholder')}
                    autoFocus
                    required
                  />
                </div>
                {createType === 'official' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-page-label">{t('tokens.officialKeyMaxDiscount')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createOfficialKeyMaxDiscount}
                    onChange={(e) => setCreateOfficialKeyMaxDiscount(e.target.value)}
                    className="input"
                    placeholder={t('tokens.officialKeyMaxDiscountPlaceholder')}
                  />
                  <p className="mt-1.5 text-xs text-page-muted">
                    {createDiscountHint
                      ? t('tokens.officialKeyMaxDiscountHint', { discount: createDiscountHint })
                      : t('tokens.officialKeyMaxDiscountNoLimitHint')}
                  </p>
                </div>
                )}
                {createType === 'normal' && officialChannelsEnabled && (
                  <OfficialRoutingFields
                    form={createControls}
                    onChange={(field, value) => setCreateControls((prev) => ({ ...prev, [field]: value }))}
                    t={t}
                  />
                )}
                <TokenControlFields
                  form={createControls}
                  onChange={(field, value) => setCreateControls((prev) => ({ ...prev, [field]: value }))}
                  modelOptions={modelOptions}
                  modelSearch={createModelSearch}
                  onModelSearchChange={setCreateModelSearch}
                  canLimitModels={createType === 'normal'}
                  showSortMode={createType === 'normal'}
                  fullMode={fullMode && createType === 'normal'}
                  providerOptions={providerOptions}
                  firstToken={createType === 'normal' && normalTokens.length === 0}
                  currency={{ symbol, rate }}
                  t={t}
                />
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-page-divider bg-page-surface/40 px-4 py-4 sm:px-6">
                <button type="button" onClick={closeCreateModal} className="btn-secondary">
                  {t('tokens.cancel')}
                </button>
                <button type="submit" disabled={creating || (createType === 'normal' && fullMode && providerOptionsLoading)} className="btn-primary">
                  {creating ? t('tokens.creating') : t('tokens.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingToken && editForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={closeEditToken}>
          <div className="glass flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 border-b border-page-divider px-4 py-4 sm:px-6">
              <h2 className="text-lg font-semibold text-page">{t('tokens.editKey')}</h2>
              <p className="mt-1 break-words text-sm text-page-secondary">{editingToken.name}</p>
            </div>
            <form onSubmit={handleEditSave} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
                <div>
                  <label className="block text-sm font-medium text-page-label mb-1.5">{t('tokens.name')}</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="input"
                    placeholder={t('tokens.namePlaceholder')}
                    required
                  />
                </div>
                {(editingToken.type === 'official' || editingToken.group === 'dist_official') && (
                  <div>
                    <label className="block text-sm font-medium text-page-label mb-1.5">{t('tokens.officialKeyMaxDiscount')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.official_key_max_discount}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, official_key_max_discount: e.target.value }))}
                      className="input"
                      placeholder={t('tokens.officialKeyMaxDiscountPlaceholder')}
                    />
                  </div>
                )}
                {editingToken.type !== 'shared' && !(editingToken.type === 'official' || editingToken.group === 'dist_official') && officialChannelsEnabled && (
                  <OfficialRoutingFields
                    form={editForm}
                    onChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
                    t={t}
                  />
                )}
                <TokenControlFields
                  form={editForm}
                  onChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
                  modelOptions={modelOptions}
                  modelSearch={editModelSearch}
                  onModelSearchChange={setEditModelSearch}
                  canLimitModels={editingToken.type !== 'shared' && !(editingToken.type === 'official' || editingToken.group === 'dist_official')}
				  showSortMode={editingToken.type !== 'shared' && !(editingToken.type === 'official' || editingToken.group === 'dist_official')}
				  fullMode={fullMode && editingToken.type !== 'shared' && !(editingToken.type === 'official' || editingToken.group === 'dist_official')}
				  providerOptions={providerOptions}
                  currency={{ symbol, rate }}
                  t={t}
                />
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-page-divider bg-page-surface/40 px-4 py-4 sm:px-6">
                <button type="button" onClick={closeEditToken} className="btn-secondary">
                  {t('tokens.cancel')}
                </button>
                <button type="submit" disabled={savingEdit} className="btn-primary">
                  {savingEdit ? t('tokens.saving') : t('tokens.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <GroupPricingModal
        open={!!activePricingGroup}
        group={activePricingGroup}
        pricingData={activeGroupPricing}
        items={filteredGroupPricingItems}
        loading={loadingGroupPricingId === activePricingGroup?.id}
        search={groupPricingSearch}
        onSearchChange={setGroupPricingSearch}
        onClose={closeGroupPricing}
        currency={{ symbol, rate, code, usdRate }}
        t={t}
      />

      {newKey && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-6">
            <h2 className="mb-2 text-lg font-semibold text-page">{t('tokens.newApiKey')}</h2>
            <div className="mb-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
              <p className="text-sm text-page-warning">{t('tokens.keyWarning')}</p>
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-xl bg-page-inset p-4">
              <code className="min-w-0 flex-1 select-all break-all font-mono text-sm text-page-success">
                {newKey}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(newKey)}
                className="btn-primary !px-4 !py-1.5 flex-shrink-0"
              >
                {copiedId === newKey ? t('tokens.copied') : t('tokens.copy')}
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setNewKey(null)} className="btn-secondary">
                {t('tokens.savedKey')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Delete Confirmation Modal ========== */}
      {deleteConfirm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="glass max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-page mb-3">{t('tokens.deleteToken')}</h2>
            <p className="mb-4 break-words text-sm text-page-secondary">
              {t('tokens.deleteConfirm', { name: deleteConfirm.name })}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">{t('tokens.cancel')}</button>
              <button onClick={handleDelete} className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors">
                {t('tokens.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <TokenListSection
          title={t('tokens.myKeys')}
          tokens={normalTokens}
          allTokensEmpty={tokens.length === 0}
          copiedId={copiedId}
          expandedTokens={expandedTokens}
          tokenModels={tokenModels}
          onCopy={handleCopy}
          onDelete={setDeleteConfirm}
          onEdit={openEditToken}
          onToggle={handleToggle}
          onToggleSupportedModels={handleToggleSupportedModels}
          formatOfficialDiscount={formatOfficialDiscount}
          currency={{ symbol, rate }}
          t={t}
        />
        {officialChannelsEnabled && (
          <TokenListSection
            title={t('tokens.myOfficialKeys')}
            tokens={officialTokens}
            allTokensEmpty={tokens.length === 0}
            copiedId={copiedId}
            expandedTokens={expandedTokens}
            tokenModels={tokenModels}
            onCopy={handleCopy}
            onDelete={setDeleteConfirm}
            onEdit={openEditToken}
            onToggle={handleToggle}
            onToggleSupportedModels={handleToggleSupportedModels}
            formatOfficialDiscount={formatOfficialDiscount}
            currency={{ symbol, rate }}
            t={t}
            official
          />
        )}
        {sharedSubscriptionsEnabled && (
          <TokenListSection
            title={t('tokens.mySharedKeys')}
            tokens={sharedTokens}
            allTokensEmpty={tokens.length === 0}
            copiedId={copiedId}
            expandedTokens={expandedTokens}
            tokenModels={tokenModels}
            onCopy={handleCopy}
            onDelete={setDeleteConfirm}
            onEdit={openEditToken}
            onToggle={handleToggle}
            onToggleSupportedModels={handleToggleSupportedModels}
            formatOfficialDiscount={formatOfficialDiscount}
            currency={{ symbol, rate }}
            t={t}
            emptyText={t('tokens.noSharedKeys')}
          />
        )}
      </div>

      <div className="mt-8">
        <ConfigExporter tokens={tokens} />
      </div>

      <div className="mt-10">
        <DownloadCatalog />
      </div>
    </div>
  );
}

function TokenListSection({
  title,
  tokens,
  allTokensEmpty,
  copiedId,
  expandedTokens,
  tokenModels,
  onCopy,
  onDelete,
  onEdit,
  onToggle,
  onToggleSupportedModels,
  formatOfficialDiscount,
  currency,
  t,
  official = false,
	emptyText = '',
}) {
  const SectionIcon = official ? ShieldCheck : KeyRound;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${official ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-500/10 text-brand-500'}`}>
            <SectionIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-page">{title}</h2>
            <p className="mt-0.5 text-xs text-page-muted">{tokens.length} {t('tokens.title')}</p>
          </div>
        </div>
        {tokens.length > 0 && <span className="rounded-full border border-page-divider bg-page-surface px-2.5 py-1 text-[11px] font-semibold text-page-secondary">{tokens.length}</span>}
      </div>

      {tokens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-page-divider bg-[var(--page-surface)] px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--page-surface)] text-page-muted">
            <SectionIcon className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-page-secondary">
            {allTokensEmpty ? t('tokens.noKeys') : emptyText || (official ? t('tokens.noOfficialKeys') : t('tokens.noNormalKeys'))}
          </p>
          <p className="text-xs text-page-muted mt-1">{t('tokens.noKeysHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <div key={token.id} className="group relative overflow-hidden rounded-2xl border border-page-divider bg-[var(--page-card-bg)] p-4 transition-all hover:border-brand-500/25 hover:shadow-lg hover:shadow-brand-500/5 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${token.status === 1 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--page-surface)] text-page-muted'}`}>
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-page">{token.name}</p>
                    {official && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-page-success">
                        {t('tokens.officialKeyBadge')}
                      </span>
                    )}
                  </div>
                  {official && formatOfficialDiscount(token.official_key_max_discount) && (
                    <p className="text-xs text-page-muted mt-0.5">
                      {t('tokens.officialKeyTokenMaxDiscount', {
                        discount: formatOfficialDiscount(token.official_key_max_discount),
                      })}
                    </p>
                  )}
                  {!official && token.include_official_channels && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                        {t('tokens.includeOfficialChannelsBadge')}
                      </span>
                      {formatOfficialDiscount(token.official_key_max_discount) && (
                        <span className="text-[11px] text-page-muted">
                          {t('tokens.officialKeyTokenMaxDiscount', {
                            discount: formatOfficialDiscount(token.official_key_max_discount),
                          })}
                        </span>
                      )}
                    </div>
                  )}
                  <TokenControlSummary token={token} currency={currency} t={t} />
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-page-muted">
                    <span className={`inline-flex items-center gap-1 font-semibold ${token.status === 1 ? 'text-emerald-500' : 'text-page-muted'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${token.status === 1 ? 'bg-emerald-500' : 'bg-page-muted'}`} />
                      {token.status === 1 ? t('tokens.enabled') : t('tokens.disabled')}
                    </span>
                    {token.created_time && <span>{new Date(token.created_time * 1000).toLocaleDateString()}</span>}
                  </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:max-w-[360px] lg:justify-end">
                  <button
                    type="button"
                    onClick={() => onToggleSupportedModels(token.id)}
                    className="rounded-lg border border-page-divider px-3 py-1.5 text-xs font-semibold text-page-secondary transition-colors hover:bg-page-surface-hover"
                  >
                    {expandedTokens[token.id] ? t('tokens.hideSupportedModels') : t('tokens.viewSupportedModels')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(token)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      token.status === 1
                        ? 'border-green-500/30 text-page-success hover:bg-green-500/10'
                        : 'border-page-divider text-page-secondary hover:bg-page-surface-hover'
                    }`}
                  >
                    {token.status === 1 ? t('tokens.enabled') : t('tokens.disabled')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(token)}
                    className="rounded-lg border border-page-divider px-3 py-1.5 text-xs font-semibold text-page-secondary transition-colors hover:bg-page-surface-hover"
                  >
                    {t('tokens.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(token)}
                    className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-page-danger transition-colors hover:bg-red-500/10"
                  >
                    {t('tokens.delete')}
                  </button>
                </div>
              </div>
              {token.key && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-page-divider bg-page-inset px-3 py-2.5">
                  <code className="min-w-0 flex-1 break-all font-mono text-xs text-page-muted select-all">
                    sk-{token.key}
                  </code>
                  <button
                    type="button"
                    title={copiedId === 'sk-' + token.key ? t('tokens.copied') : t('tokens.copy')}
                    onClick={() => onCopy('sk-' + token.key)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--page-surface)] px-2.5 py-1.5 text-xs font-semibold text-page-secondary transition-colors hover:bg-page-surface-hover hover:text-page"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedId === 'sk-' + token.key ? t('tokens.copied') : t('tokens.copy')}
                  </button>
                </div>
              )}
              {expandedTokens[token.id] && (
                <div className="mt-3 rounded-xl border border-page-divider bg-page-surface/50 px-4 py-3">
                  {tokenModels[token.id]?.loading ? (
                    <div className="flex items-center gap-2 text-sm text-page-secondary">
                      <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                      <span>{t('tokens.loadingSupportedModels')}</span>
                    </div>
                  ) : tokenModels[token.id]?.error ? (
                    <p className="text-sm text-page-danger">{t('tokens.loadSupportedModelsFailed')}</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-page">
                          {t('tokens.supportedModels')} ({tokenModels[token.id]?.count || 0})
                        </p>
                        {tokenModels[token.id]?.restricted_by_models && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-brand-500/10 text-brand-500">
                            {t('tokens.restrictedByModels')}
                          </span>
                        )}
                        {tokenModels[token.id]?.restricted_by_providers && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-brand-500/10 text-brand-500">
                            {t('tokens.restrictedByProviders')}
                          </span>
                        )}
                      </div>
                      {tokenModels[token.id]?.provider_names?.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-page-muted">{t('tokens.supportedProviders')}</span>
                          {tokenModels[token.id].provider_names.map((name) => (
                            <span key={name} className="px-2 py-0.5 rounded-full text-[11px] bg-page-inset text-page-secondary">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                      {tokenModels[token.id]?.models?.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {tokenModels[token.id].models.map((modelName) => (
                            <code key={modelName} className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-page-inset text-page-secondary">
                              {modelName}
                            </code>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-page-muted">{t('tokens.noSupportedModels')}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OfficialRoutingFields({ form, onChange, t }) {
  const enabled = Boolean(form.include_official_channels);
  const discountHint = formatDiscountHint(form.official_key_max_discount, t);

  return (
    <div className="space-y-3 rounded-xl border border-page-divider bg-page-surface px-4 py-3">
      <label className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-page">
            {t('tokens.includeOfficialChannels')}
          </span>
          <span className="mt-1 block text-xs text-page-secondary">
            {t('tokens.includeOfficialChannelsDesc')}
          </span>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            const next = event.target.checked;
            onChange('include_official_channels', next);
            if (!next) onChange('official_key_max_discount', '');
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
        />
      </label>
      {enabled && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-page-label">
            {t('tokens.officialKeyMaxDiscount')}
          </label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={form.official_key_max_discount}
            onChange={(event) => onChange('official_key_max_discount', event.target.value)}
            className="input"
            placeholder={t('tokens.officialRoutingMaxDiscountPlaceholder')}
          />
          <p className="mt-1.5 text-xs text-page-muted">
            {discountHint
              ? t('tokens.officialKeyMaxDiscountHint', { discount: discountHint })
              : t('tokens.includeOfficialChannelsPriceDesc')}
          </p>
        </div>
      )}
    </div>
  );
}

function TokenControlSummary({ token, currency, t }) {
  const { symbol = '$', rate = 1 } = currency || {};
  const modelCount = parseModelLimits(token.model_limits).length;
  const quotaText = token.unlimited_quota
    ? t('tokens.unlimitedQuota')
    : t('tokens.quotaSummary', {
        amount: `${symbol}${((Number(token.remain_quota || 0) / Q) * Number(rate || 1)).toFixed(2)}`,
      });
  const expiryText = token.expired_time && token.expired_time > 0
    ? t('tokens.expireAt', { time: new Date(token.expired_time * 1000).toLocaleString() })
    : t('tokens.neverExpire');

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="px-2 py-0.5 rounded-full text-[11px] bg-page-surface text-page-secondary">
        {quotaText}
      </span>
      <span className="px-2 py-0.5 rounded-full text-[11px] bg-page-surface text-page-secondary">
        {expiryText}
      </span>
      {modelCount > 0 && (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-brand-500/10 text-brand-500">
          {t('tokens.modelLimitedCount', { count: modelCount })}
        </span>
      )}
	  {String(token.allow_ips || '').trim() && (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-page-surface text-page-secondary">
          {t('tokens.ipLimited')}
        </span>
	  )}
	  {token.subrouter_route_preference && (
		<span className="px-2 py-0.5 rounded-full text-[11px] bg-page-surface text-page-secondary">
		  {token.subrouter_route_preference}
		</span>
	  )}
	  {token.include_shared_subscriptions && (
		<span className="px-2 py-0.5 rounded-full text-[11px] bg-cyan-500/10 text-cyan-600">
		  订阅共享
		</span>
	  )}
	  {token.include_provider_self && (
		<span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-600">
		  {t('tokens.includeProviderSelfBadge')}
		</span>
	  )}
    </div>
  );
}

function TokenControlFields({
  form,
  onChange,
  modelOptions,
  modelSearch,
  onModelSearchChange,
  canLimitModels,
	showSortMode,
	fullMode = false,
	providerOptions = [],
	firstToken = false,
  currency,
  t,
}) {
  const { symbol = '$' } = currency || {};
	const selectedModels = parseModelLimits(form.model_limits);
	const selectedProviders = parseModelLimits(form.subrouter_providers);
  const filteredModels = (modelOptions || [])
    .filter((name) => !selectedModels.includes(name))
    .filter((name) => !modelSearch.trim() || name.toLowerCase().includes(modelSearch.trim().toLowerCase()))
    .slice(0, 40);

  const setExpiryRelative = (seconds) => {
    if (!seconds) {
      onChange('expired_time', '');
      return;
    }
    onChange('expired_time', timestampToDateTimeLocal(Math.ceil(Date.now() / 1000) + seconds));
  };

  const addModel = (modelName) => {
    const name = String(modelName || '').trim();
    if (!name || selectedModels.includes(name)) return;
    onChange('model_limits', [...selectedModels, name]);
    onModelSearchChange('');
  };

	const removeModel = (modelName) => {
    onChange('model_limits', selectedModels.filter((name) => name !== modelName));
	};

	const toggleProvider = (slug) => {
	  onChange(
		'subrouter_providers',
		selectedProviders.includes(slug)
		  ? selectedProviders.filter((item) => item !== slug)
		  : [...selectedProviders, slug],
	  );
	};

  return (
    <div className="space-y-4 border-t border-page-divider pt-4">
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <label className="block text-sm font-medium text-page-label mb-1.5">{t('tokens.quotaLimit')}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={form.unlimited_quota}
            value={form.quota_amount}
            onChange={(e) => onChange('quota_amount', e.target.value)}
            className="input disabled:opacity-50"
            placeholder={`${symbol} ${t('tokens.quotaPlaceholder')}`}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[1, 10, 50, 100].map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={form.unlimited_quota}
                onClick={() => onChange('quota_amount', String(amount))}
                className="px-2 py-1 text-[11px] rounded-md border border-page-divider text-page-secondary hover:bg-page-surface-hover disabled:opacity-50"
              >
                {symbol}{amount}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <label className="block text-sm font-medium text-page-label mb-1.5">{t('tokens.expireTime')}</label>
          <input
            type="datetime-local"
            value={form.expired_time}
            onChange={(e) => onChange('expired_time', e.target.value)}
            className="input"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setExpiryRelative(0)} className="px-2 py-1 text-[11px] rounded-md border border-page-divider text-page-secondary hover:bg-page-surface-hover">
              {t('tokens.neverExpire')}
            </button>
            <button type="button" onClick={() => setExpiryRelative(24 * 60 * 60)} className="px-2 py-1 text-[11px] rounded-md border border-page-divider text-page-secondary hover:bg-page-surface-hover">
              {t('tokens.oneDay')}
            </button>
            <button type="button" onClick={() => setExpiryRelative(30 * 24 * 60 * 60)} className="px-2 py-1 text-[11px] rounded-md border border-page-divider text-page-secondary hover:bg-page-surface-hover">
              {t('tokens.oneMonth')}
            </button>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between gap-4 rounded-xl border border-page-divider bg-page-surface px-3 py-2.5">
        <span className="text-sm font-medium text-page">{t('tokens.unlimitedQuota')}</span>
        <input
          type="checkbox"
          checked={!!form.unlimited_quota}
          onChange={(e) => onChange('unlimited_quota', e.target.checked)}
          className="h-4 w-4 accent-brand-500"
        />
      </label>

	  {showSortMode && (
		<div className="grid min-w-0 gap-4 md:grid-cols-2">
		  <div className="min-w-0">
		  <label className="block text-sm font-medium text-page-label mb-1.5">{t('tokens.routeSortMode')}</label>
          <select
            className="input"
            value={form.subrouter_sort_mode || 'token_price_first'}
            onChange={(e) => onChange('subrouter_sort_mode', e.target.value)}
          >
            <option value="token_price_first">{t('tokens.tokenPriceFirst')}</option>
            <option value="per_call_price_first">{t('tokens.perCallPriceFirst')}</option>
		  </select>
		  </div>
		  {fullMode && (
			<div className="min-w-0">
			  <label className="block text-sm font-medium text-page-label mb-1.5">路由偏好</label>
			  <select className="input" value={form.subrouter_route_preference} onChange={(event) => onChange('subrouter_route_preference', event.target.value)}>
				<option value={DEFAULT_SUBROUTER_ROUTE_PREFERENCE}>综合路由</option>
				<option value="first_token_first">首 Token 延迟优先</option>
				<option value="stability_first">稳定性优先</option>
				<option value="authenticity_first">真实性优先</option>
				<option value="price_first">价格优先</option>
			  </select>
			</div>
		  )}
		</div>
	  )}

	  {fullMode && (
		<>
		  <div className="min-w-0 rounded-xl border border-page-divider bg-page-surface p-4">
			<div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-page">普通商家范围</p><p className="mt-1 break-words text-xs text-page-secondary">未单独选择时使用全部本站准入商家。</p></div><span className="shrink-0 text-xs text-page-muted">{selectedProviders.length > 0 ? `${selectedProviders.length}/${providerOptions.length}` : '全部'}</span></div>
			<div className="mt-3 grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
			  {providerOptions.map((provider) => <label key={provider.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-page-divider px-3 py-2 text-sm text-page"><input type="checkbox" checked={selectedProviders.includes(provider.slug)} onChange={() => toggleProvider(provider.slug)} /> <span className="truncate">{provider.company_name}</span></label>)}
			</div>
			{firstToken && <label className="mt-3 flex items-center gap-2 text-sm text-page"><input type="checkbox" checked={Boolean(form.auto_subscribe_new)} onChange={(event) => onChange('auto_subscribe_new', event.target.checked)} />以后自动订阅本站新准入商家</label>}
		  </div>
		  <div className="min-w-0 rounded-xl border border-page-divider bg-page-surface p-4">
			<label className="flex items-start justify-between gap-4"><span className="min-w-0"><span className="block text-sm font-medium text-page">{t('tokens.includeProviderSelf')}</span><span className="mt-1 block break-words text-xs text-page-secondary">{t('tokens.includeProviderSelfDesc')}</span></span><input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={Boolean(form.include_provider_self)} onChange={(event) => onChange('include_provider_self', event.target.checked)} /></label>
		  </div>
		  <div className="min-w-0 rounded-xl border border-page-divider bg-page-surface p-4 space-y-3">
			<label className="flex items-start justify-between gap-4"><span className="min-w-0"><span className="block text-sm font-medium text-page">启用订阅共享线路</span><span className="mt-1 block break-words text-xs text-page-secondary">仅使用已订阅的共享计划。</span></span><input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={Boolean(form.include_shared_subscriptions)} onChange={(event) => onChange('include_shared_subscriptions', event.target.checked)} /></label>
			{form.include_shared_subscriptions && <div><label className="mb-1.5 block text-sm font-medium text-page-label">共享线路最高价格（基点）</label><input type="number" min="0" max="10000" step="100" className="input" value={form.shared_subscription_max_discount} onChange={(event) => onChange('shared_subscription_max_discount', event.target.value)} placeholder="0 表示不限制" /></div>}
		  </div>
		  <div className="grid min-w-0 gap-4 md:grid-cols-2">
			<label className="min-w-0"><span className="mb-1.5 block text-sm font-medium text-page-label">模型商家来源过滤</span><textarea rows={4} className="input max-w-full resize-y break-all font-mono text-xs" value={form.subrouter_model_providers} onChange={(event) => onChange('subrouter_model_providers', event.target.value)} placeholder={'{"gpt-5":["provider-slug"]}'} /></label>
			<label className="min-w-0"><span className="mb-1.5 block text-sm font-medium text-page-label">模型价格上限</span><textarea rows={4} className="input max-w-full resize-y break-all font-mono text-xs" value={form.subrouter_model_price_limits} onChange={(event) => onChange('subrouter_model_price_limits', event.target.value)} placeholder={'{"gpt-5":{"input":1,"output":5}}'} /></label>
		  </div>
		</>
	  )}

      {canLimitModels && (
        <div>
          <label className="block text-sm font-medium text-page-label mb-1.5">{t('tokens.modelLimits')}</label>
          <div className="rounded-xl border border-page-divider bg-page-surface px-3 py-2">
            {selectedModels.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selectedModels.map((modelName) => (
                  <span key={modelName} className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] text-brand-500">
                    {modelName}
                    <button type="button" onClick={() => removeModel(modelName)} className="text-brand-500 hover:text-page-danger">
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => onModelSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addModel(modelSearch);
                }
              }}
              className="w-full bg-transparent text-sm text-page outline-none"
              placeholder={t('tokens.modelSearchPlaceholder')}
            />
            {modelSearch.trim() && filteredModels.length > 0 && (
              <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-page-divider bg-page-inset">
                {filteredModels.map((modelName) => (
                  <button
                    key={modelName}
                    type="button"
                    onClick={() => addModel(modelName)}
                    className="block w-full px-3 py-2 text-left text-xs text-page-secondary hover:bg-page-surface-hover hover:text-page"
                  >
                    {modelName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="min-w-0">
        <label className="block text-sm font-medium text-page-label mb-1.5">{t('tokens.ipWhitelist')}</label>
        <textarea
          rows={3}
          value={form.allow_ips}
          onChange={(e) => onChange('allow_ips', e.target.value)}
          className="input max-w-full resize-y break-words"
          placeholder={t('tokens.ipWhitelistPlaceholder')}
        />
      </div>
    </div>
  );
}

/* ========== Key Group Card ========== */
function KeyGroupCard({ group, parseTags, onSelect, onViewPricing, t }) {
  const tags = parseTags(group.tags);
  const isUnavailable = group.is_unavailable;
  const priceDiscount = Number(group.price_discount || 1);

  return (
    <div
      className={`group glass-sm relative overflow-hidden rounded-2xl p-4 transition-all ${
        isUnavailable
          ? 'opacity-65'
          : 'cursor-pointer hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5'
      }`}
      onClick={() => !isUnavailable && onSelect(group)}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
          <Layers3 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-page">{group.name}</span>
            {group.is_recommended && (
              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                {t('tokens.recommended')}
              </span>
            )}
            {isUnavailable && (
              <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                {t('tokens.unavailable')}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {group.rmb_per_usd > 0 && <span className="text-xs font-semibold text-page">{group.rmb_per_usd} {t('tokens.rmbPerUsd')}</span>}
            {group.discount_label && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{group.discount_label}</span>}
            {priceDiscount > 0 && priceDiscount < 1 && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-500">{t('tokens.groupSettlementDiscount', { discount: priceDiscount.toFixed(2) })}</span>}
            {tags.map((tag, i) => <span key={i} className="rounded-full bg-page-surface px-2 py-0.5 text-[10px] font-medium text-page-secondary">{tag}</span>)}
          </div>
          {group.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-page-muted">{group.description}</p>}
        </div>
        <button
          type="button"
          title={t('tokens.viewGroupPricing')}
          aria-label={t('tokens.viewGroupPricing')}
          onClick={(event) => {
            event.stopPropagation();
            onViewPricing(group);
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-page-muted transition-colors hover:bg-page-surface-hover hover:text-page"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      {!isUnavailable && (
        <div className="mt-4 flex items-center justify-between border-t border-page-divider pt-3 text-xs font-bold text-brand-500">
          <span>{t('tokens.create')}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      )}
    </div>
  );
}

function GroupPricingModal({
  open,
  group,
  pricingData,
  items,
  loading,
  search,
  onSearchChange,
  onClose,
  currency,
  t,
}) {
  if (!open || !group) {
    return null;
  }

  const displayGroup = pricingData?.group || group;
  const priceDiscount = Number(displayGroup.price_discount || 1);
  const summary = pricingData?.summary;
  const hasItems = (pricingData?.items || []).length > 0;
  const regionRestricted = pricingData?.region_restricted === true;
  const { symbol, rate } = currency || {};

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass flex h-[calc(100dvh-2rem)] max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 overflow-y-auto border-b border-page-divider px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-heading font-semibold text-page">
                {displayGroup.name} · {t('tokens.groupPricingTitle')}
              </h2>
              <p className="text-sm text-page-secondary mt-1 max-w-3xl">
                {t('tokens.groupPricingSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg border border-page-divider text-page-secondary hover:bg-page-surface-hover transition-colors"
            >
              {t('tokens.cancel')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {displayGroup.discount_label && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-page-success">
                {displayGroup.discount_label}
              </span>
            )}
            {priceDiscount > 0 && priceDiscount < 1 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-500">
                {t('tokens.groupSettlementDiscount', { discount: priceDiscount.toFixed(2) })}
              </span>
            )}
            {displayGroup.rmb_per_usd > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-page-surface text-page-secondary">
                {displayGroup.rmb_per_usd} {t('tokens.rmbPerUsd')}
              </span>
            )}
            {summary && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-page-surface text-page-secondary">
                {t('tokens.groupPricingAvailableLines')}: {summary.provider_count}
              </span>
            )}
            {summary && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-page-surface text-page-secondary">
                {t('tokens.groupPricingAvailableModels')}: {summary.model_count}
              </span>
            )}
            {summary?.provider_limited && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-brand-500/10 text-brand-500">
                {t('tokens.restrictedByProviders')}
              </span>
            )}
            {summary?.model_limited && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-brand-500/10 text-brand-500">
                {t('tokens.restrictedByModels')}
              </span>
            )}
          </div>

          {displayGroup.description && (
            <p className="text-sm text-page-secondary mt-3">
              {displayGroup.description}
            </p>
          )}
        </div>

        <div className="shrink-0 border-b border-page-divider bg-page-surface/40 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-page-secondary">
              {t('tokens.groupPricingNotice')}
              {priceDiscount > 0 && priceDiscount < 1 && (
                <span className="mt-1 block text-xs text-page-muted">{t('tokens.groupDiscountCostFloor')}</span>
              )}
            </p>
            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="input lg:max-w-xs"
              placeholder={t('tokens.groupPricingSearchPlaceholder')}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-page-secondary">
              <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              <span>{t('tokens.groupPricingLoading')}</span>
            </div>
          ) : !hasItems ? (
            <div className="text-sm text-page-secondary">
              {regionRestricted
                ? t('pricing.regionRestricted')
                : t('tokens.groupPricingNoData')}
            </div>
          ) : items.length === 0 ? (
            <div className="text-sm text-page-secondary">
              {regionRestricted && search.trim()
                ? t('pricing.regionRestricted')
                : t('tokens.groupPricingNoMatch')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-page-divider">
                    <th className="text-left px-4 py-3 font-medium text-page-secondary">{t('pricing.model')}</th>
                    <th className="text-left px-4 py-3 font-medium text-page-secondary">{t('定价方式')}</th>
                    <th className="text-right px-4 py-3 font-medium text-page-secondary">{t('tokens.groupPricingReferencePrice')}</th>
                    <th className="text-right px-4 py-3 font-medium text-page-secondary">{t('pricing.outputPrice')}</th>
                    <th className="text-right px-4 py-3 font-medium text-page-secondary">{t('pricing.cacheReadPrice')}</th>
                    <th className="text-right px-4 py-3 font-medium text-page-secondary">{t('pricing.cacheCreationPrice')}</th>
                    <th className="text-center px-4 py-3 font-medium text-page-secondary">{t('tokens.groupPricingLines')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={`${item.model_name}:${item.billing_type}`} className="border-b border-page-divider last:border-0 align-top">
                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <div className="font-medium text-page">{item.display_name || item.model_name}</div>
                          {(item.display_name || item.model_name) !== item.model_name && (
                            <div className="text-xs text-page-muted font-mono mt-1">{item.model_name}</div>
                          )}
                          {item.category && (
                            <div className="text-xs text-page-muted mt-1 uppercase tracking-wide">{item.category}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-page-secondary">
                        {item.billing_type === 'per_call' ? t('pricing.perCall') : t('按量计费')}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-page-label whitespace-nowrap">
                        {item.status !== 'healthy'
                          ? t('pricing.unknown')
                          : item.billing_type === 'per_call'
                            ? formatGroupPriceRange(item.fixed_price_min, item.fixed_price_max, symbol, rate, true, t)
                            : item.billing_type === 'tiered_expr'
                              ? formatGroupTieredPrice(item, currency, t)
                              : formatGroupPriceRange(item.input_price_min, item.input_price_max, symbol, rate, false, t)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-page-label whitespace-nowrap">
                        {item.status !== 'healthy'
                          ? '-'
                          : item.billing_type === 'per_call' || item.billing_type === 'tiered_expr'
                            ? '-'
                            : formatGroupPriceRange(item.output_price_min, item.output_price_max, symbol, rate, false, t)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-page-label whitespace-nowrap">
                        {item.status !== 'healthy'
                          ? '-'
                          : item.billing_type === 'per_call' || item.billing_type === 'tiered_expr'
                            ? '-'
                            : formatGroupPriceRange(item.cache_read_price_min, item.cache_read_price_max, symbol, rate, false, t)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-page-label whitespace-nowrap">
                        {item.status !== 'healthy'
                          ? '-'
                          : item.billing_type === 'per_call' || item.billing_type === 'tiered_expr'
                            ? '-'
                            : formatGroupCachePriceRange(item, symbol, rate, t)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-page-surface text-page-secondary">
                          {formatRouteCount(item.route_count, item.has_range, t)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatGroupTieredPrice(item, currency, t) {
  const rows = formatPricingDetailRows(item, currency, t);
  if (rows.length === 0) {
    return t('pricing.expressionPricing');
  }
  return (
    <div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
      {rows.map((row) => (
        <span key={`${row.label}-${row.price}`}>{row.label} {row.formatted}</span>
      ))}
    </div>
  );
}

function formatGroupPriceRange(min, max, symbol, rate, perCall, t) {
  if (min == null && max == null) {
    return '-';
  }
  const low = Number(min ?? max ?? 0);
  const high = Number(max ?? min ?? 0);
  const factor = perCall ? rate : rate * 1000;
  const suffix = perCall ? `/${t('pricing.perCallUnit')}` : '';
  const lowText = `${symbol}${(low * factor).toFixed(4)}`;
  const highText = `${symbol}${(high * factor).toFixed(4)}`;
  if (Math.abs(low - high) <= 1e-9) {
    return `${lowText}${suffix}`;
  }
  return `${lowText} - ${highText}${suffix}`;
}

function formatGroupCachePriceRange(item, symbol, rate, t) {
  const base = formatGroupPriceRange(
    item.cache_creation_price_min,
    item.cache_creation_price_max,
    symbol,
    rate,
    false,
    t,
  );
  if (
    item.cache_creation_price_1h_min == null &&
    item.cache_creation_price_1h_max == null
  ) {
    return base;
  }
  const baseMin = Number(item.cache_creation_price_min ?? 0);
  const baseMax = Number(item.cache_creation_price_max ?? 0);
  const oneHourMin = Number(item.cache_creation_price_1h_min ?? 0);
  const oneHourMax = Number(item.cache_creation_price_1h_max ?? 0);
  if (
    Math.abs(baseMin - oneHourMin) <= 1e-9 &&
    Math.abs(baseMax - oneHourMax) <= 1e-9
  ) {
    return base;
  }
  const oneHour = formatGroupPriceRange(
    item.cache_creation_price_1h_min,
    item.cache_creation_price_1h_max,
    symbol,
    rate,
    false,
    t,
  );
  return `${t('pricing.cacheCreation5m')} ${base} / ${t('pricing.cacheCreation1h')} ${oneHour}`;
}

function formatRouteCount(routeCount, hasRange, t) {
  if (!routeCount) {
    return t('pricing.unknown');
  }
  if (routeCount === 1) {
    return `1 ${t('tokens.groupPricingLineUnitSingle')}`;
  }
  if (!hasRange) {
    return `${routeCount} ${t('tokens.groupPricingLineUnit')} · ${t('tokens.groupPricingSamePrice')}`;
  }
  return `${routeCount} ${t('tokens.groupPricingLineUnit')}`;
}
