import { describe, expect, it, vi } from 'vitest';
import { syncSources, type SourceProgress } from '../src/api/librarySync';

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
    expect(result).toEqual({ saved: 20, removed: 0, stoppedEarly: false });
    expect(h.deps.syncLiked.mock.calls[0][0]).toMatchObject({
      full: false,
      since: '2024-01-01T00:00:00Z',
    });
    expect(h.progress[0]).toMatchObject({ sourceIndex: 0, sourceCount: 3 });
    expect(h.progress.at(-1)).toMatchObject({ sourceIndex: 2, sourceName: 'Chill' });
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
