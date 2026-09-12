import type { PlaybackUpdate } from './spotifyIframeApi';

/**
 * Czysta logika odtwarzacza: co grać po bieżącym utworze i kiedy uznać,
 * że utwór się skończył. Bez DOM-u, więc ma testy.
 */

/** Następny utwór z listy wyników po bieżącym, albo null na końcu listy. */
export function nextTrack<T extends { id: string }>(list: T[], currentId: string): T | null {
  const index = list.findIndex((track) => track.id === currentId);
  if (index === -1 || index + 1 >= list.length) return null;
  return list[index + 1];
}

/**
 * Ile milisekund przed końcem uznajemy utwór za odtworzony. Aktualizacje
 * przychodzą co około sekundę, a ostatnia ma pozycję równą długości.
 */
const END_TOLERANCE_MS = 200;

/**
 * Koniec utworu poznajemy po pozycji, nie po pauzie. Zmierzone na żywo:
 * embed po dojściu do końca zgłasza `position === duration` z `isPaused`
 * nadal równym false i nigdy nie wysyła osobnej pauzy. Pozycja zero
 * po `loadUri` i pauza w środku utworu nie łapią się na ten warunek.
 */
export function isTrackEnded(update: PlaybackUpdate): boolean {
  if (update.isBuffering || update.duration <= 0) return false;
  return update.position >= update.duration - END_TOLERANCE_MS;
}
