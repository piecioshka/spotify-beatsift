import { Link, useNavigate } from 'react-router';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { acceptConsent, rejectConsent, useConsent } from './consent';
import './ConsentBanner.css';

/**
 * Pasek na dole ekranu, dopóki użytkownik nie zdecyduje. Nie jest modalem:
 * nie przechwytuje fokusa i nie zasłania strony, a decyzję da się podjąć
 * z klawiatury. Odmowa czyści dane i wraca na ekran logowania.
 */
export function ConsentBanner() {
  const t = useT();
  const consent = useConsent();
  const navigate = useNavigate();

  if (consent !== null) return null;

  async function reject() {
    await rejectConsent();
    navigate('/', { replace: true });
  }

  return (
    <section className="consent" role="region" aria-label={t('consent.title')}>
      <div className="consent__inner">
        <div className="consent__text">
          <h2 className="consent__title">{t('consent.title')}</h2>
          <p className="consent__body text-muted text-small">
            {t('consent.body')} <Link to="/privacy">{t('consent.more')}</Link>
          </p>
        </div>
        <div className="consent__actions">
          <Button label={t('consent.accept')} onClick={acceptConsent} />
          <Button label={t('consent.reject')} onClick={reject} variant="secondary" />
        </div>
      </div>
    </section>
  );
}
