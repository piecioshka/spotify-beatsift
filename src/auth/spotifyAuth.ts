import { redirectUri, SPOTIFY_CLIENT_ID } from '../config';
import { authorizeUrl, challengeFromVerifier, randomVerifier, TOKEN_ENDPOINT } from './pkce';
import {
  expiresAtFrom,
  loadTokens,
  parseScopeField,
  saveTokens,
  type StoredTokens,
} from './tokenStore';
import { t } from '../i18n';

/**
 * Tylko to, czego naprawdę potrzebujemy: odczyt polubionych utworów, odczyt
 * własnych i współtworzonych playlist (także prywatnych) oraz tworzenie
 * prywatnej playlisty. Każdy dodatkowy zakres to kolejna pozycja na ekranie
 * zgody, której użytkownik nie rozumie.
 */
export const SCOPES = [
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
];

/** Verifier i state czekają w sessionStorage na powrót ze strony Spotify. */
const PENDING_KEY = 'beatsift.spotify.pkce';

type Pending = { verifier: string; state: string };

export type SignInResult =
  | { ok: true; tokens: StoredTokens }
  | { ok: false; reason: 'cancelled' | 'error'; message?: string };

/**
 * Pierwsza połowa logowania: zapamiętuje verifier i przekierowuje całą kartę
 * na stronę zgody Spotify. Druga połowa dzieje się w `completeSignIn`,
 * już pod adresem `/callback`.
 */
export async function startSignIn(): Promise<void> {
  const pending: Pending = { verifier: randomVerifier(), state: randomVerifier(16) };
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  window.location.assign(
    authorizeUrl({
      clientId: SPOTIFY_CLIENT_ID,
      redirectUri: redirectUri(),
      scopes: SCOPES,
      state: pending.state,
      codeChallenge: await challengeFromVerifier(pending.verifier),
    }),
  );
}

/**
 * Druga połowa logowania: sprawdza `state`, wymienia `code` na tokeny
 * i zapisuje je. Verifier znika z sessionStorage niezależnie od wyniku,
 * bo do jednego logowania pasuje dokładnie raz.
 */
export async function completeSignIn(
  search: URLSearchParams,
  fetchImpl: typeof fetch = fetch,
): Promise<SignInResult> {
  const pending = readPending();
  window.sessionStorage.removeItem(PENDING_KEY);

  const error = search.get('error');
  if (error) {
    return error === 'access_denied'
      ? { ok: false, reason: 'cancelled' }
      : { ok: false, reason: 'error', message: error };
  }

  const code = search.get('code');
  if (!pending || !code || search.get('state') !== pending.state) {
    return {
      ok: false,
      reason: 'error',
      message: t('error.auth.mismatch'),
    };
  }

  try {
    const tokens = await exchangeCode(code, pending.verifier, fetchImpl);
    await saveTokens(tokens);
    return { ok: true, tokens };
  } catch (err) {
    return { ok: false, reason: 'error', message: describeError(err) };
  }
}

function readPending(): Pending | null {
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Pending>;
    if (typeof parsed.verifier !== 'string' || typeof parsed.state !== 'string') return null;
    return { verifier: parsed.verifier, state: parsed.state };
  } catch {
    return null;
  }
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

/** Wymiana kodu na tokeny. Bez client secret, bo PKCE go zastępuje. */
export async function exchangeCode(
  code: string,
  codeVerifier: string,
  fetchImpl: typeof fetch = fetch,
): Promise<StoredTokens> {
  const body = await postToken(
    {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      client_id: SPOTIFY_CLIENT_ID,
      code_verifier: codeVerifier,
    },
    fetchImpl,
  );

  if (!body.access_token) throw new Error(t('error.auth.noAccessToken'));
  if (!body.refresh_token) throw new Error(t('error.auth.noRefreshToken'));

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: expiresAtFrom(body.expires_in ?? 3600),
    // Bez pola `scope` zakładamy, że Spotify przyznało to, o co prosiliśmy.
    scopes: parseScopeField(body.scope) ?? [...SCOPES],
  };
}

/**
 * Odświeża access token.
 *
 * Uwaga: Spotify przy PKCE rotuje refresh tokeny, więc odpowiedź potrafi
 * zawierać nowy. Kto go nie zapisze, ten po kilku dniach wylatuje z sesji
 * bez powodu. Gdy Spotify nie przysłało nowego, zostajemy przy starym.
 */
export async function refreshTokens(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<StoredTokens> {
  const body = await postToken(
    { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: SPOTIFY_CLIENT_ID },
    fetchImpl,
  );

  if (!body.access_token) throw new Error(t('error.auth.noAccessToken'));

  // Odświeżenie nie zmienia zakresów; gdy odpowiedź ich nie powtarza,
  // zostają te z poprzedniego wpisu.
  const previous = await loadTokens();
  const tokens: StoredTokens = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? refreshToken,
    expiresAt: expiresAtFrom(body.expires_in ?? 3600),
    scopes: parseScopeField(body.scope) ?? previous?.scopes ?? [],
  };
  await saveTokens(tokens);
  return tokens;
}

async function postToken(
  params: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<TokenResponse> {
  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });

  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok) {
    throw new Error(
      body.error_description ??
        body.error ??
        t('error.spotify.status', { status: response.status }),
    );
  }
  return body;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
