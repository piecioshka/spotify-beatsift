/**
 * Bramka „czekaj na sieć” dla długich zadań w tle. Kolejka BPM sprawdza ją
 * przed każdą porcją, więc zerwane połączenie nie zasypuje konsoli błędami
 * ani nie oznacza utworów jako sprawdzonych bez odpowiedzi; praca rusza
 * dalej, gdy przeglądarka znów widzi sieć.
 */

export type OnlineDeps = {
  isOnline: () => boolean;
  sleep: (ms: number) => Promise<void>;
};

/** Co ile pytamy przeglądarkę o stan sieci, gdy jej nie ma. */
export const ONLINE_POLL_MS = 1000;

const defaultDeps: OnlineDeps = {
  isOnline,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Stan sieci wg przeglądarki. `onLine === true` nie gwarantuje internetu
 * (tylko interfejs sieciowy), ale `false` jest pewne, więc tyle wystarczy,
 * żeby nie strzelać zapytaniami w pustkę. Poza przeglądarką (Node ma
 * `navigator` bez `onLine`) zakładamy, że sieć jest.
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

/** Wraca od razu przy sieci, inaczej czeka na jej powrót albo na anulowanie. */
export async function waitForOnline(
  signal?: { cancelled: boolean },
  deps: OnlineDeps = defaultDeps,
): Promise<void> {
  while (!deps.isOnline() && !signal?.cancelled) {
    await deps.sleep(ONLINE_POLL_MS);
  }
}
