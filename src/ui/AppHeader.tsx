import { Link, useNavigate } from 'react-router';
import { clearProfile } from '../api/profile';
import { clearTokens } from '../auth/tokenStore';
import { useT } from '../i18n';
import { GitHubLink } from './GitHubLink';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';
import { useProfile } from './useProfile';
import './AppHeader.css';

/**
 * Pasek na ekranach po zalogowaniu: logo z nazwą po lewej, po prawej język,
 * zalogowane konto, ustawienia i wylogowanie. Logo prowadzi do filtra, nie
 * na `/`, bo start przekierowuje do synchronizacji i każde kliknięcie
 * odpalałoby pobieranie.
 */
export function AppHeader() {
  const t = useT();
  const navigate = useNavigate();
  const profile = useProfile();
  const userName = profile ? (profile.displayName ?? profile.id) : null;

  async function signOut() {
    await clearTokens();
    clearProfile();
    navigate('/', { replace: true });
  }

  return (
    <header className="topbar">
      <Link className="topbar__brand" to="/filter">
        <Logo size={28} />
        <span className="topbar__name">{t('app.name')}</span>
      </Link>

      <nav className="topbar__nav" aria-label={t('nav.label')}>
        {userName ? (
          <a
            className="topbar__user"
            href={profile?.url ?? undefined}
            target="_blank"
            rel="noreferrer"
            title={t('nav.signedInAs', { name: userName })}
            aria-label={t('nav.signedInAs', { name: userName })}
          >
            {userName}
          </a>
        ) : null}
        <LanguageSwitch />
        <Link className="topbar__link" to="/settings">
          {t('settings.title')}
        </Link>
        <button type="button" className="topbar__link topbar__button" onClick={signOut}>
          {t('settings.signOut')}
        </button>
        <GitHubLink />
      </nav>
    </header>
  );
}
