import { chunk } from '../bpm/rateLimiter';
import type { TrackFilter } from '../db/types';
import { spotify } from './spotifyClient';
import { t } from '../i18n';

/** Spotify przyjmuje najwyżej tyle URI w jednym żądaniu dodania utworów. */
export const ADD_TRACKS_BATCH = 100;

/** Limit długości nazwy playlisty po stronie Spotify. */
const MAX_NAME_LENGTH = 100;

export type CreatedPlaylist = { id: string; url: string; added: number };

/**
 * Nazwa domyślna złożona z aktywnych filtrów, na przykład
 * „BPM 120-130 · 2000-2010”. Zakres zwężony do jednej wartości pokazujemy
 * bez myślnika, bo „BPM 128-128” wygląda jak błąd.
 */
export function defaultPlaylistName(filter: TrackFilter): string {
  const bpm =
    filter.bpmMin === filter.bpmMax
      ? `BPM ${filter.bpmMin}`
      : `BPM ${filter.bpmMin}-${filter.bpmMax}`;

  const years =
    filter.yearMin === filter.yearMax
      ? String(filter.yearMin)
      : `${filter.yearMin}-${filter.yearMax}`;

  return `${bpm} · ${years}`.slice(0, MAX_NAME_LENGTH);
}

export function trackUri(id: string): string {
  return `spotify:track:${id}`;
}

type PlaylistResponse = { id: string; external_urls?: { spotify?: string } };

/**
 * Tworzy prywatną playlistę i dosypuje do niej utwory paczkami po 100.
 *
 * Zakres `playlist-modify-private` wystarcza, bo playlisty tworzymy
 * wyłącznie jako prywatne. Idziemy przez `POST /me/playlists` i
 * `POST /playlists/{id}/items`: starsze ścieżki `/users/{id}/playlists`
 * i `/playlists/{id}/tracks` Spotify wycofało i odpowiadają 403 Forbidden,
 * a ścieżka `/me/...` nie potrzebuje ID użytkownika.
 */
export async function createPlaylistWithTracks(
  name: string,
  trackIds: string[],
  client: Pick<typeof spotify, 'request'> = spotify,
): Promise<CreatedPlaylist> {
  const playlist = await client.request<PlaylistResponse>('/me/playlists', {
    method: 'POST',
    body: {
      name: name.trim().slice(0, MAX_NAME_LENGTH) || 'Beatsift',
      public: false,
      description: t('playlist.description'),
    },
  });

  let added = 0;
  for (const batch of chunk(trackIds, ADD_TRACKS_BATCH)) {
    await client.request(`/playlists/${playlist.id}/items`, {
      method: 'POST',
      body: { uris: batch.map(trackUri) },
    });
    added += batch.length;
  }

  return {
    id: playlist.id,
    url: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`,
    added,
  };
}

export type PlaylistSummary = {
  id: string;
  name: string;
  /** Liczba pozycji wg Spotify; przybliżona, bo zawiera też odcinki i pliki lokalne. */
  total: number;
  collaborative: boolean;
};

type PlaylistListItem = {
  id?: unknown;
  name?: unknown;
  collaborative?: unknown;
  owner?: { id?: unknown } | null;
  items?: { total?: unknown } | null;
  /** Starsza nazwa pola, Spotify oznacza ją jako wycofywaną. */
  tracks?: { total?: unknown } | null;
};

/**
 * Playlisty z biblioteki, które da się przeszukać: własne oraz współtworzone.
 * Obserwowane playlisty innych użytkowników odpadają, bo to nie jest muzyka
 * użytkownika, a te należące do Spotify i tak odpowiadają 403.
 */
export async function fetchOwnPlaylists(
  ownerId: string,
  client: Pick<typeof spotify, 'requestPages'> = spotify,
): Promise<PlaylistSummary[]> {
  const playlists: PlaylistSummary[] = [];

  await client.requestPages<PlaylistListItem>('/me/playlists?limit=50', (items) => {
    for (const item of items) {
      if (typeof item.id !== 'string' || !item.id) continue;
      const collaborative = item.collaborative === true;
      if (item.owner?.id !== ownerId && !collaborative) continue;

      const total = item.items?.total ?? item.tracks?.total;
      playlists.push({
        id: item.id,
        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : item.id,
        total: typeof total === 'number' ? total : 0,
        collaborative,
      });
    }
  });

  return playlists;
}
