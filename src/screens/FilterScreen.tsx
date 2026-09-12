import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { createPlaylistWithTracks, defaultPlaylistName } from '../api/playlists';
import { SpotifyAuthError } from '../api/spotifyClient';
import { BPM_MAX, BPM_MIN, YEAR_MAX, YEAR_MIN } from '../config';
import { findTracks, libraryStats } from '../db/queries';
import type { LibraryStats, TrackFilter, TrackRow as Track } from '../db/types';
import { useT } from '../i18n';
import { PlayerBar } from '../player/PlayerBar';
import { nextTrack } from '../player/queue';
import { useEmbedPlayer } from '../player/useEmbedPlayer';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { tracksCount } from '../ui/plural';
import {
  loadCompact,
  loadRanges,
  loadSortKey,
  saveCompact,
  saveRanges,
  saveSortKey,
} from '../ui/preferences';
import { RangeSlider, type Range } from '../ui/RangeSlider';
import { isSortKey, SORT_KEYS, sortTracks, type SortKey } from '../ui/sorting';
import { TrackRow } from '../ui/TrackRow';
import { useDebounced } from '../ui/useDebounced';
import { usePageTitle } from '../ui/usePageTitle';
import './FilterScreen.css';

type Exported = { added: number; url: string };

export function FilterScreen() {
  const t = useT();
  usePageTitle(t('filter.title'));
  const navigate = useNavigate();

  // Zakresy i preferencje widoku czytamy raz przy starcie, zapis idzie
  // w obsłudze zdarzeń albo (dla suwaków) po uspokojeniu się filtra.
  const [initialRanges] = useState(loadRanges);
  const [bpm, setBpm] = useState<Range>(initialRanges.bpm);
  const [years, setYears] = useState<Range>(initialRanges.years);
  const [sortKey, setSortKey] = useState<SortKey>(loadSortKey);
  const [compact, setCompact] = useState(loadCompact);

  // Wyniki trzymamy razem z filtrem, dla którego powstały. Dzięki temu
  // „trwa wyszukiwanie” jest wyliczane, a nie ustawiane w efekcie.
  const [snapshot, setSnapshot] = useState<{ filter: TrackFilter | null; rows: Track[] }>({
    filter: null,
    rows: [],
  });
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<Exported | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [stats, setStats] = useState<LibraryStats | null>(null);

  // Przeciąganie suwaka zmienia stan kilkadziesiąt razy na sekundę,
  // a do bazy chcemy iść dopiero po tym, jak ruch się zatrzyma.
  const filter = useDebounced<TrackFilter>(
    useMemo(
      () => ({ bpmMin: bpm.low, bpmMax: bpm.high, yearMin: years.low, yearMax: years.high }),
      [bpm.high, bpm.low, years.high, years.low],
    ),
  );

  useEffect(() => {
    libraryStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

    findTracks(filter)
      .then((rows) => active && setSnapshot({ filter, rows }))
      .catch(() => active && setSnapshot({ filter, rows: [] }));

    // Zakresy zapisujemy dopiero po uspokojeniu suwaka, razem z zapytaniem.
    saveRanges({
      bpm: { low: filter.bpmMin, high: filter.bpmMax },
      years: { low: filter.yearMin, high: filter.yearMax },
    });

    return () => {
      active = false;
    };
  }, [filter]);

  // Ta kolejność idzie też do playlisty i do odtwarzacza.
  const results = useMemo(() => sortTracks(snapshot.rows, sortKey), [snapshot.rows, sortKey]);
  const loading = snapshot.filter !== filter;

  function changeSort(value: string) {
    if (!isSortKey(value)) return;
    setSortKey(value);
    saveSortKey(value);
  }

  function changeCompact(value: boolean) {
    setCompact(value);
    saveCompact(value);
  }

  // Po końcu utworu odtwarzacz przechodzi do następnego z bieżącej listy.
  const player = useEmbedPlayer({
    onEnded: (finished) => {
      const next = nextTrack(results, finished.id);
      if (next) player.play(next);
    },
  });

  const handleExport = useCallback(async () => {
    if (results.length === 0 || loading) return;
    setExporting(true);
    setExported(null);
    setExportError(null);

    try {
      const playlist = await createPlaylistWithTracks(
        defaultPlaylistName(filter),
        results.map((track) => track.id),
      );
      setExported({ added: playlist.added, url: playlist.url });
    } catch (error) {
      if (error instanceof SpotifyAuthError) {
        navigate('/', { replace: true });
        return;
      }
      setExportError(error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  }, [filter, loading, navigate, results]);

  return (
    <div className="page filter">
      <div className="filter__controls">
        <RangeSlider
          label={t('filter.tempo')}
          unit="BPM"
          min={BPM_MIN}
          max={BPM_MAX}
          value={bpm}
          onChange={setBpm}
        />
        <RangeSlider
          label={t('filter.year')}
          min={YEAR_MIN}
          max={YEAR_MAX}
          value={years}
          onChange={setYears}
        />

        <div className="filter__summary">
          <span className="filter__count" aria-live="polite">
            {loading ? t('filter.searching') : tracksCount(results.length)}
          </span>
        </div>

        <div className="filter__options">
          <label className="filter__option">
            <span className="text-muted text-small">{t('filter.sort')}</span>
            <select
              className="filter__select"
              value={sortKey}
              onChange={(event) => changeSort(event.target.value)}
            >
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`sort.${key}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="filter__option">
            <input
              type="checkbox"
              className="filter__check"
              checked={compact}
              onChange={(event) => changeCompact(event.target.checked)}
            />
            <span className="text-small">{t('filter.compact')}</span>
          </label>
        </div>

        {results.length > 0 ? (
          <Button
            label={t('filter.export', { n: results.length })}
            onClick={handleExport}
            busy={exporting}
            disabled={loading}
          />
        ) : null}

        {exported ? (
          <Card title={t('filter.exported.title')}>
            <p className="text-muted">
              {t('filter.exported.added', { count: tracksCount(exported.added) })}
            </p>
            <p>
              <a href={exported.url} target="_blank" rel="noreferrer">
                {t('filter.exported.open')}
              </a>
            </p>
          </Card>
        ) : null}

        {exportError ? (
          <Card title={t('filter.exportFailed')}>
            <p className="text-danger">{exportError}</p>
          </Card>
        ) : null}
      </div>

      {results.length > 0 ? (
        <ul className={`filter__list${compact ? ' filter__list--compact' : ''}`}>
          {results.map((track) => (
            <li key={track.id}>
              <TrackRow
                track={track}
                compact={compact}
                playing={player.track?.id === track.id}
                paused={player.paused}
                onPlay={player.play}
              />
            </li>
          ))}
        </ul>
      ) : loading ? null : (
        <EmptyState title={t('filter.empty.title')} body={emptyHint(stats, t)} />
      )}

      <PlayerBar player={player} />
    </div>
  );
}

/**
 * Przy zerowym wyniku najbardziej pomaga informacja, czy w bibliotece
 * w ogóle jest co filtrować. Brak BPM u większości utworów znaczy,
 * że synchronizacja nie doszła do końca, a nie że filtr jest za wąski.
 */
function emptyHint(stats: LibraryStats | null, t: ReturnType<typeof useT>): string {
  if (!stats || stats.total === 0) return t('filter.empty.noLibrary');
  if (stats.withBpm === 0) return t('filter.empty.noBpm');

  return t('filter.empty.hint', {
    withBpm: stats.withBpm,
    total: stats.total,
    withoutBpm: stats.total - stats.withBpm,
    withoutYear: stats.total - stats.withYear,
  });
}
