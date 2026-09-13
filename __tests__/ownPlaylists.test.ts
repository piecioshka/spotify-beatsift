import { describe, expect, it } from 'vitest';
import { fetchLikedCount } from '../src/api/likedTracks';
import { fetchOwnPlaylists } from '../src/api/playlists';

/** Udaje `requestPages`: oddaje kolejne strony i zapisuje, o co pytano. */
function pagedClient<T>(pages: T[][]) {
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
        const shouldStop = await onPage(page as unknown as Item[], total);
        if (shouldStop === false) break;
      }
      return seen;
    },
  };
}

describe('fetchOwnPlaylists', () => {
  it('zostawia własne i współtworzone, odrzuca obserwowane cudze', async () => {
    const client = pagedClient([
      [
        { id: 'p1', name: 'Moja', owner: { id: 'me' }, collaborative: false, items: { total: 12 } },
        {
          id: 'p2',
          name: 'Cudza',
          owner: { id: 'ktos' },
          collaborative: false,
          items: { total: 3 },
        },
      ],
      [
        {
          id: 'p3',
          name: 'Wspólna',
          owner: { id: 'ktos' },
          collaborative: true,
          tracks: { total: 8 },
        },
      ],
    ]);

    const playlists = await fetchOwnPlaylists('me', client);

    expect(client.paths).toEqual(['/me/playlists?limit=50']);
    expect(playlists).toEqual([
      { id: 'p1', name: 'Moja', total: 12, collaborative: false },
      { id: 'p3', name: 'Wspólna', total: 8, collaborative: true },
    ]);
  });

  it('playlista bez licznika dostaje 0, a bez nazwy swoje id', async () => {
    const client = pagedClient([[{ id: 'p9', owner: { id: 'me' } }]]);
    expect(await fetchOwnPlaylists('me', client)).toEqual([
      { id: 'p9', name: 'p9', total: 0, collaborative: false },
    ]);
  });
});

describe('fetchLikedCount', () => {
  it('bierze total z pierwszej strony o rozmiarze 1', async () => {
    const paths: string[] = [];
    const client = {
      request: async <T>(path: string): Promise<T> => {
        paths.push(path);
        return { items: [], next: null, total: 4321 } as unknown as T;
      },
    };

    expect(await fetchLikedCount(client)).toBe(4321);
    expect(paths).toEqual(['/me/tracks?limit=1']);
  });
});
