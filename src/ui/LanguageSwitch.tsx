import { setLanguage, useLanguage, useT, type Language } from '../i18n';
import './LanguageSwitch.css';

/**
 * Flagi jako emoji, nie obrazki: skalują się z tekstem i działają w obu
 * motywach. Wielka Brytania dla `en`, bo flaga jest czytelniejsza niż "EN".
 */
const FLAGS: Record<Language, string> = {
  en: '🇬🇧',
  pl: '🇵🇱',
};

/**
 * Przełącznik języka: jeden przycisk z flagą AKTYWNEGO języka, klik
 * przełącza na drugi. Przy dwóch językach lista ani segment nie mają sensu.
 * Wybór zostaje w localStorage.
 */
export function LanguageSwitch() {
  const language = useLanguage();
  const t = useT();
  const next: Language = language === 'pl' ? 'en' : 'pl';

  return (
    <button
      type="button"
      className="lang-switch icon-control"
      onClick={() => setLanguage(next)}
      aria-label={t('lang.switch')}
      title={t('lang.switch')}
    >
      <span aria-hidden="true">{FLAGS[language]}</span>
    </button>
  );
}
