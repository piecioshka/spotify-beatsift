// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { exchangeCode, refreshTokens, SCOPES } from '../src/auth/spotifyAuth';
import { missingScopes, parseTokens, saveTokens } from '../src/auth/tokenStore';

function tokenEndpoint(body: unknown) {
  const fetchImpl: typeof fetch = async () => Response.json(body, { status: 200 });
  return fetchImpl;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('zakresy w tokenach', () => {
  it('czytanie playlist wymaga zakresów odczytu playlist', () => {
    expect(SCOPES).toContain('playlist-read-private');
    expect(SCOPES).toContain('playlist-read-collaborative');
  });

  it('exchangeCode zapisuje zakresy przyznane przez Spotify', async () => {
    const tokens = await exchangeCode(
      'c',
      'v',
      tokenEndpoint({
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600,
        scope: 'user-library-read playlist-modify-private',
      }),
    );

    expect(tokens.scopes).toEqual(['user-library-read', 'playlist-modify-private']);
  });

  it('refreshTokens zachowuje zakresy, gdy odpowiedź ich nie powtarza', async () => {
    await saveTokens({ accessToken: 'a', refreshToken: 'r', expiresAt: 1, scopes: SCOPES });

    const tokens = await refreshTokens(
      'r',
      tokenEndpoint({ access_token: 'a2', expires_in: 3600 }),
    );

    expect(tokens.scopes).toEqual(SCOPES);
  });

  it('refreshTokens bierze zakresy z odpowiedzi, gdy są', async () => {
    await saveTokens({ accessToken: 'a', refreshToken: 'r', expiresAt: 1, scopes: ['x'] });

    const tokens = await refreshTokens(
      'r',
      tokenEndpoint({ access_token: 'a2', expires_in: 3600, scope: 'y z' }),
    );

    expect(tokens.scopes).toEqual(['y', 'z']);
  });

  it('stary wpis bez pola scopes wczytuje się z pustą listą', () => {
    expect(
      parseTokens(JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: 1 })),
    ).toEqual({ accessToken: 'a', refreshToken: 'r', expiresAt: 1, scopes: [] });
  });

  it('missingScopes zwraca to, czego sesja nie ma z wymaganych', () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', expiresAt: 1, scopes: ['a', 'b'] };
    expect(missingScopes(tokens, ['a', 'b'])).toEqual([]);
    expect(missingScopes(tokens, ['a', 'c', 'd'])).toEqual(['c', 'd']);
  });
});
