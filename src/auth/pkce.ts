/**
 * Kawałki Authorization Code z PKCE, które da się sprawdzić bez przeglądarki:
 * losowy `code_verifier`, jego skrót na `code_challenge` i adres logowania.
 * Web Crypto jest i w przeglądarce, i w Node, więc testy nie potrzebują atrap.
 */

/** Zapis base64url bez dopełnienia, dokładnie tak, jak wymaga RFC 7636. */
export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Losowy ciąg z bezpiecznego generatora. 64 bajty dają 86 znaków, w limicie 43-128. */
export function randomVerifier(bytes = 64): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** `code_challenge` metodą S256: SHA-256 z verifiera zapisany jako base64url. */
export async function challengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export type AuthorizeParams = {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
};

export const AUTHORIZE_ENDPOINT = 'https://accounts.spotify.com/authorize';
export const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

export function authorizeUrl(params: AuthorizeParams): string {
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: params.scopes.join(' '),
    state: params.state,
    code_challenge_method: 'S256',
    code_challenge: params.codeChallenge,
  }).toString();
  return url.toString();
}
