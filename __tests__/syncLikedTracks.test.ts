import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingTrack } from '../src/db/types';

// Fabryki vi.mock są hoistowane ponad importy, więc atrapy, do których
// sięgają, muszą powstać w vi.hoisted.
const mocks = vi.hoisted(() => ({
  upsertTracks: vi.fn<(tracks: IncomingTrack[], seenAt: string) => Promise<void>>(async () => {}),
  setSyncState: vi.fn<(key: string, value: string) => Promise<void>>(async () => {}),
  prune: vi.fn<(seenAt: string) => Promise<number>>(async () => 0),
}));

vi.mock('../src/db/queries', () => ({
  upsertTracks: mocks.upsertTracks,
  pruneUnseenTracks: mocks.prune,
}));
vi.mock('../src/db/schema', () => ({
  setSyncState: mocks.setSyncState,
  SYNC_KEYS: { lastAddedAt: 'liked.lastAddedAt', lastFullSyncAt: 'liked.lastFullSyncAt' },
}));

import { syncLikedTracks, type SavedTrackItem } from '../src/api/likedTracks';

function item(id: string, addedAt: string): SavedTrackItem {
  return {
    added_at: addedAt,
    track: {
      id,
      name: `Utwór ${id}`,
      duration_ms: 200000,
      artists: [{ name: 'Ktoś' }],
      album: { name: 'Album', release_date: '2005-01-01' },
      external_ids: { isrc: `ISRC${id}` },
    },
  };
}

type OnPage<T> = (items: T[], total: number) => Promise<boolean | void> | boolean | void;

/** Udaje klienta Spotify, oddając przygotowane strony jedna po drugiej. */
function fakeClient(pages: SavedTrackItem[][], total = pages.flat().length) {
  return {
    requestPages: async <T>(_path: string, onPage: OnPage<T>) => {
      let seen = 0;
      for (const page of pages) {
        seen += page.length;
        // Strony są zawsze z ulubionymi, tylko sygnatura jest ogólna.
        const keepGoing = await onPage(page as T[], total);
        if (keepGoing === false) break;
      }
      return seen;
    },
  };
}

beforeEach(() => {
  mocks.upsertTracks.mockClear();
  mocks.setSyncState.mockClear();
  mocks.prune.mockClear();
  mocks.prune.mockResolvedValue(0);
});

describe('syncLikedTracks', () => {
  it('zapisuje wszystkie strony przy pełnej synchronizacji', async () => {
    const client = fakeClient([
      [item('a', '2024-03-01T00:00:00Z'), item('b', '2024-02-01T00:00:00Z')],
      [item('c', '2024-01-01T00:00:00Z')],
    ]);

    const result = await syncLikedTracks({ client });

    expect(result.saved).toBe(3);
    expect(result.stoppedEarly).toBe(false);
    expect(mocks.upsertTracks).toHaveBeenCalledTimes(2);
  });

  it('przerywa na pierwszym znanym utworze, ale zapisuje nowsze z tej samej strony', async () => {
    const client = fakeClient([
      [
        item('nowy', '2024-03-01T00:00:00Z'),
        item('znany', '2024-01-01T00:00:00Z'),
        item('starszy', '2023-12-01T00:00:00Z'),
      ],
      [item('nigdy-nie-pobrany', '2023-01-01T00:00:00Z')],
    ]);

    const result = await syncLikedTracks({ client, since: '2024-01-01T00:00:00Z' });

    expect(result.stoppedEarly).toBe(true);
    expect(result.saved).toBe(1);
    expect(mocks.upsertTracks).toHaveBeenCalledTimes(1);
    expect(mocks.upsertTracks.mock.calls[0][0].map((t) => t.id)).toEqual(['nowy']);
  });

  it('zapamiętuje added_at najnowszego utworu do następnego razu', async () => {
    const client = fakeClient([
      [item('a', '2024-03-01T00:00:00Z'), item('b', '2024-02-01T00:00:00Z')],
    ]);

    await syncLikedTracks({ client });

    expect(mocks.setSyncState).toHaveBeenCalledWith('liked.lastAddedAt', '2024-03-01T00:00:00Z');
  });

  it('nie zapisuje nic, gdy od ostatniego razu nic nie przybyło', async () => {
    const client = fakeClient([[item('znany', '2024-01-01T00:00:00Z')]]);

    const result = await syncLikedTracks({ client, since: '2024-01-01T00:00:00Z' });

    expect(result.saved).toBe(0);
    expect(mocks.upsertTracks).not.toHaveBeenCalled();
  });

  it('raportuje postęp po każdej stronie', async () => {
    const client = fakeClient(
      [[item('a', '2024-03-01T00:00:00Z')], [item('b', '2024-02-01T00:00:00Z')]],
      2,
    );
    const progress: number[] = [];

    await syncLikedTracks({ client, onProgress: (p) => progress.push(p.saved) });

    expect(progress).toEqual([1, 2]);
  });

  it('daje się przerwać sygnałem, gdy użytkownik wyjdzie z ekranu', async () => {
    const signal = { cancelled: true };
    const client = fakeClient([[item('a', '2024-03-01T00:00:00Z')]]);

    const result = await syncLikedTracks({ client, signal });

    expect(result.saved).toBe(0);
    expect(result.stoppedEarly).toBe(true);
  });
});

describe('pełna synchronizacja', () => {
  it('ignoruje since i przechodzi całą bibliotekę', async () => {
    const client = fakeClient([
      [item('nowy', '2024-03-01T00:00:00Z')],
      [item('stary', '2020-01-01T00:00:00Z')],
    ]);

    const result = await syncLikedTracks({ client, full: true, since: '2024-01-01T00:00:00Z' });

    expect(result.stoppedEarly).toBe(false);
    expect(result.saved).toBe(2);
  });

  it('kasuje utwory, których Spotify już nie pokazuje', async () => {
    mocks.prune.mockResolvedValue(7);
    const client = fakeClient([[item('a', '2024-03-01T00:00:00Z')]]);

    const result = await syncLikedTracks({ client, full: true });

    expect(mocks.prune).toHaveBeenCalledTimes(1);
    expect(result.removed).toBe(7);
  });

  it('nie kasuje nic po przerwanym przejściu, bo reszty po prostu nie widzieliśmy', async () => {
    const client = fakeClient([[item('a', '2024-03-01T00:00:00Z')]]);

    const result = await syncLikedTracks({ client, full: true, signal: { cancelled: true } });

    expect(mocks.prune).not.toHaveBeenCalled();
    expect(result.removed).toBe(0);
  });

  it('synchronizacja przyrostowa nigdy nie kasuje', async () => {
    const client = fakeClient([[item('a', '2024-03-01T00:00:00Z')]]);

    await syncLikedTracks({ client });

    expect(mocks.prune).not.toHaveBeenCalled();
  });

  it('wszystkie strony dostają ten sam znacznik, inaczej kasowanie zjadłoby własne zapisy', async () => {
    const seen: string[] = [];
    const client = fakeClient([
      [item('a', '2024-03-01T00:00:00Z')],
      [item('b', '2024-02-01T00:00:00Z')],
    ]);

    await syncLikedTracks({
      client,
      full: true,
      persist: {
        upsertTracks: async (_tracks, seenAt) => {
          seen.push(seenAt);
        },
        pruneUnseenTracks: async (seenAt) => {
          seen.push(`prune:${seenAt}`);
          return 0;
        },
      },
    });

    expect(seen[0]).toBe(seen[1]);
    expect(seen[2]).toBe(`prune:${seen[0]}`);
  });
});
