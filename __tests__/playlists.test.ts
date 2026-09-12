import { describe, expect, it } from 'vitest';
import {
  ADD_TRACKS_BATCH,
  createPlaylistWithTracks,
  defaultPlaylistName,
  trackUri,
} from '../src/api/playlists';
import type { RequestOptions } from '../src/api/spotifyClient';

describe('defaultPlaylistName', () => {
  it('skleja oba zakresy', () => {
    expect(defaultPlaylistName({ bpmMin: 120, bpmMax: 130, yearMin: 2000, yearMax: 2010 })).toBe(
      'BPM 120-130 · 2000-2010',
    );
  });

  it('pojedynczą wartość pokazuje bez myślnika', () => {
    expect(defaultPlaylistName({ bpmMin: 128, bpmMax: 128, yearMin: 1999, yearMax: 1999 })).toBe(
      'BPM 128 · 1999',
    );
  });
});

describe('trackUri', () => {
  it('składa URI w formacie, którego oczekuje Spotify', () => {
    expect(trackUri('4Dvkj6JhhA12EX05fT7y2e')).toBe('spotify:track:4Dvkj6JhhA12EX05fT7y2e');
  });
});

type PlaylistBody = { name?: string; public?: boolean; uris?: string[] };

/** Treść żądania interesuje testy tylko przez trzy pola, więc tylko te wyciągamy. */
function bodyOf(body: unknown): PlaylistBody | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const name: unknown = Reflect.get(body, 'name');
  const isPublic: unknown = Reflect.get(body, 'public');
  const uris: unknown = Reflect.get(body, 'uris');
  return {
    ...(typeof name === 'string' ? { name } : {}),
    ...(typeof isPublic === 'boolean' ? { public: isPublic } : {}),
    ...(Array.isArray(uris) ? { uris: uris.map(String) } : {}),
  };
}

/** Zbiera żądania, udając odpowiedzi Spotify. */
function fakeClient() {
  const calls: Array<{ path: string; method?: string; body?: PlaylistBody }> = [];

  const respond = (path: string): unknown => {
    if (path === '/me') return { id: 'piecioshka' };
    if (path.endsWith('/playlists')) {
      return { id: 'pl-1', external_urls: { spotify: 'https://open.spotify.com/playlist/pl-1' } };
    }
    return undefined;
  };

  // Prawdziwy klient jest generyczny po typie odpowiedzi; atrapa oddaje
  // przygotowane obiekty, więc rzutowanie na T jest tu nie do uniknięcia.
  const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    calls.push({ path, method: options.method, body: bodyOf(options.body) });
    return respond(path) as T;
  };

  return { client: { request }, calls };
}

describe('createPlaylistWithTracks', () => {
  it('pyta o ID użytkownika, tworzy prywatną playlistę i dodaje utwory', async () => {
    const { client, calls } = fakeClient();

    const result = await createPlaylistWithTracks('Moja lista', ['a', 'b'], client);

    expect(calls[0].path).toBe('/me');
    expect(calls[1]).toMatchObject({
      path: '/users/piecioshka/playlists',
      method: 'POST',
      body: { name: 'Moja lista', public: false },
    });
    expect(calls[2]).toMatchObject({
      path: '/playlists/pl-1/tracks',
      body: { uris: ['spotify:track:a', 'spotify:track:b'] },
    });
    expect(result).toMatchObject({ id: 'pl-1', added: 2 });
  });

  it('dzieli na paczki po 100, bo tyle wynosi limit Spotify', async () => {
    const { client, calls } = fakeClient();
    const ids = Array.from({ length: 250 }, (_, i) => `t${i}`);

    const result = await createPlaylistWithTracks('Duża', ids, client);

    const addCalls = calls.filter((call) => call.path.endsWith('/tracks'));
    expect(addCalls).toHaveLength(3);
    expect(addCalls[0].body?.uris).toHaveLength(ADD_TRACKS_BATCH);
    expect(addCalls[2].body?.uris).toHaveLength(50);
    expect(result.added).toBe(250);
  });

  it('pusta lista tworzy playlistę, ale nie wysyła żądania dodania', async () => {
    const { client, calls } = fakeClient();

    const result = await createPlaylistWithTracks('Pusta', [], client);

    expect(calls.some((call) => call.path.endsWith('/tracks'))).toBe(false);
    expect(result.added).toBe(0);
  });

  it('pusta nazwa dostaje wartość zastępczą', async () => {
    const { client, calls } = fakeClient();

    await createPlaylistWithTracks('   ', ['a'], client);

    expect(calls[1].body?.name).toBe('Beatsift');
  });

  it('przycina zbyt długą nazwę do limitu Spotify', async () => {
    const { client, calls } = fakeClient();

    await createPlaylistWithTracks('x'.repeat(150), ['a'], client);

    expect(calls[1].body?.name).toHaveLength(100);
  });
});
