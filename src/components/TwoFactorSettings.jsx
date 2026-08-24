import React, { useCallback, useEffect, useState } from 'react';
import { Copy, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  disableDist2FA,
  enableDist2FA,
  getDist2FAStatus,
  setupDist2FA,
} from '../api';

const initialStatus = {
  enabled: false,
  locked: false,
  backup_codes_remaining: 0,
};

export default function TwoFactorSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [setupCode, setSetupCode] = useState('');
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDist2FAStatus({ skipErrorHandler: true });
      if (res.data?.success) {
        setStatus({ ...initialStatus, ...res.data.data });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('security.statusFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('security.copied'));
    } catch {
      toast.error(t('security.copyFailed'));
    }
  };

  const startSetup = async () => {
    setActionLoading(true);
    try {
      const res = await setupDist2FA({ skipErrorHandler: true });
      if (!res.data?.success) {
        throw new Error(res.data?.message || t('security.setupFailed'));
      }
      setSetupData(res.data.data);
      setSetupCode('');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || t('security.setupFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const enableTwoFactor = async () => {
    if (!/^\d{6}$/.test(setupCode.trim())) {
      toast.error(t('security.enterSixDigitCode'));
      return;
    }
    setActionLoading(true);
    try {
      const res = await enableDist2FA(setupCode.trim(), { skipErrorHandler: true });
      if (!res.data?.success) {
        throw new Error(res.data?.message || t('security.enableFailed'));
      }
      toast.success(t('security.enableSuccess'));
      setSetupData(null);
      setSetupCode('');
      await loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || t('security.enableFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!disableCode.trim()) {
      toast.error(t('security.enterCodeOrBackup'));
      return;
    }
    setActionLoading(true);
    try {
      const res = await disableDist2FA(disableCode.trim(), { skipErrorHandler: true });
      if (!res.data?.success) {
        throw new Error(res.data?.message || t('security.disableFailed'));
      }
      toast.success(t('security.disableSuccess'));
      setDisableOpen(false);
      setDisableCode('');
      await loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || t('security.disableFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <section id="security" className="glass scroll-mt-24 rounded-2xl p-6 mt-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-page-surface text-page-link">
              {status.enabled ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-page">{t('security.twoFactorTitle')}</h2>
                {!loading && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.enabled ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                    {status.enabled ? t('security.enabled') : t('security.disabled')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-page-secondary">{t('security.twoFactorDescription')}</p>
              {status.enabled && (
                <p className="mt-2 text-xs text-page-muted">
                  {t('security.backupRemaining', { count: status.backup_codes_remaining || 0 })}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={loading || actionLoading}
            onClick={status.enabled ? () => setDisableOpen(true) : startSetup}
            className={status.enabled ? 'btn-secondary shrink-0 px-4 py-2' : 'btn-primary shrink-0 px-4 py-2'}
          >
            {actionLoading ? t('topup.processing') : status.enabled ? t('security.disable') : t('security.enable')}
          </button>
        </div>
      </section>

      {setupData && (
        <div className="modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => !actionLoading && setSetupData(null)}>
          <div className="glass max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="break-words text-lg font-semibold text-page">{t('security.setupTitle')}</h3>
                <p className="mt-1 break-words text-sm text-page-secondary">{t('security.setupDescription')}</p>
              </div>
              <button type="button" className="text-page-muted hover:text-page" onClick={() => !actionLoading && setSetupData(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex justify-center">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG value={setupData.qr_code_data} size={180} />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-page-divider bg-page-surface p-4">
              <p className="text-xs text-page-muted">{t('security.manualSecret')}</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-sm text-page">{setupData.secret}</code>
                <button type="button" className="btn-secondary p-2" onClick={() => copyText(setupData.secret)}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-medium text-page">{t('security.backupCodes')}</p>
              <p className="mt-1 text-xs text-page-secondary">{t('security.backupWarning')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(setupData.backup_codes || []).map((code) => (
                  <code key={code} className="rounded-lg bg-page-surface px-3 py-2 text-center text-sm text-page">{code}</code>
                ))}
              </div>
              <button type="button" className="btn-secondary mt-3 inline-flex items-center gap-2 px-3 py-2" onClick={() => copyText((setupData.backup_codes || []).join('\n'))}>
                <Copy className="h-4 w-4" />
                {t('security.copyBackupCodes')}
              </button>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-page-label">{t('security.authenticatorCode')}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={setupCode}
                onChange={(event) => setSetupCode(event.target.value.replace(/\D/g, ''))}
                placeholder={t('security.sixDigitPlaceholder')}
                className="input"
              />
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" className="btn-secondary px-4 py-2" disabled={actionLoading} onClick={() => setSetupData(null)}>
                {t('tokens.cancel')}
              </button>
              <button type="button" className="btn-primary px-4 py-2" disabled={actionLoading || setupCode.length !== 6} onClick={enableTwoFactor}>
                {actionLoading ? t('topup.processing') : t('security.confirmEnable')}
              </button>
            </div>
          </div>
        </div>
      )}

      {disableOpen && (
        <div className="modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => !actionLoading && setDisableOpen(false)}>
          <div className="glass max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-page">{t('security.disableTitle')}</h3>
            <p className="mt-2 text-sm text-page-secondary">{t('security.disableWarning')}</p>
            <input
              type="text"
              autoComplete="one-time-code"
              maxLength={8}
              value={disableCode}
              onChange={(event) => setDisableCode(event.target.value.trim())}
              placeholder={t('security.codeOrBackupPlaceholder')}
              className="input mt-5"
            />
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" className="btn-secondary px-4 py-2" disabled={actionLoading} onClick={() => setDisableOpen(false)}>
                {t('tokens.cancel')}
              </button>
              <button type="button" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50" disabled={actionLoading || !disableCode} onClick={disableTwoFactor}>
                {actionLoading ? t('topup.processing') : t('security.confirmDisable')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
