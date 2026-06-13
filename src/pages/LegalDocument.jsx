import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSite } from '../context/SiteContext';

const sectionsByType = {
  agreement: [
    'account',
    'service',
    'usage',
    'billing',
    'availability',
    'termination',
    'changes',
  ],
  privacy: [
    'collection',
    'use',
    'storage',
    'sharing',
    'security',
    'rights',
    'cookies',
    'changes',
  ],
};

export default function LegalDocument({ type }) {
  const { t } = useTranslation();
  const { site } = useSite();
  const siteName = site?.name || t('legal.thisSite');
  const sections = sectionsByType[type] || sectionsByType.agreement;
  const title = type === 'privacy' ? t('legal.privacyPolicy') : t('legal.userAgreement');

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <Link to="/register" className="text-sm font-medium text-page-link hover:underline">
          {t('legal.backToRegister')}
        </Link>
        <h1 className="mt-4 text-3xl font-heading font-bold text-page">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-page-secondary">
          {t(`legal.${type}.intro`, { siteName })}
        </p>
        <p className="mt-2 text-xs text-page-muted">
          {t('legal.effectiveDate')}
        </p>
      </div>

      <div className="glass rounded-2xl p-6 md:p-8">
        <div className="space-y-7">
          {sections.map((sectionKey) => (
            <section key={sectionKey}>
              <h2 className="text-base font-semibold text-page">
                {t(`legal.${type}.sections.${sectionKey}.title`)}
              </h2>
              <p className="mt-2 text-sm leading-7 text-page-secondary">
                {t(`legal.${type}.sections.${sectionKey}.body`, { siteName })}
              </p>
            </section>
          ))}
        </div>
      </div>

      <div className="mt-6 text-sm text-page-secondary">
        {site?.contact_email ? (
          <a href={`mailto:${site.contact_email}`} className="font-medium text-page-link hover:underline">
            {t('legal.contactWithEmail', { email: site.contact_email })}
          </a>
        ) : (
          <span>{t('legal.contactSiteOwner')}</span>
        )}
      </div>
    </div>
  );
}
