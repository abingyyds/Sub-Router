import { useTranslation } from 'react-i18next';
import { DIST_SITE_LANGUAGES, normalizeAppLanguage } from '../i18n/languageUtils';
import { updateUserLanguage } from '../api';
import { useAuth } from '../context/AuthContext';

export default function LanguageSwitch({ className = '' }) {
  const { i18n, t } = useTranslation();
  const { user, updateUser } = useAuth();
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);

  const handleLanguageChange = async (event) => {
    const language = normalizeAppLanguage(event.target.value);
    await i18n.changeLanguage(language);
    if (!user) return;
    try {
      const response = await updateUserLanguage(language);
      if (response.data?.success) {
        updateUser({ language });
      }
    } catch {
      // The local language switch remains active even if persistence fails.
    }
  };

  return (
    <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${className}`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9Z" />
      </svg>
      <select
        value={currentLanguage}
        onChange={handleLanguageChange}
        className="bg-transparent text-current outline-none"
        aria-label={t('common.changeLanguage')}
      >
        {DIST_SITE_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
