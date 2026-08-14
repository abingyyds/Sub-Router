import { useTranslation } from 'react-i18next';
import { ChevronDown, Languages } from 'lucide-react';
import { DIST_SITE_LANGUAGES, normalizeAppLanguage } from '../i18n/languageUtils';
import { updateUserLanguage } from '../api';
import { useAuth } from '../context/AuthContext';

export default function LanguageSwitch({ className = '' }) {
  const { i18n, t } = useTranslation();
  const { user, updateUser } = useAuth();
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
  const currentLanguageLabel =
    DIST_SITE_LANGUAGES.find((language) => language.code === currentLanguage)?.label ||
    currentLanguage;

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
    <label
      className={`relative inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors focus-within:ring-2 focus-within:ring-current/20 ${className}`}
    >
      <Languages className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden whitespace-nowrap sm:inline">{currentLanguageLabel}</span>
      <ChevronDown className="hidden h-3 w-3 shrink-0 opacity-60 sm:block" />
      <select
        value={currentLanguage}
        onChange={handleLanguageChange}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
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
