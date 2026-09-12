import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { syncLikedTracks } from '../api/likedTracks';
import { SpotifyAuthError } from '../api/spotifyClient';
import { enrichBpm } from '../bpm/enrichQueue';
import { libraryStats } from '../db/queries';
import { getSyncState, SYNC_KEYS } from '../db/schema';
import type { LibraryStats } from '../db/types';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { Card, CardRow } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { usePageTitle } from '../ui/usePageTitle';

type Phase = 'tracks' | 'bpm' | 'done' | 'error';

export function SyncScreen() {
  const t = useT();
  usePageTitle(t('sync.title'));
  const navigate = useNavigate();

  // `?full=1` z ekranu ustawień wymusza przejście całej biblioteki,
  // bo tylko wtedy widać utwory wypisane z ulubionych.
  const [params] = useSearchParams();
  const isFull = params.get('full') === '1';

  // Ekran startuje od razu w trakcie pobierania, bo efekt odpala
  // synchronizację przy wejściu.
  const [phase, setPhase] = useState<Phase>('tracks');
  const [tracks, setTracks] = useState({ saved: 0, total: 0 });
  const [bpm, setBpm] = useState({ processed: 0, resolved: 0, queued: 0 });
  const [removed, setRemoved] = useState(0);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wyjście z ekranu w trakcie pobierania ma zatrzymać kolejne strony.
  const cancelRef = useRef({ cancelled: false });

  const run = useCallback(async () => {
    const signal = { cancelled: false };
    cancelRef.current = signal;

    try {
      const since = await getSyncState(SYNC_KEYS.lastAddedAt);
      const result = await syncLikedTracks({
        since,
        full: isFull,
        signal,
        onProgress: setTracks,
      });
      if (signal.cancelled) return;
      setRemoved(result.removed);
      setTracks({ saved: result.saved, total: result.total });

      // Etap drugi: tempo dla utworów, których jeszcze nie sprawdzaliśmy.
      const beforeEnrich = await libraryStats();
      setStats(beforeEnrich);
      setBpm({ processed: 0, resolved: 0, queued: beforeEnrich.pending });

      if (beforeEnrich.pending > 0) {
        setPhase('bpm');
        await enrichBpm({
          signal,
          onProgress: (progress) => setBpm((previous) => ({ ...previous, ...progress })),
        });
      }

      if (signal.cancelled) return;
      setStats(await libraryStats());
      setPhase('done');
    } catch (err) {
      if (signal.cancelled) return;
      if (err instanceof SpotifyAuthError) {
        navigate('/', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }, [isFull, navigate]);

  /** Ręczne ponowienie po błędzie. */
  const retry = useCallback(() => {
    setPhase('tracks');
    setError(null);
    setTracks({ saved: 0, total: 0 });
    run();
  }, [run]);

  useEffect(() => {
    // Lint widzi w `run` wywołania setState i uznaje je za synchroniczne,
    // ale pierwsze z nich pada dopiero po `await getSyncState`, czyli już
    // poza bieżącym renderem. Efekt tylko startuje pracę w tle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
    const signal = cancelRef.current;
    return () => {
      signal.cancelled = true;
    };
  }, [run]);

  return (
    <div className="page">
      <h1 className="page__title">{t('sync.title')}</h1>

      <ProgressBar
        label={t('sync.tracks.label')}
        current={tracks.saved}
        total={tracks.total}
        note={phase === 'tracks' ? t('sync.tracks.note') : undefined}
      />

      {bpm.queued > 0 ? (
        <ProgressBar
          label={t('sync.bpm.label')}
          current={bpm.processed}
          total={bpm.queued}
          note={phase === 'bpm' ? t('sync.bpm.note') : undefined}
        />
      ) : null}

      {stats ? (
        <Card>
          <CardRow label={t('sync.stats.total')} value={stats.total} />
          <CardRow label={t('sync.stats.withBpm')} value={stats.withBpm} />
          <CardRow label={t('sync.stats.withYear')} value={stats.withYear} />
          {removed > 0 ? <CardRow label={t('sync.stats.removed')} value={removed} /> : null}
          {stats.total > stats.withBpm ? (
            <p className="text-muted text-small">
              {t('sync.stats.withoutBpm', { n: stats.total - stats.withBpm })}
            </p>
          ) : null}
        </Card>
      ) : null}

      {phase === 'error' ? (
        <Card title={t('sync.error.title')}>
          <p className="text-danger">{error}</p>
          <Button label={t('sync.retry')} onClick={retry} variant="secondary" />
        </Card>
      ) : null}

      {phase === 'done' ? (
        <Button
          label={t('sync.goToFilter')}
          onClick={() => navigate('/filter', { replace: true })}
        />
      ) : null}
    </div>
  );
}
