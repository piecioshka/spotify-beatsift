import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyBpmUpdates,
  findTracks,
  libraryStats,
  pendingBpmTracks,
  pruneUnseenTracks,
  upsertTracks,
} from '../src/db/queries';
import { getSyncState, resetDatabase, setSyncState } from '../src/db/schema';
import type { IncomingTrack } from '../src/db/types';

function incoming(id: string, overrides: Partial<IncomingTrack> = {}): IncomingTrack {
  return {
    id,
    name: `Utwór ${id}`,
    artists: 'Ktoś',
    album: 'Album',
    isrc: `ISRC-${id}`,
    durationMs: 200000,
    addedAt: '2024-03-01T00:00:00Z',
    releaseYearSpotify: 2005,
    ...overrides,
  };
}

const filter = { bpmMin: 120, bpmMax: 130, yearMin: 2000, yearMax: 2010 };

beforeEach(async () => {
  await resetDatabase();
});

describe('IndexedDB', () => {
  it('zapisuje utwory i liczy statystyki', async () => {
    await upsertTracks([incoming('a'), incoming('b', { releaseYearSpotify: null })]);

    await expect(libraryStats()).resolves.toEqual({
      total: 2,
      withBpm: 0,
      withYear: 1,
      pending: 2,
    });
  });

  it('filtruje po BPM i roku, sortując po nazwie', async () => {
    await upsertTracks([
      incoming('z', { name: 'Zeta' }),
      incoming('a', { name: 'alfa' }),
      incoming('x', { name: 'Poza zakresem' }),
    ]);
    await applyBpmUpdates([
      { id: 'z', bpm: 125, source: 'deezer' },
      { id: 'a', bpm: 128, source: 'reccobeats' },
      { id: 'x', bpm: 180, source: 'deezer' },
    ]);

    const rows = await findTracks(filter);

    expect(rows.map((row) => row.name)).toEqual(['alfa', 'Zeta']);
  });

  it('kolejka BPM oddaje tylko niesprawdzone, od najnowszych', async () => {
    await upsertTracks([
      incoming('stary', { addedAt: '2020-01-01T00:00:00Z' }),
      incoming('nowy', { addedAt: '2024-01-01T00:00:00Z' }),
      incoming('gotowy', { addedAt: '2025-01-01T00:00:00Z' }),
    ]);
    await applyBpmUpdates([{ id: 'gotowy', bpm: 100, source: 'deezer' }]);

    const pending = await pendingBpmTracks(10);

    expect(pending.map((row) => row.id)).toEqual(['nowy', 'stary']);
    expect(await pendingBpmTracks(1)).toHaveLength(1);
  });

  it('ponowna synchronizacja nie kasuje ustalonego tempa', async () => {
    await upsertTracks([incoming('a')]);
    await applyBpmUpdates([{ id: 'a', bpm: 125, source: 'deezer', deezerYear: 2001 }]);

    await upsertTracks([incoming('a', { name: 'Nowa nazwa' })]);

    const [row] = await findTracks(filter);
    expect(row.name).toBe('Nowa nazwa');
    expect(row.bpm).toBe(125);
    expect(row.release_year).toBe(2001);
  });

  it('aktualizacja utworu, którego już nie ma, jest pomijana', async () => {
    await expect(
      applyBpmUpdates([{ id: 'nie-ma', bpm: 125, source: 'deezer' }]),
    ).resolves.toBeUndefined();
    await expect(libraryStats()).resolves.toMatchObject({ total: 0 });
  });

  it('pełna synchronizacja kasuje utwory niewidziane w tym przejściu', async () => {
    await upsertTracks([incoming('stary')], '2024-01-01T00:00:00Z');
    await upsertTracks([incoming('nowy')], '2024-02-01T00:00:00Z');

    const removed = await pruneUnseenTracks('2024-02-01T00:00:00Z');

    expect(removed).toBe(1);
    const stats = await libraryStats();
    expect(stats.total).toBe(1);
  });

  it('pamięta stan synchronizacji', async () => {
    await expect(getSyncState('liked.lastAddedAt')).resolves.toBeNull();

    await setSyncState('liked.lastAddedAt', '2024-03-01T00:00:00Z');
    await setSyncState('liked.lastAddedAt', '2024-04-01T00:00:00Z');

    await expect(getSyncState('liked.lastAddedAt')).resolves.toBe('2024-04-01T00:00:00Z');
  });

  it('reset czyści utwory i stan', async () => {
    await upsertTracks([incoming('a')]);
    await setSyncState('k', 'v');

    await resetDatabase();

    await expect(libraryStats()).resolves.toMatchObject({ total: 0 });
    await expect(getSyncState('k')).resolves.toBeNull();
  });
});
