import { useCallback, useEffect, useRef, useState } from 'react';
import { trackUri } from '../api/playlists';
import type { TrackRow } from '../db/types';
import { isTrackEnded } from './queue';
import { createController, loadSpotifyIframeApi, type EmbedController } from './spotifyIframeApi';

export type EmbedPlayer = {
  /**
   * Utwór w odtwarzaczu, null gdy odtwarzacz jest schowany. Nazwa celowo
   * nie brzmi `current`: lint Reacta bierze obiekt z takim polem za ref.
   */
  track: TrackRow | null;
  paused: boolean;
  error: string | null;
  /** Element, w którym ma stanąć iframe. Podpiąć pod kontener w pasku odtwarzacza. */
  attachHost: (element: HTMLDivElement | null) => void;
  /** Gra wskazany utwór; ten sam utwór drugi raz to pauza albo wznowienie. */
  play: (track: TrackRow) => void;
  stop: () => void;
};

type Options = {
  /** Wołane, gdy utwór dojdzie do końca. Filtr podstawia tu następny z listy. */
  onEnded?: (finished: TrackRow) => void;
};

/**
 * Jeden odtwarzacz na ekran. Kontroler Spotify powstaje przy pierwszym
 * utworze i zostaje do zamknięcia paska; kolejne utwory idą przez `loadUri`,
 * bo tworzenie iframe'u od nowa trwa kilka sekund.
 */
export function useEmbedPlayer({ onEnded }: Options = {}): EmbedPlayer {
  const [current, setCurrent] = useState<TrackRow | null>(null);
  const [paused, setPaused] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<EmbedController | null>(null);
  const hostElementRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<TrackRow | null>(null);
  const onEndedRef = useRef(onEnded);
  /** Koniec utworu zgłaszamy raz, choć embed powtarza ostatnią aktualizację. */
  const endedForRef = useRef<string | null>(null);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const attachHost = useCallback((element: HTMLDivElement | null) => {
    hostElementRef.current = element;
  }, []);

  const ensureController = useCallback(async (uri: string): Promise<EmbedController | null> => {
    if (controllerRef.current) return controllerRef.current;
    const host = hostElementRef.current;
    if (!host) return null;

    // Spotify podmienia wskazany element na iframe, więc oddajemy mu własny
    // węzeł zamiast tego, który renderuje React.
    const target = document.createElement('div');
    host.replaceChildren(target);

    const api = await loadSpotifyIframeApi();
    const controller = await createController(api, target, { uri, width: '100%', height: 80 });

    controller.addListener('playback_update', ({ data }) => {
      const playing = currentRef.current;
      // Tuż po `loadUri` embed potrafi jeszcze przysłać ostatnią aktualizację
      // poprzedniego utworu (pozycja równa długości). Bez porównania URI
      // wyglądałaby jak natychmiastowy koniec nowego utworu i kolejka
      // przeskakiwałaby o dwa utwory naraz. Zmierzone na żywo.
      if (!playing || data.playingURI !== trackUri(playing.id)) return;

      setPaused(data.isPaused);
      if (!isTrackEnded(data)) return;
      if (endedForRef.current === playing.id) return;
      endedForRef.current = playing.id;
      onEndedRef.current?.(playing);
    });

    controllerRef.current = controller;
    return controller;
  }, []);

  const play = useCallback((track: TrackRow) => {
    setError(null);

    if (currentRef.current?.id === track.id && controllerRef.current) {
      controllerRef.current.togglePlay();
      return;
    }

    currentRef.current = track;
    endedForRef.current = null;
    setCurrent(track);
    setPaused(false);
  }, []);

  // Kontener paska pojawia się dopiero po ustawieniu `current`, więc kontroler
  // tworzymy w efekcie, a nie w obsłudze kliknięcia.
  useEffect(() => {
    if (!current) return;
    let active = true;
    const uri = trackUri(current.id);

    ensureController(uri)
      .then((controller) => {
        if (!active || !controller) return;
        controller.loadUri(uri);
        // Przeglądarka może odmówić autoodtwarzania; wtedy zostaje
        // przycisk w samym embedzie, a stan wyrówna `playback_update`.
        controller.play();
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      active = false;
    };
  }, [current, ensureController]);

  const stop = useCallback(() => {
    controllerRef.current?.destroy();
    controllerRef.current = null;
    currentRef.current = null;
    endedForRef.current = null;
    setCurrent(null);
    setPaused(true);
  }, []);

  // Zamknięcie ekranu sprząta iframe Spotify.
  useEffect(() => () => controllerRef.current?.destroy(), []);

  return { track: current, paused, error, attachHost, play, stop };
}
