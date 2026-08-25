import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Languages, LoaderCircle } from 'lucide-react';
import { DIST_SITE_LANGUAGES, normalizeAppLanguage } from '../i18n/languageUtils';
import { updateUserLanguage } from '../api';
import { useAuth } from '../context/AuthContext';

const languageFlags = {
  en: '🇬🇧',
  zh: '🇨🇳',
  'zh-TW': '🇹🇼',
  es: '🇪🇸',
  'pt-BR': '🇧🇷',
  fr: '🇫🇷',
  de: '🇩🇪',
  ar: '🇸🇦',
  ja: '🇯🇵',
  id: '🇮🇩',
  ru: '🇷🇺',
  ko: '🇰🇷',
  vi: '🇻🇳',
  tr: '🇹🇷',
};

const LanguageFlag = ({ code }) => {
  if (code === 'zh-TW') {
    return (
      <span
        className="inline-flex h-4 w-5 shrink-0 items-center justify-center rounded-sm bg-red-600 text-[8px] font-bold leading-none text-white shadow-sm"
        aria-hidden="true"
      >
        TW
      </span>
    );
  }

  return (
    <span className="inline-flex w-5 shrink-0 justify-center text-base leading-none" aria-hidden="true">
      {languageFlags[code]}
    </span>
  );
};

export default function LanguageSwitch({ className = '' }) {
  const { i18n, t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef(null);
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
  const currentLanguageOption =
    DIST_SITE_LANGUAGES.find((language) => language.code === currentLanguage) ||
    DIST_SITE_LANGUAGES[0];
  const isRtl = currentLanguage === 'ar';

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleLanguageChange = async (language) => {
    const normalizedLanguage = normalizeAppLanguage(language);
    setOpen(false);
    if (normalizedLanguage === currentLanguage) return;

    setSaving(true);
    try {
      await i18n.changeLanguage(normalizedLanguage);
      if (user) {
        const response = await updateUserLanguage(normalizedLanguage);
        if (response.data?.success) updateUser({ language: normalizedLanguage });
      }
    } catch (error) {
      // Keep the local language change even when preference persistence fails.
      console.warn('Unable to persist distributor site language preference', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`inline-flex h-9 max-w-[12rem] items-center gap-1.5 rounded-lg border border-current/10 bg-current/[0.04] px-2.5 text-xs font-semibold shadow-sm transition-[background-color,box-shadow,transform] hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 ${className}`}
        aria-label={t('common.changeLanguage')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        disabled={saving}
      >
        {saving ? (
          <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <LanguageFlag code={currentLanguage} />
        <span className="hidden truncate whitespace-nowrap sm:inline">
          {currentLanguageOption.label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('common.changeLanguage')}
          className={`absolute top-[calc(100%+0.5rem)] z-[60] w-[calc(100vw-2rem)] max-w-[23rem] overflow-hidden rounded-lg border border-[rgb(var(--page-text)/0.1)] bg-[var(--page-select-panel-bg)] p-1.5 text-page shadow-xl shadow-black/10 backdrop-blur-xl ${isRtl ? 'left-0 text-right' : 'right-0 text-left'}`}
        >
          <div className="px-2.5 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] opacity-55">
            {t('common.changeLanguage')}
          </div>
          <div className="grid max-h-[min(24rem,calc(100vh-7rem))] grid-cols-1 overflow-y-auto sm:grid-cols-2">
            {DIST_SITE_LANGUAGES.map((language) => {
              const isActive = language.code === currentLanguage;
              return (
                <button
                  key={language.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  className={`flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30 ${isRtl ? 'text-right' : 'text-left'} ${isActive ? 'bg-[rgb(var(--page-text)/0.08)]' : 'hover:bg-[rgb(var(--page-text)/0.05)]'}`}
                  onClick={() => handleLanguageChange(language.code)}
                >
                  <LanguageFlag code={language.code} />
                  <span className="min-w-0 flex-1 whitespace-nowrap">{language.label}</span>
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
