import type { TrackRow as Track } from '../db/types';
import { useT } from '../i18n';
import './TrackRow.css';

const SOURCE_LABEL = { deezer: 'Deezer', reccobeats: 'ReccoBeats' } as const;

type Props = {
  track: Track;
  /** Czy ten utwór siedzi w odtwarzaczu; `paused` mówi, czy stoi. */
  playing?: boolean;
  paused?: boolean;
  onPlay?: (track: Track) => void;
  /** Zwarty widok: jeden wiersz na utwór, mniejsze odstępy. */
  compact?: boolean;
};

export function TrackRow({
  track,
  playing = false,
  paused = true,
  onPlay,
  compact = false,
}: Props) {
  const t = useT();

  // Oba źródła bywają rozbieżne, więc pokazujemy, skąd wzięła się liczba.
  const source = track.bpm_source ? SOURCE_LABEL[track.bpm_source] : null;

  // Gdy źródła podały różne lata, pod spodem pokazujemy to odrzucone.
  const otherYear = [track.release_year_spotify, track.release_year_deezer].find(
    (year) => typeof year === 'number' && year !== track.release_year,
  );

  const showPause = playing && !paused;

  return (
    <div className={`track${playing ? ' track--playing' : ''}${compact ? ' track--compact' : ''}`}>
      {onPlay ? (
        <button
          type="button"
          className="track__play"
          onClick={() => onPlay(track)}
          aria-label={`${showPause ? t('track.pause') : t('track.play')}: ${track.name}, ${track.artists}`}
          aria-pressed={playing}
        >
          <span aria-hidden="true">{showPause ? '❚❚' : '▶'}</span>
        </button>
      ) : null}

      <span className="track__text">
        <span className="track__name">{track.name}</span>
        <span className="track__artists text-muted">{track.artists}</span>
        <span className="track__meta text-muted">
          {track.release_year ?? t('track.unknownYear')}
          {otherYear ? ` · ${t('track.otherYear', { year: otherYear })}` : ''}
          {' · '}
          <a
            className="track__link"
            href={`https://open.spotify.com/track/${track.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Spotify ↗
          </a>
        </span>
      </span>

      <span className="track__badge">
        <span className="track__bpm tabular">{track.bpm_rounded ?? '–'}</span>
        <span className="track__source text-muted">{source ?? t('track.noSource')}</span>
      </span>
    </div>
  );
}
