import { describe, expect, it } from 'vitest';
import { authorizeUrl, base64Url, challengeFromVerifier, randomVerifier } from '../src/auth/pkce';

describe('PKCE', () => {
  it('liczy code_challenge zgodnie z przykładem z RFC 7636', async () => {
    // Wektor testowy z dodatku B specyfikacji.
    await expect(
      challengeFromVerifier('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    ).resolves.toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('base64url nie ma znaków +, / ani dopełnienia', () => {
    const encoded = base64Url(new Uint8Array([251, 255, 191, 62, 63]));
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded).not.toContain('=');
  });

  it('verifier mieści się w limicie 43-128 znaków i jest za każdym razem inny', () => {
    const a = randomVerifier();
    const b = randomVerifier();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(a).not.toBe(b);
  });

  it('buduje adres logowania z wszystkimi parametrami', () => {
    const url = new URL(
      authorizeUrl({
        clientId: 'client-1',
        redirectUri: 'http://127.0.0.1:3000/callback',
        scopes: ['user-library-read', 'playlist-modify-private'],
        state: 'state-1',
        codeChallenge: 'challenge-1',
      }),
    );

    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'client-1',
      redirect_uri: 'http://127.0.0.1:3000/callback',
      scope: 'user-library-read playlist-modify-private',
      state: 'state-1',
      code_challenge_method: 'S256',
      code_challenge: 'challenge-1',
    });
  });
});
