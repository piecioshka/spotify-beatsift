// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { completeSignIn, exchangeCode, refreshTokens } from '../src/auth/spotifyAuth';
import { loadTokens, parseTokens } from '../src/auth/tokenStore';

type Call = { url: string; body: URLSearchParams; headers: Record<string, string> };

/** Udaje endpoint tokenów Spotify i zapisuje, co do niego poszło. */
function tokenEndpoint(status: number, body: unknown) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    calls.push({ url: String(url), body: new URLSearchParams(String(init?.body)), headers });
    return Response.json(body, { status });
  };
  return { fetchImpl, calls };
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('exchangeCode', () => {
  it('wysyła kod, verifier i redirect_uri jako formularz, bez client secret', async () => {
    const { fetchImpl, calls } = tokenEndpoint(200, {
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      expires_in: 3600,
    });

    const tokens = await exchangeCode('code-1', 'verifier-1', fetchImpl);

    expect(calls[0].url).toBe('https://accounts.spotify.com/api/token');
    expect(calls[0].headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(calls[0].body)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'code-1',
      code_verifier: 'verifier-1',
      redirect_uri: `${window.location.origin}/callback`,
    });
    expect(calls[0].body.has('client_secret')).toBe(false);
    expect(tokens.accessToken).toBe('access-1');
    expect(tokens.refreshToken).toBe('refresh-1');
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
  });

  it('błąd Spotify zamienia na czytelny komunikat', async () => {
    const { fetchImpl } = tokenEndpoint(400, {
      error: 'invalid_grant',
      error_description: 'Invalid authorization code',
    });

    await expect(exchangeCode('zly', 'v', fetchImpl)).rejects.toThrow('Invalid authorization code');
  });

  it('brak refresh tokenu to błąd, bo bez niego sesja umrze po godzinie', async () => {
    const { fetchImpl } = tokenEndpoint(200, { access_token: 'a', expires_in: 3600 });

    await expect(exchangeCode('c', 'v', fetchImpl)).rejects.toThrow(/refresh token/);
  });
});

describe('refreshTokens', () => {
  it('zapisuje zrotowany refresh token', async () => {
    const { fetchImpl, calls } = tokenEndpoint(200, {
      access_token: 'access-2',
      refresh_token: 'refresh-2',
      expires_in: 3600,
    });

    const tokens = await refreshTokens('refresh-1', fetchImpl);

    expect(Object.fromEntries(calls[0].body)).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
    });
    expect(tokens.refreshToken).toBe('refresh-2');
    await expect(loadTokens()).resolves.toMatchObject({ refreshToken: 'refresh-2' });
  });

  it('gdy Spotify nie przysłało nowego refresh tokenu, zostaje stary', async () => {
    const { fetchImpl } = tokenEndpoint(200, { access_token: 'access-2', expires_in: 3600 });

    const tokens = await refreshTokens('refresh-1', fetchImpl);

    expect(tokens.refreshToken).toBe('refresh-1');
  });
});

describe('completeSignIn', () => {
  function pending(state: string) {
    window.sessionStorage.setItem(
      'beatsift.spotify.pkce',
      JSON.stringify({ verifier: 'verifier-1', state }),
    );
  }

  it('wymienia kod i zapisuje tokeny, gdy state się zgadza', async () => {
    pending('s1');
    const { fetchImpl, calls } = tokenEndpoint(200, {
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 3600,
    });

    const result = await completeSignIn(new URLSearchParams({ code: 'c', state: 's1' }), fetchImpl);

    expect(result.ok).toBe(true);
    expect(calls[0].body.get('code_verifier')).toBe('verifier-1');
    await expect(loadTokens()).resolves.toMatchObject({ accessToken: 'a' });
  });

  it('odrzuca powrót z obcym state', async () => {
    pending('s1');
    const { fetchImpl, calls } = tokenEndpoint(200, {});

    const result = await completeSignIn(
      new URLSearchParams({ code: 'c', state: 'inny' }),
      fetchImpl,
    );

    expect(result).toMatchObject({ ok: false, reason: 'error' });
    expect(calls).toHaveLength(0);
  });

  it('odmowa zgody to anulowanie, nie błąd', async () => {
    pending('s1');
    const { fetchImpl } = tokenEndpoint(200, {});

    const result = await completeSignIn(
      new URLSearchParams({ error: 'access_denied', state: 's1' }),
      fetchImpl,
    );

    expect(result).toEqual({ ok: false, reason: 'cancelled' });
  });

  it('verifier działa tylko raz', async () => {
    pending('s1');
    const { fetchImpl } = tokenEndpoint(200, {
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 3600,
    });
    const params = new URLSearchParams({ code: 'c', state: 's1' });

    await completeSignIn(params, fetchImpl);
    const second = await completeSignIn(params, fetchImpl);

    expect(second.ok).toBe(false);
  });
});

describe('parseTokens', () => {
  it('odrzuca uszkodzone i niepełne wpisy', () => {
    expect(parseTokens('nie json')).toBeNull();
    expect(parseTokens('null')).toBeNull();
    expect(parseTokens('[]')).toBeNull();
    expect(parseTokens(JSON.stringify({ accessToken: 'a' }))).toBeNull();
    expect(parseTokens(JSON.stringify({ accessToken: 'a', refreshToken: 'r' }))).toBeNull();
  });

  it('przepuszcza komplet pól', () => {
    expect(
      parseTokens(JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: 1 })),
    ).toEqual({ accessToken: 'a', refreshToken: 'r', expiresAt: 1 });
  });
});
