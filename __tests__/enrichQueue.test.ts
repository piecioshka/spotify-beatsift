import { describe, expect, it, vi } from 'vitest';
import { enrichBpm } from '../src/bpm/enrichQueue';
import type { BpmUpdate } from '../src/db/queries';
import type { TrackRow } from '../src/db/types';

function row(id: string, isrc: string | null): TrackRow {
  return {
    id,
    name: `Utwór ${id}`,
    artists: 'Ktoś',
    album: 'Album',
    isrc,
    duration_ms: 200000,
    added_at: '2024-01-01T00:00:00Z',
    bpm: null,
    bpm_rounded: null,
    bpm_source: null,
    bpm_checked_at: null,
    release_year_spotify: 2015,
    release_year_deezer: null,
    release_year: 2015,
    last_seen_at: '2024-01-01T00:00:00Z',
  };
}

/**
 * Udaje oba API naraz. `deezer` mapuje ISRC na odpowiedź JSONP,
 * `recco` mapuje ID Spotify na tempo.
 */
function fakeApis(deezer: Record<string, unknown>, recco: Record<string, number>) {
  const urls: string[] = [];

  const deezerGet = async (url: string) => {
    urls.push(url);
    const isrc = url.split('isrc:')[1];
    return deezer[isrc] ?? { error: { code: 800, message: 'no data' } };
  };

  const fetchImpl: typeof fetch = async (url) => {
    const asString = String(url);
    urls.push(asString);

    if (asString.includes('/v1/track?ids=')) {
      const ids = asString.split('ids=')[1].split(',');
      return Response.json({
        content: ids.map((id) => ({
          id: `inner-${id}`,
          href: `https://open.spotify.com/track/${id}`,
        })),
      });
    }

    const innerIds = asString.split('ids=')[1].split(',');
    return Response.json({
      content: innerIds.map((inner) => ({
        id: inner,
        tempo: recco[inner.replace('inner-', '')] ?? 0,
      })),
    });
  };

  return { deezerGet, fetchImpl, urls };
}

function harness(
  tracks: TrackRow[],
  deezer: Record<string, unknown>,
  recco: Record<string, number>,
) {
  const saved: BpmUpdate[][] = [];
  let served = false;

  const { deezerGet, fetchImpl, urls } = fakeApis(deezer, recco);

  return {
    saved,
    urls,
    run: () =>
      enrichBpm({
        deezerGet,
        fetchImpl,
        sleep: async () => {},
        loadPending: async () => {
          if (served) return [];
          served = true;
          return tracks;
        },
        saveUpdates: async (updates) => {
          saved.push(updates);
        },
      }),
  };
}

