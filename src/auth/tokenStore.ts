const KEY = 'beatsift.spotify.tokens';

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  /** Znacznik czasu w ms, kiedy access token przestaje być ważny. */
  expiresAt: number;
  /**
   * Zakresy przyznane przy logowaniu. Gdy aplikacja zacznie wymagać nowego,
   * stara sesja go nie ma i trzeba poprosić o zgodę jeszcze raz.
   */
  scopes: string[];
};

/**
 * Margines, o który skracamy ważność access tokenu. Dzięki niemu nie wysyłamy
 * żądania sekundę przed wygaśnięciem i nie zbieramy niepotrzebnego 401.
 */
const EXPIRY_SKEW_MS = 60_000;

/**
 * Tokeny leżą w localStorage. Dla narzędzia na własny użytek to wystarcza:
 * Client ID przy PKCE nie jest sekretem, a token daje dostęp tylko do ulubionych
 * i prywatnych playlist zalogowanego konta. Interfejs zostaje asynchroniczny,
 * żeby klient Spotify nie musiał wiedzieć, skąd tokeny pochodzą.
 */
export async function saveTokens(tokens: StoredTokens): Promise<void> {
  window.localStorage.setItem(KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  return parseTokens(raw);
}

export async function clearTokens(): Promise<void> {
  window.localStorage.removeItem(KEY);
}

/** Uszkodzony wpis traktujemy jak brak sesji, zamiast wywracać całą aplikację. */
export function parseTokens(raw: string): StoredTokens | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { accessToken, refreshToken, expiresAt, scopes } = parsed as Partial<StoredTokens>;
    if (typeof accessToken !== 'string' || !accessToken) return null;
    if (typeof refreshToken !== 'string' || !refreshToken) return null;
    if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return null;

    // Wpisy sprzed wprowadzenia pola: pusta lista, czyli „nie wiemy, co przyznano”,
    // a to dla `missingScopes` znaczy tyle samo, co brak wszystkiego.
    const knownScopes = Array.isArray(scopes)
      ? scopes.filter((scope): scope is string => typeof scope === 'string')
      : [];

    return { accessToken, refreshToken, expiresAt, scopes: knownScopes };
  } catch {
    return null;
  }
}

export function isExpired(tokens: StoredTokens, now = Date.now()): boolean {
  return now >= tokens.expiresAt - EXPIRY_SKEW_MS;
}

/** Zamienia `expires_in` w sekundach na bezwzględny znacznik czasu. */
export function expiresAtFrom(expiresInSeconds: number, now = Date.now()): number {
  return now + expiresInSeconds * 1000;
}

/** Wymagane zakresy, których zapisana sesja nie ma. Pusta lista = sesja aktualna. */
export function missingScopes(tokens: StoredTokens, required: readonly string[]): string[] {
  return required.filter((scope) => !tokens.scopes.includes(scope));
}

/** Pole `scope` z odpowiedzi Spotify to lista rozdzielona spacjami. */
export function parseScopeField(scope: unknown): string[] | null {
  if (typeof scope !== 'string') return null;
  return scope.split(/\s+/).filter(Boolean);
}
