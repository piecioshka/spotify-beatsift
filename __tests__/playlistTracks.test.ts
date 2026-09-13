import { describe, expect, it } from 'vitest';
import {
  mapPlaylistItem,
  PLAYLIST_ITEMS_FIELDS,
  playlistItemsPath,
  syncPlaylistTracks,
} from '../src/api/playlistTracks';
import type { IncomingTrack } from '../src/db/types';

const song = {
  id: 'trk1',
  name: 'Utwór',
  type: 'track',
  duration_ms: 1000,
  artists: [{ name: 'A' }, { name: 'B' }],
  album: { name: 'Album', release_date: '2004-05-06' },
  external_ids: { isrc: 'PL-1' },
};

describe('mapPlaylistItem', () => {
  it('czyta utwór z pola item (aktualny kształt)', () => {
    expect(mapPlaylistItem({ added_at: '2024-01-02T00:00:00Z', item: song })).toEqual({
      id: 'trk1',
      name: 'Utwór',
      artists: 'A, B',
      album: 'Album',
      isrc: 'PL-1',
      durationMs: 1000,
      addedAt: '2024-01-02T00:00:00Z',
      releaseYearSpotify: 2004,
    });
  });

  it('cofa się do pola track, gdy item jest puste', () => {
    expect(mapPlaylistItem({ added_at: null, track: song })?.id).toBe('trk1');
  });

  it('pomija odcinki podcastów i pliki lokalne', () => {
    expect(mapPlaylistItem({ added_at: null, item: { ...song, type: 'episode' } })).toBeNull();
    expect(mapPlaylistItem({ added_at: null, is_local: true, item: song })).toBeNull();
    expect(mapPlaylistItem({ added_at: null, item: null })).toBeNull();
  });
});

describe('playlistItemsPath', () => {
  it('idzie przez aktualny endpoint /items z limitem 50 i listą pól', () => {
    const path = playlistItemsPath('abc');
    expect(path.startsWith('/playlists/abc/items?')).toBe(true);
    const params = new URLSearchParams(path.split('?')[1]);
    expect(params.get('limit')).toBe('50');
    expect(params.get('fields')).toBe(PLAYLIST_ITEMS_FIELDS);
    expect(PLAYLIST_ITEMS_FIELDS).toContain('external_ids(isrc)');
    expect(PLAYLIST_ITEMS_FIELDS).toContain('next');
  });
});

function pagedClient(pages: unknown[][]) {
  const paths: string[] = [];
  return {
    paths,
    requestPages: async <Item>(
      firstPath: string,
      onPage: (items: Item[], total: number) => Promise<boolean | void> | boolean | void,
    ) => {
      paths.push(firstPath);
      let seen = 0;
      const total = pages.reduce((sum, page) => sum + page.length, 0);
      for (const page of pages) {
        seen += page.length;
        const shouldStop = await onPage(page as Item[], total);
        if (shouldStop === false) break;
      }
      return seen;
    },
  };
}

describe('syncPlaylistTracks', () => {
  it('zapisuje każdą stronę od razu ze wspólnym seenAt i raportuje postęp', async () => {
    const saved: { tracks: IncomingTrack[]; seenAt: string }[] = [];
    const progress: { saved: number; total: number }[] = [];
    const client = pagedClient([
      [{ added_at: '2024-01-01T00:00:00Z', item: song }],
      [{ added_at: '2024-01-02T00:00:00Z', item: { ...song, id: 'trk2' } }],
    ]);

    const result = await syncPlaylistTracks({
      playlistId: 'abc',
      seenAt: '2026-01-01T00:00:00Z',
      client,
      onProgress: (p) => progress.push(p),
      persist: {
        upsertTracks: async (tracks, seenAt) => {
          saved.push({ tracks, seenAt });
        },
      },
    });

    expect(client.paths[0]).toBe(playlistItemsPath('abc'));
    expect(saved.map((s) => s.tracks.map((t) => t.id))).toEqual([['trk1'], ['trk2']]);
    expect(saved.every((s) => s.seenAt === '2026-01-01T00:00:00Z')).toBe(true);
    expect(progress).toEqual([
      { saved: 1, total: 2 },
      { saved: 2, total: 2 },
    ]);
    expect(result).toEqual({ saved: 2, total: 2, stoppedEarly: false });
  });

  it('anulowanie przerywa po bieżącej stronie i oznacza wynik jako niepełny', async () => {
    const signal = { cancelled: false };
    const client = pagedClient([
      [{ added_at: null, item: song }],
      [{ added_at: null, item: song }],
    ]);

    const result = await syncPlaylistTracks({
      playlistId: 'abc',
      seenAt: 'x',
      signal,
      client,
      persist: {
        upsertTracks: async () => {
          signal.cancelled = true;
        },
      },
    });

    expect(result.stoppedEarly).toBe(true);
  });
});
