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

type Me = { id: string };
type PlaylistResponse = { id: string; external_urls?: { spotify?: string } };

/**
 * Tworzy prywatną playlistę i dosypuje do niej utwory paczkami po 100.
 *
 * Zakres `playlist-modify-private` wystarcza, bo playlisty tworzymy
 * wyłącznie jako prywatne.
 */
export async function createPlaylistWithTracks(
  name: string,
  trackIds: string[],
  client: Pick<typeof spotify, 'request'> = spotify,
): Promise<CreatedPlaylist> {
  const me = await client.request<Me>('/me');

  const playlist = await client.request<PlaylistResponse>(`/users/${me.id}/playlists`, {
    method: 'POST',
    body: {
      name: name.trim().slice(0, MAX_NAME_LENGTH) || 'Beatsift',
      public: false,
      description: t('playlist.description'),
    },
  });

  let added = 0;
  for (const batch of chunk(trackIds, ADD_TRACKS_BATCH)) {
    await client.request(`/playlists/${playlist.id}/tracks`, {
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
