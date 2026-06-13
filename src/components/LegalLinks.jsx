import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function LegalAgreementCheckbox({ id, checked, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-2 rounded-xl border border-page-divider bg-page-surface/40 p-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-page-divider accent-current"
      />
      <label htmlFor={id} className="text-xs leading-relaxed text-page-secondary">
        {t('legal.agreePrefix')}
        <Link
          to="/user-agreement"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-1 font-medium text-page-link hover:underline"
        >
          {t('legal.userAgreement')}
        </Link>
        {t('legal.agreeJoin')}
        <Link
          to="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-1 font-medium text-page-link hover:underline"
        >
          {t('legal.privacyPolicy')}
        </Link>
      </label>
    </div>
  );
}

export function FooterLegalLinks({ className = '', linkClassName = '' }) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <span>{t('legal.footerNotice')}</span>
      <span className="opacity-40">·</span>
      <Link to="/user-agreement" className={linkClassName}>
        {t('legal.userAgreement')}
      </Link>
      <span className="opacity-40">/</span>
      <Link to="/privacy-policy" className={linkClassName}>
        {t('legal.privacyPolicy')}
      </Link>
    </div>
  );
}
