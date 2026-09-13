import { upsertTracks } from '../db/queries';
import type { IncomingTrack } from '../db/types';
import { mapSavedTrack, type SavedTrackItem } from './likedTracks';
import { spotify } from './spotifyClient';

/**
 * Pozycja z `GET /playlists/{id}/items`. Aktualny kształt trzyma utwór
 * w `item`, starszy w `track`; obsługujemy oba, bo odpowiedzi bywają
 * mieszane w okresie przejściowym.
 */
export type PlaylistItem = {
  added_at: string | null;
  is_local?: boolean;
  item?: PlaylistEntry | null;
  track?: PlaylistEntry | null;
};

type PlaylistEntry = NonNullable<SavedTrackItem['track']> & { type?: string };

/**
 * Lista pól ogranicza odpowiedź do tego, czego używamy. Bez niej każda
 * pozycja niesie pełny obiekt albumu z obrazkami i dostępnością per kraj,
 * czyli kilkanaście razy więcej bajtów.
 */
export const PLAYLIST_ITEMS_FIELDS =
  'total,next,items(added_at,is_local,item(id,name,type,is_local,duration_ms,artists(name),album(name,release_date),external_ids(isrc)))';

export function playlistItemsPath(playlistId: string): string {
  const params = new URLSearchParams({ limit: '50', fields: PLAYLIST_ITEMS_FIELDS });
  return `/playlists/${encodeURIComponent(playlistId)}/items?${params.toString()}`;
}

/** Odcinki podcastów i pliki lokalne nie mają ISRC ani tempa, więc odpadają. */
export function mapPlaylistItem(item: PlaylistItem): IncomingTrack | null {
  const entry = item.item ?? item.track ?? null;
  if (!entry || item.is_local) return null;
  if (entry.type !== undefined && entry.type !== 'track') return null;
  return mapSavedTrack({ added_at: item.added_at, track: entry });
}

export type PlaylistSyncProgress = { saved: number; total: number };

export type PlaylistSyncOptions = {
  playlistId: string;
  /** Wspólny dla całego przebiegu, żeby prune na końcu widział wszystkie źródła. */
  seenAt: string;
  onProgress?: (progress: PlaylistSyncProgress) => void;
  signal?: { cancelled: boolean };
  client?: Pick<typeof spotify, 'requestPages'>;
  persist?: { upsertTracks: (tracks: IncomingTrack[], seenAt: string) => Promise<void> };
};

export type PlaylistSyncResult = { saved: number; total: number; stoppedEarly: boolean };

/**
 * Pełne przejście playlisty stronami po 50. Zawsze pełne, bo z playlisty
 * da się usuwać i zmieniać kolejność, więc nie ma na czym oparć przyrostu.
 */
export async function syncPlaylistTracks(
  options: PlaylistSyncOptions,
): Promise<PlaylistSyncResult> {
  const { playlistId, seenAt, onProgress, signal } = options;
  const client = options.client ?? spotify;
  const persist = options.persist ?? { upsertTracks };

  let saved = 0;
  let total = 0;
  let stoppedEarly = false;

  await client.requestPages<PlaylistItem>(
    playlistItemsPath(playlistId),
    async (items, pageTotal) => {
      total = pageTotal;
      if (signal?.cancelled) {
        stoppedEarly = true;
        return false;
      }

      const mapped = items
        .map(mapPlaylistItem)
        .filter((track): track is IncomingTrack => track !== null);

      if (mapped.length > 0) {
        await persist.upsertTracks(mapped, seenAt);
        saved += mapped.length;
      }
      onProgress?.({ saved, total });

      if (signal?.cancelled) {
        stoppedEarly = true;
        return false;
      }
      return true;
    },
  );

  return { saved, total, stoppedEarly };
}
