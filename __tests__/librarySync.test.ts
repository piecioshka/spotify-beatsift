import { describe, expect, it, vi } from 'vitest';
import { SourceSyncError, syncSources, type SourceProgress } from '../src/api/librarySync';
import { SpotifyApiError, SpotifyAuthError } from '../src/api/spotifyClient';

function harness(overrides: { cancelDuring?: string } = {}) {
  const calls: string[] = [];
  const seenAts = new Set<string>();
  const signal = { cancelled: false };
  const progress: SourceProgress[] = [];

  const deps = {
    syncLiked: vi.fn(async (options: { seenAt: string; full: boolean; since: string | null }) => {
      calls.push('liked');
      seenAts.add(options.seenAt);
      if (overrides.cancelDuring === 'liked') signal.cancelled = true;
      return { saved: 10, total: 10, stoppedEarly: signal.cancelled };
    }),
    syncPlaylist: vi.fn(async (options: { playlistId: string; seenAt: string }) => {
      calls.push(options.playlistId);
      seenAts.add(options.seenAt);
      if (overrides.cancelDuring === options.playlistId) signal.cancelled = true;
      return { saved: 5, total: 5, stoppedEarly: signal.cancelled };
    }),
    prune: vi.fn<(seenAt: string) => Promise<number>>(async () => 3),
    markFullSync: vi.fn<(seenAt: string) => Promise<void>>(async () => {}),
  };

  return { calls, seenAts, signal, progress, deps };
}

const selection = {
  liked: true,
  playlists: [
    { id: 'p1', name: 'Bieganie' },
    { id: 'p2', name: 'Chill' },
  ],
};

describe('syncSources', () => {
  it('idzie po źródłach po kolei ze wspólnym seenAt i liczy zapisane', async () => {
    const h = harness();

    const result = await syncSources({
      selection,
      since: '2024-01-01T00:00:00Z',
      onProgress: (p) => h.progress.push(p),
      deps: h.deps,
    });

    expect(h.calls).toEqual(['liked', 'p1', 'p2']);
    expect(h.seenAts.size).toBe(1);
    expect(result).toEqual({ saved: 20, removed: 0, stoppedEarly: false, skipped: [] });
    expect(h.deps.syncLiked.mock.calls[0][0]).toMatchObject({
      full: false,
      since: '2024-01-01T00:00:00Z',
    });
    expect(h.progress[0]).toMatchObject({ sourceIndex: 0, sourceCount: 3, savedSoFar: 0 });
    // Start trzeciego źródła: dwa poprzednie dały 10 + 5, bieżące jeszcze 0.
    expect(h.progress.at(-1)).toMatchObject({
      sourceIndex: 2,
      sourceName: 'Chill',
      savedSoFar: 15,
      totalSoFar: 15,
    });
  });

  it('bez polubionych pomija ich synchronizację', async () => {
    const h = harness();
    await syncSources({ selection: { ...selection, liked: false }, deps: h.deps });
    expect(h.calls).toEqual(['p1', 'p2']);
  });

  it('w trybie pełnym czyści na końcu to, czego nie widziało żadne źródło', async () => {
    const h = harness();

    const result = await syncSources({ selection, full: true, deps: h.deps });

    expect(h.deps.syncLiked.mock.calls[0][0]).toMatchObject({ full: true });
    expect(h.deps.prune).toHaveBeenCalledTimes(1);
    expect(h.deps.prune.mock.calls[0][0]).toBe([...h.seenAts][0]);
    expect(h.deps.markFullSync).toHaveBeenCalledWith([...h.seenAts][0]);
    expect(result.removed).toBe(3);
  });

  it('bez trybu pełnego nie czyści', async () => {
    const h = harness();
    await syncSources({ selection, deps: h.deps });
    expect(h.deps.prune).not.toHaveBeenCalled();
  });

  it('po anulowaniu nie rusza kolejnych źródeł ani nie czyści', async () => {
    const h = harness({ cancelDuring: 'p1' });

    const result = await syncSources({ selection, full: true, signal: h.signal, deps: h.deps });

    expect(h.calls).toEqual(['liked', 'p1']);
    expect(h.deps.prune).not.toHaveBeenCalled();
    expect(result.stoppedEarly).toBe(true);
  });
});

describe('syncSources: błędy źródeł', () => {
  it('pomija playlistę z 404, idzie dalej i wtedy nie czyści', async () => {
    const h = harness();
    h.deps.syncPlaylist.mockImplementationOnce(async () => {
      throw new SpotifyApiError(404, 'Resource not found', 'GET /playlists/p1/items');
    });

    const result = await syncSources({ selection, full: true, deps: h.deps });

    expect(h.deps.syncPlaylist).toHaveBeenCalledTimes(2);
    expect(result.skipped).toEqual([
      {
        name: 'Bieganie',
        status: 404,
        endpoint: 'GET /playlists/p1/items',
        message: 'Resource not found',
      },
    ]);
    expect(result.saved).toBe(15);
    expect(h.deps.prune).not.toHaveBeenCalled();
  });

  it('inny błąd przerywa przebieg i niesie nazwę źródła', async () => {
    const h = harness();
    const original = new SpotifyApiError(500, 'Server error', 'GET /playlists/p1/items');
    h.deps.syncPlaylist.mockImplementationOnce(async () => {
      throw original;
    });

    const failure = syncSources({ selection, deps: h.deps });

    await expect(failure).rejects.toBeInstanceOf(SourceSyncError);
    await expect(failure).rejects.toMatchObject({ sourceName: 'Bieganie', original });
    expect(h.calls).toEqual(['liked']);
  });

  it('404 polubionych nie jest pomijane, bo to nie usunięta playlista', async () => {
    const h = harness();
    h.deps.syncLiked.mockImplementationOnce(async () => {
      throw new SpotifyApiError(404, 'Resource not found', 'GET /me/tracks');
    });

    await expect(syncSources({ selection, deps: h.deps })).rejects.toBeInstanceOf(SourceSyncError);
  });

  it('błąd sesji przechodzi bez opakowania, żeby ekran wrócił do logowania', async () => {
    const h = harness();
    h.deps.syncLiked.mockImplementationOnce(async () => {
      throw new SpotifyAuthError();
    });

    await expect(syncSources({ selection, deps: h.deps })).rejects.toBeInstanceOf(SpotifyAuthError);
  });
});
