import { parseReleaseYear } from '../db/releaseYear';
import { jsonp } from './jsonp';
import { t } from '../i18n';

const DEEZER_API = 'https://api.deezer.com';

/**
 * Limit publicznego API Deezera to około 50 zapytań na 5 sekund z jednego IP.
 * Trzymamy się wyraźnie poniżej, bo za przekroczenie dostaje się błąd 4
 * i cisza na kilka sekund.
 */
export const DEEZER_RATE = { requests: 40, perMs: 5000, concurrency: 4 };

/**
 * Pobiera JSON spod adresu. Domyślnie JSONP, bo Deezer nie wspiera CORS;
 * testy podstawiają tu zwykłą funkcję zwracającą gotowy obiekt.
 */
export type JsonGetter = (url: string) => Promise<unknown>;

export type DeezerLookup = {
  bpm: number | null;
  /** Rok przypisany do utworu, nie do składanki, na której go znaleźliśmy. */
  year: number | null;
};

type DeezerTrack = {
  bpm?: number;
  release_date?: string;
  error?: { code?: number; message?: string };
};

/** Deezer zwraca ten kod, gdy nie zna utworu o podanym ISRC. */
const NO_DATA = 800;

/** Deezer po przekroczeniu limitu odpowiada kodem 4, a nie statusem 429. */
const QUOTA_EXCEEDED = 4;

export class DeezerRateLimitError extends Error {
  constructor() {
    super(t('error.deezer.rateLimit'));
    this.name = 'DeezerRateLimitError';
  }
}

export function deezerTrackUrl(isrc: string): string {
  return `${DEEZER_API}/track/isrc:${encodeURIComponent(isrc)}`;
}

/**
 * Szuka utworu po ISRC. Dopasowanie po ISRC jest twardsze niż po tytule
 * i wykonawcy, bo to ten sam identyfikator, którym posługuje się Spotify.
 *
 * Zwraca `bpm: null`, gdy Deezer nie zna utworu albo zna go, ale nie policzył
 * tempa. Puste `bpm` u nich oznacza dokładnie zero, nie brak pola.
 */
export async function lookupByIsrc(
  isrc: string,
  getJson: JsonGetter = jsonp,
): Promise<DeezerLookup> {
  const raw = await getJson(deezerTrackUrl(isrc));
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(t('error.deezer.badShape'));
  }
  const body = raw as DeezerTrack;

  if (body.error) {
    if (body.error.code === QUOTA_EXCEEDED) throw new DeezerRateLimitError();
    if (body.error.code === NO_DATA) return { bpm: null, year: null };
    throw new Error(body.error.message ?? t('error.deezer.generic'));
  }

  return {
    // Zero znaczy u Deezera "nie policzyliśmy", a nie "utwór bez tempa".
    bpm: typeof body.bpm === 'number' && body.bpm > 0 ? body.bpm : null,
    year: parseReleaseYear(body.release_date),
  };
}