describe('enrichBpm', () => {
  it('bierze tempo z Deezera, gdy ten zna utwór', async () => {
    const h = harness(
      [row('aaa', 'ISRC-A')],
      { 'ISRC-A': { bpm: 128.4, release_date: '2005-06-01' } },
      {},
    );

    await h.run();

    expect(h.saved[0]).toEqual([{ id: 'aaa', bpm: 128.4, source: 'deezer', deezerYear: 2005 }]);
  });

  it('schodzi do ReccoBeats, gdy Deezer nie zna utworu', async () => {
    const h = harness([row('bbb', 'ISRC-B')], {}, { bbb: 174.2 });

    await h.run();

    expect(h.saved[0]).toEqual([{ id: 'bbb', bpm: 174.2, source: 'reccobeats', deezerYear: null }]);
  });

  it('utwór bez ISRC pomija Deezera i leci prosto do ReccoBeats', async () => {
    const h = harness([row('ccc', null)], {}, { ccc: 90 });

    await h.run();

    expect(h.urls.map((url) => new URL(url).hostname)).not.toContain('api.deezer.com');
    expect(h.saved[0][0]).toMatchObject({ source: 'reccobeats', bpm: 90 });
  });

  it('zachowuje rok z Deezera, nawet gdy tempo przyszło z ReccoBeats', async () => {
    // Deezer zna utwór i jego datę, ale nie policzył tempa.
    const h = harness(
      [row('ddd', 'ISRC-D')],
      { 'ISRC-D': { bpm: 0, release_date: '2003-04-05' } },
      { ddd: 145 },
    );

    await h.run();

    expect(h.saved[0][0]).toEqual({
      id: 'ddd',
      bpm: 145,
      source: 'reccobeats',
      deezerYear: 2003,
    });
  });

  it('oznacza jako sprawdzone także utwory, dla których nic nie znaleziono', async () => {
    const h = harness([row('eee', 'ISRC-E')], {}, {});

    const result = await h.run();

    expect(h.saved[0]).toEqual([{ id: 'eee', bpm: null, source: null, deezerYear: null }]);
    expect(result.processed).toBe(1);
    expect(result.resolved).toBe(0);
  });

  it('nie pyta ReccoBeats o utwory, które Deezer już rozstrzygnął', async () => {
    const h = harness(
      [row('fff', 'ISRC-F')],
      { 'ISRC-F': { bpm: 120, release_date: '2001-01-01' } },
      {},
    );

    await h.run();

    expect(h.urls.map((url) => new URL(url).hostname)).not.toContain('api.reccobeats.com');
  });

  it('liczy, ilu utworom udało się przypisać tempo', async () => {
    const h = harness(
      [row('g1', 'ISRC-G1'), row('g2', 'ISRC-G2'), row('g3', 'ISRC-G3')],
      { 'ISRC-G1': { bpm: 100, release_date: '2000-01-01' } },
      { g2: 150 },
    );

    const result = await h.run();

    expect(result).toEqual({ processed: 3, resolved: 2 });
  });

  it('błąd Deezera przy jednym utworze nie zatrzymuje reszty porcji', async () => {
    const h = harness(
      [row('h1', 'ISRC-H1'), row('h2', 'ISRC-H2')],
      {
        'ISRC-H1': { error: { code: 500, message: 'awaria' } },
        'ISRC-H2': { bpm: 99, release_date: '2010-01-01' },
      },
      { h1: 130 },
    );

    await h.run();

    expect(h.saved[0]).toEqual([
      { id: 'h1', bpm: 130, source: 'reccobeats', deezerYear: null },
      { id: 'h2', bpm: 99, source: 'deezer', deezerYear: 2010 },
    ]);
  });

  it('bez sieci nie oznacza chybionych utworów jako sprawdzonych', async () => {
    // Sieć znika w trakcie porcji: Deezer zna jeden utwór, drugi już nie
    // dostał odpowiedzi. Ten drugi ma wrócić do kolejki, a nie dostać
    // „sprawdzony, brak tempa”.
    let online = true;
    let calls = 0;
    const saved: BpmUpdate[][] = [];
    const { deezerGet, fetchImpl } = fakeApis(
      { 'ISRC-J1': { bpm: 120, release_date: '2001-01-01' } },
      {},
    );

    const result = await enrichBpm({
      deezerGet: async (url) => {
        online = false;
        return deezerGet(url);
      },
      fetchImpl,
      // Bramka usypia, gdy sieci nie ma; tu sieć „wraca” przy pierwszym uśpieniu.
      sleep: async () => {
        online = true;
      },
      isOnline: () => online,
      loadPending: async () => {
        calls += 1;
        if (calls === 1) return [row('j1', 'ISRC-J1'), row('j2', 'ISRC-J2')];
        return [];
      },
      saveUpdates: async (updates) => {
        saved.push(updates);
      },
    });

    expect(saved).toEqual([[{ id: 'j1', bpm: 120, source: 'deezer', deezerYear: 2001 }]]);
    expect(result).toEqual({ processed: 1, resolved: 1 });
  });

  it('czeka na sieć, zanim sięgnie po porcję', async () => {
    let online = false;
    const loadPending = vi.fn(async () => {
      expect(online).toBe(true);
      return [];
    });

    await enrichBpm({
      isOnline: () => online,
      sleep: async () => {
        online = true;
      },
      loadPending,
    });

    expect(loadPending).toHaveBeenCalledTimes(1);
  });

  it('przerwana kolejka nie sięga do bazy po kolejną porcję', async () => {
    const loadPending = vi.fn(async () => []);

    const result = await enrichBpm({
      signal: { cancelled: true },
      loadPending,
      saveUpdates: async () => {},
      sleep: async () => {},
    });

    expect(loadPending).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
  });
});
