// @vitest-environment jsdom
import { describe, expect, it, vi, type Mock } from 'vitest';
import {
  createSpotifyClient,
  retryDelayMs,
  SpotifyApiError,
  SpotifyAuthError,
  type Deps,
} from '../src/api/spotifyClient';
import { SCOPES } from '../src/auth/spotifyAuth';
import { consumeReconsentFlag, type StoredTokens } from '../src/auth/tokenStore';

const HOUR = 3600_000;

function tokens(overrides: Partial<StoredTokens> = {}): StoredTokens {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresAt: Date.now() + HOUR,
    scopes: [...SCOPES],
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

function harness(responses: Response[], overrides: Partial<Deps> = {}) {
  const stored = { current: tokens() };
  const slept: number[] = [];
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  const deps: Partial<Deps> = {
    loadTokens: vi.fn(async () => stored.current),
    refreshTokens: vi.fn(async (refreshToken: string) => {
      // Spotify przy PKCE rotuje refresh tokeny.
      stored.current = {
        accessToken: `access-after-${refreshToken}`,
        refreshToken: `${refreshToken}-rotated`,
        expiresAt: Date.now() + HOUR,
        scopes: [...SCOPES],
      };
      return stored.current;
    }),
    clearTokens: vi.fn(async () => {}),
    fetchImpl: vi.fn<typeof fetch>(async (url, init) => {
      calls.push({ url: String(url), init });
      const next = responses.shift();
      if (!next) throw new Error('Za mało przygotowanych odpowiedzi.');
      return next;
    }),
    sleep: vi.fn(async (ms: number) => {
      slept.push(ms);
    }),
    ...overrides,
  };

  return { client: createSpotifyClient(deps), deps, stored, slept, calls };
}

function authHeader(init?: RequestInit): string {
  return (init?.headers as Record<string, string>)?.Authorization ?? '';
}

describe('spotifyClient', () => {
  it('dokłada nagłówek Bearer i oddaje sparsowany JSON', async () => {
    const { client, calls } = harness([jsonResponse(200, { id: 'piecioshka' })]);

    await expect(client.request('/me')).resolves.toEqual({ id: 'piecioshka' });
    expect(calls[0].url).toBe('https://api.spotify.com/v1/me');
    expect(authHeader(calls[0].init)).toBe('Bearer access-1');
  });

  it('odświeża token przed żądaniem, gdy zapisany już wygasł', async () => {
    const { client, deps, calls } = harness([jsonResponse(200, { id: 'x' })]);
    (deps.loadTokens as Mock).mockResolvedValueOnce(tokens({ expiresAt: Date.now() - 1000 }));

    await client.request('/me');

    expect(deps.refreshTokens).toHaveBeenCalledWith('refresh-1');
    expect(authHeader(calls[0].init)).toBe('Bearer access-after-refresh-1');
  });

  it('po 401 odświeża token raz i ponawia żądanie', async () => {
    const { client, calls, deps } = harness([
      jsonResponse(401, { error: { message: 'expired' } }),
      jsonResponse(200, { id: 'x' }),
    ]);

    await expect(client.request('/me')).resolves.toEqual({ id: 'x' });
    expect(deps.refreshTokens).toHaveBeenCalledTimes(1);
    expect(authHeader(calls[0].init)).toBe('Bearer access-1');
    expect(authHeader(calls[1].init)).toBe('Bearer access-after-refresh-1');
  });

  it('zapisuje zrotowany refresh token, żeby sesja nie wygasła po kilku dniach', async () => {
    const { client, stored } = harness([
      jsonResponse(401, { error: { message: 'expired' } }),
      jsonResponse(200, {}),
    ]);

    await client.request('/me');

    expect(stored.current.refreshToken).toBe('refresh-1-rotated');
  });

  it('po drugim 401 czyści sesję i zgłasza SpotifyAuthError', async () => {
    const { client, deps } = harness([jsonResponse(401, {}), jsonResponse(401, {})]);

    await expect(client.request('/me')).rejects.toBeInstanceOf(SpotifyAuthError);
    expect(deps.clearTokens).toHaveBeenCalled();
  });

  it('na 403 nie ponawia, bo to konto spoza listy w trybie deweloperskim', async () => {
    const { client, calls } = harness([
      jsonResponse(403, { error: { message: 'User not registered' } }),
    ]);

    await expect(client.request('/me')).rejects.toMatchObject({
      status: 403,
      message: 'User not registered',
    });
    expect(calls).toHaveLength(1);
  });

  it('na 429 czeka tyle, ile każe Retry-After, i ponawia', async () => {
    const { client, slept } = harness([
      jsonResponse(429, {}, { 'Retry-After': '7' }),
      jsonResponse(200, { ok: true }),
    ]);

    await expect(client.request('/me')).resolves.toEqual({ ok: true });
    expect(slept).toEqual([7000]);
  });

  it('poddaje się po wyczerpaniu ponowień', async () => {
    const { client } = harness([
      jsonResponse(500, {}),
      jsonResponse(500, {}),
      jsonResponse(500, {}),
      jsonResponse(500, {}),
    ]);

    await expect(client.request('/me')).rejects.toBeInstanceOf(SpotifyApiError);
  });

  it('zwraca undefined przy 204, bo dodanie utworów nie ma treści', async () => {
    const { client } = harness([jsonResponse(204, undefined)]);

    await expect(client.request('/playlists/1/tracks')).resolves.toBeUndefined();
  });

  it('sesja bez wymaganego zakresu jest kasowana i kończy się SpotifyAuthError', async () => {
    const { client, deps, calls } = harness([], {
      loadTokens: vi.fn(async () => tokens({ scopes: ['user-library-read'] })),
    });

    await expect(client.request('/me/playlists')).rejects.toBeInstanceOf(SpotifyAuthError);
    expect(deps.clearTokens).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0);
    // Ekran logowania ma wiedzieć, że chodzi o nową zgodę, nie o zwykłe wygaśnięcie.
    expect(consumeReconsentFlag()).toBe(true);
    expect(consumeReconsentFlag()).toBe(false);
  });

  it('403 „Insufficient client scope” traktuje jak brak zgody, nie jak zwykły 403', async () => {
    const { client, deps } = harness([
      jsonResponse(403, { error: { status: 403, message: 'Insufficient client scope' } }),
    ]);

    await expect(client.request('/me/playlists')).rejects.toBeInstanceOf(SpotifyAuthError);
    expect(deps.clearTokens).toHaveBeenCalledTimes(1);
    expect(consumeReconsentFlag()).toBe(true);
  });

  it('bez zapisanych tokenów od razu zgłasza SpotifyAuthError', async () => {
    const { client } = harness([], { loadTokens: async () => null });

    await expect(client.request('/me')).rejects.toBeInstanceOf(SpotifyAuthError);
  });
});

