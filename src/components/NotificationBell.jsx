import React, { useMemo, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSite } from '../context/SiteContext';

export default function NotificationBell() {
  const { t } = useTranslation();
  const { site } = useSite();
  const [open, setOpen] = useState(false);

  const notifications = useMemo(() => {
    if (!Array.isArray(site?.notifications)) return [];
    return site.notifications
      .filter((item) => item?.content)
      .slice(0, 20);
  }, [site?.notifications]);

  if (notifications.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500 text-white shadow-2xl shadow-brand-500/30 transition hover:scale-105 hover:bg-brand-600 hover:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-400"
        aria-label={t('notifications.open')}
      >
        <Bell size={22} />
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-[var(--page-bg)]">
          {notifications.length > 9 ? '9+' : notifications.length}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 px-4 py-6 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-page-card-border bg-[var(--page-bg)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-page-card-border bg-page-surface px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/15 text-page-link">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-page">{t('notifications.title')}</h2>
                  <p className="text-xs text-page-muted">{t('notifications.subtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-page-muted transition hover:bg-page-surface-hover hover:text-page"
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-3 overflow-y-auto p-5">
              {notifications.map((item, index) => (
                <div key={`${item.publish_date || 'notice'}-${index}`} className="rounded-2xl border border-page-card-border bg-page-surface p-4">
                  <div className="mb-2 inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-page-link">
                    {item.publish_date || t('notifications.notice')}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-page-secondary">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
