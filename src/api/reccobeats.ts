import { t } from '../i18n';

const RECCOBEATS_API = 'https://api.reccobeats.com/v1';

/**
 * Oba endpointy przyjmują listę identyfikatorów. Czterdzieści to wartość,
 * przy której odpowiedź wciąż jest jedna i nie robi się z niej kobyła.
 */
export const RECCOBEATS_BATCH = 40;

/** Ich limity nie są opisane w dokumentacji, więc zostawiamy odstęp między paczkami. */
export const RECCOBEATS_GAP_MS = 500;

type TrackEnvelope = {
  content?: { id?: string; href?: string }[];
};

type FeaturesEnvelope = {
  content?: { id?: string; tempo?: number }[];
};

export class ReccoBeatsRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super(t('error.reccobeats.rateLimit'));
    this.name = 'ReccoBeatsRateLimitError';
  }
}

/**
 * Ustala tempo dla paczki utworów ze Spotify.
 *
 * Idzie w dwóch krokach, bo ReccoBeats nie wystawia tempa bezpośrednio
 * pod ID Spotify: najpierw tłumaczy ID Spotify na własne, potem dopiero
 * oddaje cechy audio. Zwraca mapę z ID Spotify na BPM, pomijając utwory,
 * których nie zna.
 */
export async function lookupTempoBatch(
  spotifyIds: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (spotifyIds.length === 0) return result;

  const tracks = await getJson<TrackEnvelope>(
    `${RECCOBEATS_API}/track?ids=${spotifyIds.join(',')}`,
    fetchImpl,
  );

  // Ich własne ID jest kluczem do cech audio, a `href` wiąże je z powrotem
  // z ID Spotify, które trzymamy w bazie.
  const byInternalId = new Map<string, string>();
  for (const entry of tracks.content ?? []) {
    const spotifyId = spotifyIdFromHref(entry.href);
    if (entry.id && spotifyId) byInternalId.set(entry.id, spotifyId);
  }
  if (byInternalId.size === 0) return result;

  const features = await getJson<FeaturesEnvelope>(
    `${RECCOBEATS_API}/audio-features?ids=${[...byInternalId.keys()].join(',')}`,
    fetchImpl,
  );

  for (const entry of features.content ?? []) {
    const spotifyId = entry.id ? byInternalId.get(entry.id) : undefined;
    if (spotifyId && typeof entry.tempo === 'number' && entry.tempo > 0) {
      result.set(spotifyId, entry.tempo);
    }
  }

  return result;
}

/** Z `https://open.spotify.com/track/{id}` wyciąga samo ID. */
export function spotifyIdFromHref(href: string | undefined): string | null {
  if (!href) return null;
  const match = /\/track\/([A-Za-z0-9]+)/.exec(href);
  return match ? match[1] : null;
}

async function getJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(url);

  if (response.status === 429) {
    const header = response.headers?.get?.('Retry-After');
    const seconds = header ? Number(header) : NaN;
    throw new ReccoBeatsRateLimitError(Number.isFinite(seconds) ? seconds * 1000 : 5000);
  }
  if (!response.ok) {
    throw new Error(t('error.reccobeats.status', { status: response.status }));
  }

  return (await response.json()) as T;
}
