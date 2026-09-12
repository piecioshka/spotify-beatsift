import { useLocation, useNavigate } from 'react-router';
import { useT } from '../i18n';
import { GitHubLink, REPOSITORY_URL } from '../ui/GitHubLink';
import { LanguageSwitch } from '../ui/LanguageSwitch';
import { usePageTitle } from '../ui/usePageTitle';
import './PrivacyScreen.css';

const SPOTIFY_APPS_URL = 'https://www.spotify.com/account/apps/';

/**
 * Jedno miejsce, gdzie stoi napisane, co aplikacja zapisuje, komu wysyła
 * i jak to usunąć. Dostępna bez logowania, bo pasek zgody linkuje tu
 * jeszcze przed pierwszym zapisem.
 */
export function PrivacyScreen() {
  const t = useT();
  usePageTitle(t('privacy.title'));
  const navigate = useNavigate();
  const location = useLocation();

  // Wejście prosto z adresu nie ma dokąd wracać, więc idziemy na start.
  function back() {
    if (location.key === 'default') navigate('/');
    else navigate(-1);
  }

  return (
    <main className="page privacy">
      <div className="privacy__top">
        <button type="button" className="privacy__back" onClick={back}>
          ← {t('privacy.back')}
        </button>
        <div className="privacy__tools">
          <LanguageSwitch />
          <GitHubLink size={22} />
        </div>
      </div>

      <h1 className="page__title">{t('privacy.title')}</h1>
      <p className="privacy__intro">{t('privacy.intro')}</p>

      <section className="privacy__section">
        <h2 className="privacy__heading">{t('privacy.stored.title')}</h2>
        <ul className="privacy__list">
          <li>{t('privacy.stored.tokens')}</li>
          <li>{t('privacy.stored.library')}</li>
          <li>{t('privacy.stored.prefs')}</li>
        </ul>
      </section>

      <section className="privacy__section">
        <h2 className="privacy__heading">{t('privacy.sent.title')}</h2>
        <ul className="privacy__list">
          <li>{t('privacy.sent.spotify')}</li>
          <li>{t('privacy.sent.deezer')}</li>
          <li>{t('privacy.sent.reccobeats')}</li>
          <li>{t('privacy.sent.embed')}</li>
          <li>{t('privacy.sent.hosting')}</li>
        </ul>
      </section>

      <section className="privacy__section">
        <h2 className="privacy__heading">{t('privacy.cookies.title')}</h2>
        <p className="privacy__text">{t('privacy.cookies.body')}</p>
      </section>

      <section className="privacy__section">
        <h2 className="privacy__heading">{t('privacy.delete.title')}</h2>
        <ul className="privacy__list">
          <li>{t('privacy.delete.signOut')}</li>
          <li>{t('privacy.delete.reset')}</li>
          <li>{t('privacy.delete.reject')}</li>
          <li>
            {t('privacy.delete.revoke')}{' '}
            <a href={SPOTIFY_APPS_URL} target="_blank" rel="noreferrer">
              spotify.com/account/apps
            </a>
          </li>
        </ul>
      </section>

      <section className="privacy__section">
        <h2 className="privacy__heading">{t('privacy.contact.title')}</h2>
        <p className="privacy__text">
          {t('privacy.contact.body')}{' '}
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
            github.com/piecioshka/spotify-beatsift
          </a>
        </p>
      </section>
    </main>
  );
}
