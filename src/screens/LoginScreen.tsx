import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { startSignIn } from '../auth/spotifyAuth';
import { loadTokens } from '../auth/tokenStore';
import { isConfigured } from '../config';
import { useConsent } from '../consent/consent';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { GitHubLink } from '../ui/GitHubLink';
import { LanguageSwitch } from '../ui/LanguageSwitch';
import { Logo } from '../ui/Logo';
import { usePageTitle } from '../ui/usePageTitle';
import './LoginScreen.css';

export function LoginScreen() {
  usePageTitle(null);
  const t = useT();
  const consent = useConsent();
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kto ma już zapisane tokeny, ten nie ogląda ekranu logowania.
  useEffect(() => {
    let active = true;
    loadTokens()
      .then((tokens) => {
        if (!active) return;
        if (tokens) navigate('/sync', { replace: true });
        else setCheckingSession(false);
      })
      .catch(() => active && setCheckingSession(false));
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    try {
      // Przekierowuje całą kartę do Spotify, więc `busy` gaśnie dopiero
      // razem ze stroną. Wracamy już pod adres /callback.
      await startSignIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (checkingSession) return null;

  return (
    <div className="page login">
      <div className="login__lang">
        <LanguageSwitch />
        <GitHubLink size={22} />
      </div>

      <div className="login__hero">
        <div className="login__logo">
          <Logo size={72} />
        </div>
        <h1 className="login__title">{t('app.name')}</h1>
        <p className="login__subtitle text-muted">{t('login.subtitle')}</p>
      </div>

      {isConfigured ? (
        <>
          <Button
            label={t('login.button')}
            onClick={handleSignIn}
            busy={busy}
            disabled={consent !== 'accepted'}
          />
          {consent === 'rejected' ? (
            <p className="text-muted text-small text-center">{t('consent.required')}</p>
          ) : null}
          {error ? <p className="text-danger text-center">{error}</p> : null}
        </>
      ) : (
        <Card title={t('login.missingClientId.title')}>
          <p className="text-muted text-small">{t('login.missingClientId.body')}</p>
        </Card>
      )}
    </div>
  );
}
