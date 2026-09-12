import { useEffect } from 'react';
import { useT } from '../i18n';
import type { EmbedPlayer } from './useEmbedPlayer';
import './PlayerBar.css';

/**
 * Klasa na `<html>`, dopóki pasek jest widoczny. CSS ustawia po niej
 * `scroll-padding-bottom`, żeby przewijanie do elementu (fokus z klawiatury,
 * `scrollIntoView`) nie chowało go pod przyklejonym paskiem.
 */
const HTML_CLASS = 'has-player';

/**
 * Pasek przyklejony do dołu ekranu z osadzonym odtwarzaczem Spotify.
 * Sam iframe wstawia skrypt Spotify do kontenera `attachHost`; React
 * nie dotyka jego zawartości.
 */
export function PlayerBar({ player }: { player: EmbedPlayer }) {
  const t = useT();
  // Destrukturyzacja, bo lint Reacta bierze cały obiekt, z którego
  // pochodzi wartość dla `ref`, za ref i blokuje odczyt reszty pól.
  const { track, paused, error, attachHost, stop } = player;
  const visible = track !== null;

  useEffect(() => {
    document.documentElement.classList.toggle(HTML_CLASS, visible);
    return () => document.documentElement.classList.remove(HTML_CLASS);
  }, [visible]);

  if (!track) return null;

  return (
    <aside className="player" aria-label={t('player.label')}>
      <div className="player__inner">
        <div className="player__head">
          <span className="player__now text-muted text-small">
            {paused ? t('player.paused') : t('player.playing')}: {track.name}
          </span>
          <button
            type="button"
            className="player__close"
            onClick={stop}
            aria-label={t('player.close')}
          >
            ×
          </button>
        </div>
        {error ? <p className="text-danger text-small">{error}</p> : null}
        <div className="player__embed" ref={attachHost} />
      </div>
    </aside>
  );
}
