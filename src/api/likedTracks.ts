import { pruneUnseenTracks, upsertTracks } from '../db/queries';
import { parseReleaseYear } from '../db/releaseYear';
import { setSyncState, SYNC_KEYS } from '../db/schema';
import type { IncomingTrack } from '../db/types';
import { spotify } from './spotifyClient';
import { t } from '../i18n';

/** Kształt pozycji z `GET /v1/me/tracks`, obcięty do pól, których używamy. */
export type SavedTrackItem = {
  added_at: string | null;
  track: {
    id: string | null;
    name: string;
    is_local?: boolean;
    duration_ms?: number | null;
    artists?: { name: string }[];
    album?: { name?: string | null; release_date?: string | null } | null;
    external_ids?: { isrc?: string | null } | null;
  } | null;
};

/**
 * Przerabia pozycję ze Spotify na wiersz do zapisu.
 *
 * Zwraca null dla plików lokalnych dodanych do biblioteki. Nie mają ID
 * ani ISRC, więc żadne ze źródeł BPM ich nie rozpozna, a w bazie tylko
 * zaniżałyby licznik pokrycia.
 */
export function mapSavedTrack(item: SavedTrackItem): IncomingTrack | null {
  const track = item?.track;
  if (!track || !track.id || track.is_local) return null;

  const artists = (track.artists ?? [])
    .map((artist) => artist.name)
    .filter(Boolean)
    .join(', ');

  return {
    id: track.id,
    name: track.name,
    artists: artists || t('track.unknownArtist'),
    album: track.album?.name ?? null,
    isrc: track.external_ids?.isrc ?? null,
    durationMs: track.duration_ms ?? null,
    addedAt: item.added_at ?? null,
    releaseYearSpotify: parseReleaseYear(track.album?.release_date),
  };
}

export type SyncProgress = { saved: number; total: number };

export type SyncOptions = {
  /**
   * Synchronizacja przyrostowa: `added_at` najnowszego znanego utworu.
   * Spotify oddaje ulubione od najnowszych, więc gdy trafimy na coś starszego
   * albo równego, dalej są już same znane rzeczy i można przerwać.
   */
  since?: string | null;
  /**
   * Pełne przejście: ignoruje `since` i na koniec kasuje utwory, których
   * Spotify już nie pokazuje. Tylko tak wychodzą na jaw te wypisane
   * z ulubionych, bo synchronizacja przyrostowa widzi wyłącznie nowe.
   */
  full?: boolean;
  onProgress?: (progress: SyncProgress) => void;
  signal?: { cancelled: boolean };
  /**
   * Znacznik „widziano w tym przebiegu”. Orkiestrator wielu źródeł podaje
   * jeden wspólny, żeby czyszczenie na końcu objęło wszystkie źródła naraz.
   */
  seenAt?: string;
  /** `false`, gdy porządki robi ktoś wyżej (orkiestrator źródeł). */
  prune?: boolean;
  client?: Pick<typeof spotify, 'requestPages'>;
  persist?: {
    upsertTracks: (tracks: IncomingTrack[], seenAt: string) => Promise<void>;
    pruneUnseenTracks: (seenAt: string) => Promise<number>;
  };
};

export type SyncResult = {
  saved: number;
  total: number;
  newestAddedAt: string | null;
  stoppedEarly: boolean;
  /** Ile utworów zniknęło z ulubionych od ostatniej pełnej synchronizacji. */
  removed: number;
};

/** Pobiera polubione utwory stronami po 50 i zapisuje każdą stronę od razu. */
export async function syncLikedTracks(options: SyncOptions = {}): Promise<SyncResult> {
  const client = options.client ?? spotify;
  const { onProgress, signal, full = false, prune = true } = options;
  const persist = options.persist ?? { upsertTracks, pruneUnseenTracks };

  // Przy pełnym przejściu nie przerywamy na znanych utworach, bo musimy
  // zobaczyć całą bibliotekę, żeby wiedzieć, czego już w niej nie ma.
  const since = full ? null : options.since;
  const seenAt = options.seenAt ?? new Date().toISOString();

  let saved = 0;
  let total = 0;
  let newestAddedAt: string | null = null;
  let stoppedEarly = false;

  await client.requestPages<SavedTrackItem>('/me/tracks?limit=50', async (items, pageTotal) => {
    total = pageTotal;
    if (signal?.cancelled) {
      stoppedEarly = true;
      return false;
    }

    const fresh: SavedTrackItem[] = [];
    for (const item of items) {
      if (since && item.added_at && item.added_at <= since) {
        stoppedEarly = true;
        break;
      }
      fresh.push(item);
    }

    const mapped = fresh
      .map(mapSavedTrack)
      .filter((track): track is IncomingTrack => track !== null);

    if (mapped.length > 0) {
      await persist.upsertTracks(mapped, seenAt);
      saved += mapped.length;
      if (!newestAddedAt) newestAddedAt = mapped[0].addedAt;
    }

    onProgress?.({ saved, total });

    // Przerywamy dopiero po zapisaniu tego, co z tej strony było nowe.
    return !stoppedEarly;
  });

  if (newestAddedAt) await setSyncState(SYNC_KEYS.lastAddedAt, newestAddedAt);

  // Kasujemy dopiero po przejściu całej biblioteki. Przerwana w połowie
  // synchronizacja wyrzuciłaby utwory, do których po prostu nie doszliśmy.
  let removed = 0;
  if (prune && full && !stoppedEarly && !signal?.cancelled) {
    removed = await persist.pruneUnseenTracks(seenAt);
    await setSyncState(SYNC_KEYS.lastFullSyncAt, seenAt);
  }

  return { saved, total, newestAddedAt, stoppedEarly, removed };
}

/** Liczba polubionych utworów, bez pobierania ich: Spotify podaje `total` przy każdej stronie. */
export async function fetchLikedCount(
  client: Pick<typeof spotify, 'request'> = spotify,
): Promise<number> {
  const page = await client.request<{ total?: number }>('/me/tracks?limit=1');
  return typeof page.total === 'number' ? page.total : 0;
}
