import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { createToken, Q } from '../api';
import CreatedKeyResultModal from './CreatedKeyResultModal';

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

const emptyForm = () => ({
  name: '',
  unlimited_quota: true,
  quota_amount: '',
  expired_time: '',
  allow_ips: '',
});

const displayAmountToQuota = (amount, rate) => {
  const n = Number(amount || 0);
  const r = Number(rate || 1) || 1;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round((n / r) * Q);
};

export default function OfficialChannelKeyCreateModal({
  open,
  channel,
  currency = {},
  onClose,
}) {
  const { t } = useTranslation();
  const { symbol = '$', rate = 1 } = currency;
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm(),
      name: t('officialChannels.groupKeyName', {
        channel: channel?.name || t('officialChannels.badge'),
      }),
    });
    setCreatedKey('');
  }, [open, channel?.official_channel_id, channel?.id, channel?.name, t]);

  if (!open || !channel) return null;

  if (createdKey) {
    return <CreatedKeyResultModal createdKey={createdKey} onClose={onClose} />;
  }

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const setExpiryRelative = (seconds) => {
    updateField(
      'expired_time',
      seconds ? timestampToDateTimeLocal(Math.ceil(Date.now() / 1000) + seconds) : '',
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!String(form.name || '').trim()) {
      toast.error(t('tokens.enterName'));
      return;
    }
    const expiredTime = parseDateTimeLocal(form.expired_time);
    if (expiredTime === null) {
      toast.error(t('tokens.invalidExpireTime'));
      return;
    }
    setCreating(true);
    try {
      const response = await createToken({
        name: String(form.name).trim(),
        type: 'official',
        official_channel_id: Number(channel.official_channel_id || channel.id || 0),
        expired_time: expiredTime,
        unlimited_quota: Boolean(form.unlimited_quota),
        remain_quota: form.unlimited_quota ? 0 : displayAmountToQuota(form.quota_amount, rate),
        allow_ips: String(form.allow_ips || '').trim(),
      });
      if (response.data?.success) {
        setCreatedKey(response.data.data?.key || '');
        toast.success(t('tokens.createSuccess'));
      }
    } catch (error) {
      // The shared API interceptor displays the server error.
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={creating ? undefined : onClose}
    >
      <div
        className="glass flex h-[calc(100dvh-2rem)] max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-page-divider px-6 py-5">
          <h2 className="break-words text-lg font-semibold text-page">
            {t('officialChannels.createGroupKeyForChannel', { channel: channel.name })}
          </h2>
          <p className="mt-1 break-words text-sm text-page-secondary">
            {t('officialChannels.createGroupKeyForChannelDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="rounded-xl border border-page-divider bg-page-surface px-4 py-3">
              <div className="text-xs text-page-muted">{t('officialChannels.selectedChannel')}</div>
              <div className="mt-1 break-words text-sm font-semibold text-page">{channel.name}</div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-page-label">{t('tokens.name')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className="input"
                  placeholder={t('tokens.namePlaceholder')}
                  autoFocus
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-page-label">{t('tokens.quotaLimit')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={form.unlimited_quota}
                    value={form.quota_amount}
                    onChange={(event) => updateField('quota_amount', event.target.value)}
                    className="input disabled:opacity-50"
                    placeholder={`${symbol} ${t('tokens.quotaPlaceholder')}`}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[1, 10, 50, 100, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        disabled={form.unlimited_quota}
                        onClick={() => updateField('quota_amount', String(amount))}
                        className="rounded-md border border-page-divider px-2 py-1 text-[11px] text-page-secondary hover:bg-page-surface-hover disabled:opacity-50"
                      >
                        {symbol}{amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-page-label">{t('tokens.expireTime')}</label>
                  <input
                    type="datetime-local"
                    value={form.expired_time}
                    onChange={(event) => updateField('expired_time', event.target.value)}
                    className="input"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setExpiryRelative(0)} className="rounded-md border border-page-divider px-2 py-1 text-[11px] text-page-secondary hover:bg-page-surface-hover">{t('tokens.neverExpire')}</button>
                    <button type="button" onClick={() => setExpiryRelative(60 * 60)} className="rounded-md border border-page-divider px-2 py-1 text-[11px] text-page-secondary hover:bg-page-surface-hover">{t('tokens.oneHour')}</button>
                    <button type="button" onClick={() => setExpiryRelative(24 * 60 * 60)} className="rounded-md border border-page-divider px-2 py-1 text-[11px] text-page-secondary hover:bg-page-surface-hover">{t('tokens.oneDay')}</button>
                    <button type="button" onClick={() => setExpiryRelative(30 * 24 * 60 * 60)} className="rounded-md border border-page-divider px-2 py-1 text-[11px] text-page-secondary hover:bg-page-surface-hover">{t('tokens.oneMonth')}</button>
                  </div>
                </div>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-page-divider bg-page-surface px-3 py-2.5">
                <span className="text-sm font-medium text-page">{t('tokens.unlimitedQuota')}</span>
                <input
                  type="checkbox"
                  checked={!!form.unlimited_quota}
                  onChange={(event) => updateField('unlimited_quota', event.target.checked)}
                  className="h-4 w-4 accent-brand-500"
                />
              </label>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-page-label">{t('tokens.ipWhitelist')}</label>
                <textarea
                  rows={3}
                  value={form.allow_ips}
                  onChange={(event) => updateField('allow_ips', event.target.value)}
                  className="input resize-y"
                  placeholder={t('tokens.ipWhitelistPlaceholder')}
                />
              </div>
            </div>

          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-page-divider bg-page-surface/40 px-4 py-4 sm:px-6">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={creating}>
                {t('tokens.cancel')}
              </button>
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? t('tokens.creating') : t('tokens.create')}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}
