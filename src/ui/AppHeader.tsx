import { Link, useNavigate } from 'react-router';
import { clearProfile } from '../api/profile';
import { clearTokens } from '../auth/tokenStore';
import { useT } from '../i18n';
import { clearSelection } from '../sources/selection';
import { GitHubLink } from './GitHubLink';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useProfile } from './useProfile';
import './AppHeader.css';

/**
 * Wspólny pasek na KAŻDYM ekranie (56 px, cała szerokość): logo z nazwą
 * po lewej jako jedyny `h1`, po prawej język, motyw i link do GitHuba.
 * Po zalogowaniu przed tą trójką stoją jeszcze konto, ustawienia
 * i wylogowanie. Logo prowadzi do filtra, nie na `/`, bo start
 * przekierowuje do synchronizacji i każde kliknięcie odpalałoby pobieranie;
 * przed zalogowaniem wraca na ekran logowania.
 */
export function AppHeader({ signedIn }: { signedIn: boolean }) {
  const t = useT();

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <h1 className="topbar__title">
          <Link className="topbar__brand" to={signedIn ? '/filter' : '/'}>
            <Logo size={28} />
            <span className="topbar__name">{t('app.name')}</span>
          </Link>
        </h1>

        <nav className="topbar__nav" aria-label={t('nav.label')}>
          {signedIn ? <AccountControls /> : null}
          <LanguageSwitch />
          <ThemeToggle />
          <GitHubLink />
        </nav>
      </div>
    </header>
  );
}

/** Konto, ustawienia i wylogowanie: tylko po zalogowaniu, na lewo od wspólnej trójki. */
function AccountControls() {
  const t = useT();
  const navigate = useNavigate();
  const profile = useProfile();
  const userName = profile ? (profile.displayName ?? profile.id) : null;

  async function signOut() {
    await clearTokens();
    clearProfile();
    clearSelection();
    navigate('/', { replace: true });
  }

  return (
    <>
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
      <Link className="topbar__link" to="/settings">
        {t('settings.title')}
      </Link>
      <button type="button" className="topbar__link topbar__button" onClick={signOut}>
        {t('settings.signOut')}
      </button>
    </>
  );
}
