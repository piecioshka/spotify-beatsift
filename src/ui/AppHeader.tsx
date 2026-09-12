import { Link, useNavigate } from 'react-router';
import { clearTokens } from '../auth/tokenStore';
import { useT } from '../i18n';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';
import './AppHeader.css';

/**
 * Pasek na ekranach po zalogowaniu: logo z nazwą po lewej, po prawej język,
 * ustawienia i wylogowanie. Logo prowadzi do filtra, nie na `/`, bo start
 * przekierowuje do synchronizacji i każde kliknięcie odpalałoby pobieranie.
 */
export function AppHeader() {
  const t = useT();
  const navigate = useNavigate();

  async function signOut() {
    await clearTokens();
    navigate('/', { replace: true });
  }

  return (
    <header className="topbar">
      <Link className="topbar__brand" to="/filter">
        <Logo size={28} />
        <span className="topbar__name">{t('app.name')}</span>
      </Link>

      <nav className="topbar__nav" aria-label={t('nav.label')}>
        <LanguageSwitch />
        <Link className="topbar__link" to="/settings">
          {t('settings.title')}
        </Link>
        <button type="button" className="topbar__link topbar__button" onClick={signOut}>
          {t('settings.signOut')}
        </button>
      </nav>
    </header>
  );
}
