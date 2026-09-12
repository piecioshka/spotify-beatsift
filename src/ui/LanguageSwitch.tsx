import { LANGUAGES, setLanguage, useLanguage, useT } from '../i18n';
import './LanguageSwitch.css';

/** Dwa przyciski PL / EN. Wybrany jest wciśnięty, wybór zostaje w localStorage. */
export function LanguageSwitch() {
  const language = useLanguage();
  const t = useT();

  return (
    <div className="lang" role="group" aria-label={t('lang.label')}>
      {LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          className={`lang__button${option === language ? ' lang__button--active' : ''}`}
          aria-pressed={option === language}
          onClick={() => setLanguage(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
