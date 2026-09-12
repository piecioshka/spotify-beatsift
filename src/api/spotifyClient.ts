import { refreshTokens } from '../auth/spotifyAuth';
import { clearTokens, isExpired, loadTokens, type StoredTokens } from '../auth/tokenStore';
import { t } from '../i18n';

export const SPOTIFY_API = 'https://api.spotify.com/v1';

/** Sesja się skończyła i nie da się jej odzyskać. Ekran ma wrócić do logowania. */
export class SpotifyAuthError extends Error {
  constructor(message = t('error.spotify.sessionExpired')) {
    super(message);
    this.name = 'SpotifyAuthError';
  }
}

/** Spotify odpowiedziało błędem, którego nie umiemy naprawić ponowieniem. */
export class SpotifyApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SpotifyApiError';
  }
}

export type Deps = {
  loadTokens: () => Promise<StoredTokens | null>;
  refreshTokens: (refreshToken: string) => Promise<StoredTokens>;
  clearTokens: () => Promise<void>;
  fetchImpl: typeof fetch;
  sleep: (ms: number) => Promise<void>;
};

const defaultDeps: Deps = {
  loadTokens,
  refreshTokens,
  clearTokens,
  fetchImpl: (...args) => fetch(...args),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Ile razy najwyżej ponawiamy po 429 albo błędzie serwera, zanim odpuścimy. */
const MAX_RETRIES = 3;

/** Gdy Spotify nie poda Retry-After, czekamy tyle sekund. */
const FALLBACK_RETRY_SECONDS = 2;

export type RequestOptions = {
  method?: string;
  body?: unknown;
  /** Pełny URL zamiast ścieżki. Używane przy paginacji, bo `next` przychodzi gotowy. */
  absoluteUrl?: string;
};

export function createSpotifyClient(deps: Partial<Deps> = {}) {
  const d: Deps = { ...defaultDeps, ...deps };

  async function accessToken(forceRefresh = false): Promise<string> {
    const tokens = await d.loadTokens();
    if (!tokens) throw new SpotifyAuthError();

    if (!forceRefresh && !isExpired(tokens)) return tokens.accessToken;

    try {
      const fresh = await d.refreshTokens(tokens.refreshToken);
      return fresh.accessToken;
    } catch {
      // Refresh token też padł, więc nie ma czego ratować.
      await d.clearTokens();
      throw new SpotifyAuthError();
    }
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = options.absoluteUrl ?? `${SPOTIFY_API}${path}`;
    let refreshed = false;

    for (let attempt = 0; ; attempt += 1) {
      const token = await accessToken(refreshed);

      const response = await d.fetchImpl(url, {
        method: options.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });

      // Token wygasł wcześniej, niż wynikało z expires_in. Odświeżamy raz.
      if (response.status === 401 && !refreshed) {
        refreshed = true;
        continue;
      }
      if (response.status === 401) {
        await d.clearTokens();
        throw new SpotifyAuthError();
      }

      // 403 to brak uprawnień albo konto spoza listy w trybie deweloperskim.
      // Ponawianie nic tu nie da.
      if (response.status === 403) {
        throw new SpotifyApiError(403, await errorMessage(response, t('error.spotify.forbidden')));
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt >= MAX_RETRIES) {
          throw new SpotifyApiError(
            response.status,
            await errorMessage(response, t('error.spotify.unavailable')),
          );
        }
        await d.sleep(retryDelayMs(response, attempt));
        continue;
      }

      if (!response.ok) {
        throw new SpotifyApiError(
          response.status,
          await errorMessage(response, t('error.spotify.generic')),
        );
      }

      return (await readJson<T>(response)) as T;
    }
  }

  /**
   * Przechodzi stronicowaną kolekcję po polu `next`, oddając każdą stronę
   * od razu. Dzięki temu ekran postępu rusza, zanim spłynie całość.
   *
   * Zwrócenie `false` z `onPage` przerywa przechodzenie. Korzysta z tego
   * synchronizacja przyrostowa, która zatrzymuje się na już znanych utworach.
   */
  async function requestPages<Item>(
    firstPath: string,
    onPage: (items: Item[], total: number) => Promise<boolean | void> | boolean | void,
  ): Promise<number> {
    let url: string | null = `${SPOTIFY_API}${firstPath}`;
    let seen = 0;

    while (url) {
      const page: { items: Item[]; next: string | null; total: number } = await request('', {
        absoluteUrl: url,
      });
      seen += page.items.length;
      const shouldStop = await onPage(page.items, page.total);
      if (shouldStop === false) break;
      url = page.next;
    }

    return seen;
  }

  return { request, requestPages };
}

/** Czas oczekiwania po 429: słuchamy Retry-After, w razie braku rośniemy wykładniczo. */
export function retryDelayMs(response: { headers: Headers }, attempt: number): number {
  const header = response.headers?.get?.('Retry-After');
  const seconds = header ? Number(header) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  return FALLBACK_RETRY_SECONDS * 1000 * 2 ** attempt;
}

async function readJson<T>(response: Response): Promise<T | undefined> {
  // 201 przy tworzeniu playlisty ma treść, 204 przy dodawaniu utworów już nie.
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  return JSON.parse(text) as T;
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export const spotify = createSpotifyClient();
