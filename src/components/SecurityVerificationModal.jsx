import React, { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { getDist2FAStatus } from '../api';

export default function SecurityVerificationModal({ open, loading, onClose, onVerify, onOpenSettings }) {
  const { t } = useTranslation();
  const [statusLoading, setStatusLoading] = useState(false);
  const [hasTwoFactor, setHasTwoFactor] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!open) {
      setCode('');
      return;
    }

    let active = true;
    setStatusLoading(true);
    getDist2FAStatus({ skipErrorHandler: true })
      .then((res) => {
        if (active) setHasTwoFactor(res.data?.success === true && res.data?.data?.enabled === true);
      })
      .catch((error) => {
        if (active) toast.error(error.response?.data?.message || t('security.statusFailed'));
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, t]);

  if (!open) return null;

  const submit = () => {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      toast.error(t('security.enterCodeOrBackup'));
      return;
    }
    onVerify(normalizedCode);
  };

  return (
    <div className="modal-overlay fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => !loading && onClose()}>
      <div className="glass max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="break-words text-lg font-semibold text-page">{t('security.verificationTitle')}</h3>
              <p className="mt-1 break-words text-sm text-page-secondary">{t('security.withdrawDescription')}</p>
            </div>
          </div>
          <button type="button" disabled={loading} className="text-page-muted hover:text-page disabled:opacity-50" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {statusLoading ? (
          <div className="flex justify-center py-10">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-page-divider border-t-brand-500" />
          </div>
        ) : hasTwoFactor ? (
          <>
            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-medium text-page-label">{t('security.authenticatorCode')}</span>
              <input
                type="text"
                autoFocus
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(event) => setCode(event.target.value.trim())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !loading) submit();
                }}
                placeholder={t('security.codeOrBackupPlaceholder')}
                className="input"
              />
            </label>
            <p className="mt-2 text-xs text-page-muted">{t('security.authenticatorHint')}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" disabled={loading} className="btn-secondary px-4 py-2" onClick={onClose}>
                {t('tokens.cancel')}
              </button>
              <button type="button" disabled={loading || !code.trim()} className="btn-primary px-4 py-2" onClick={submit}>
                {loading ? t('topup.processing') : t('security.verify')}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="font-medium text-page">{t('security.noMethodTitle')}</p>
            <p className="mt-1 text-sm text-page-secondary">{t('security.noMethodDescription')}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button type="button" className="btn-secondary px-4 py-2" onClick={onClose}>
                {t('tokens.cancel')}
              </button>
              <button type="button" className="btn-primary px-4 py-2" onClick={onOpenSettings}>
                {t('security.openSettings')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