describe('requestPages', () => {
  it('przechodzi po polu next i oddaje każdą stronę osobno', async () => {
    const { client } = harness([
      jsonResponse(200, {
        items: [1, 2],
        next: 'https://api.spotify.com/v1/me/tracks?offset=2',
        total: 3,
      }),
      jsonResponse(200, { items: [3], next: null, total: 3 }),
    ]);

    const pages: number[][] = [];
    const seen = await client.requestPages<number>('/me/tracks', (items) => {
      pages.push(items);
    });

    expect(pages).toEqual([[1, 2], [3]]);
    expect(seen).toBe(3);
  });

  it('przerywa, gdy callback zwróci false', async () => {
    const { client, calls } = harness([
      jsonResponse(200, {
        items: [1],
        next: 'https://api.spotify.com/v1/me/tracks?offset=1',
        total: 9,
      }),
    ]);

    const seen = await client.requestPages<number>('/me/tracks', () => false);

    expect(seen).toBe(1);
    expect(calls).toHaveLength(1);
  });
});

describe('retryDelayMs', () => {
  it('czyta Retry-After w sekundach', () => {
    expect(retryDelayMs({ headers: new Headers({ 'Retry-After': '3' }) }, 0)).toBe(3000);
  });

  it('bez nagłówka rośnie wykładniczo', () => {
    const headers = new Headers();
    expect(retryDelayMs({ headers }, 0)).toBe(2000);
    expect(retryDelayMs({ headers }, 1)).toBe(4000);
    expect(retryDelayMs({ headers }, 2)).toBe(8000);
  });
});
