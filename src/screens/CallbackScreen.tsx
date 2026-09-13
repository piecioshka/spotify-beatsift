import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { completeSignIn } from '../auth/spotifyAuth';
import { useT } from '../i18n';
import { afterLoginRoute } from '../sources/route';
import { Card } from '../ui/Card';
import { usePageTitle } from '../ui/usePageTitle';

/**
 * Adres, na który Spotify odsyła po ekranie zgody. Dokańcza logowanie
 * i od razu przechodzi dalej (wybór źródeł albo synchronizacja); sam z siebie nic nie pokazuje,
 * chyba że coś poszło nie tak.
 */
export function CallbackScreen() {
  const t = useT();
  usePageTitle(t('callback.title'));
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Verifier pasuje do jednego logowania, więc drugi przebieg efektu
  // (tryb Strict w developmencie) nie może wymieniać kodu ponownie.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    completeSignIn(new URLSearchParams(window.location.search)).then((result) => {
      if (result.ok) {
        navigate(afterLoginRoute(), { replace: true });
      } else if (result.reason === 'cancelled') {
        navigate('/', { replace: true });
      } else {
        setError(result.message ?? t('login.failed'));
      }
    });
  }, [navigate, t]);

  if (!error) return null;

  return (
    <main className="page">
      <Card title={t('callback.failedTitle')}>
        <p className="text-muted">{error}</p>
        <p>
          <Link to="/">{t('callback.back')}</Link>
        </p>
      </Card>
    </main>
  );
}
