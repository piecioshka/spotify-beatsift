import { spotify } from './spotifyClient';

/** Tyle z konta Spotify, ile pokazuje nagłówek: kto jest zalogowany i gdzie ma profil. */
export type SpotifyProfile = {
  id: string;
  /** Spotify pozwala na konto bez nazwy wyświetlanej; wtedy zostaje `id`. */
  displayName: string | null;
  url: string | null;
};

const KEY = 'beatsift.spotify.profile';

type MeResponse = {
  id?: unknown;
  display_name?: unknown;
  external_urls?: { spotify?: unknown };
};

/**
 * `GET /me` bez dodatkowych zakresów oddaje id, nazwę wyświetlaną i linki;
 * zakresów wymagają dopiero e-mail, kraj i rodzaj subskrypcji, których
 * nie czytamy.
 */
export async function fetchProfile(
  client: Pick<typeof spotify, 'request'> = spotify,
): Promise<SpotifyProfile> {
  const me = await client.request<MeResponse>('/me');
  if (typeof me.id !== 'string' || me.id.length === 0) {
    throw new Error('Spotify nie oddało id użytkownika.');
  }

  const displayName = typeof me.display_name === 'string' ? me.display_name.trim() : '';
  const url = me.external_urls?.spotify;

  return {
    id: me.id,
    displayName: displayName.length > 0 ? displayName : null,
    url: typeof url === 'string' && url.length > 0 ? url : null,
  };
}

/**
 * Profil zmienia się rzadko, a nagłówek renderuje się na każdym ekranie,
 * więc trzymamy go w localStorage pod prefiksem aplikacji: znika razem
 * z resztą przy odmowie zgody, a osobno przy wylogowaniu.
 */
export function loadCachedProfile(): SpotifyProfile | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? parseProfile(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: SpotifyProfile): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Bez storage'u profil po prostu pobierze się przy następnym wejściu.
  }
}

export function clearProfile(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Zablokowany storage: nie ma czego czyścić.
  }
}

/** Uszkodzony albo obcy wpis traktujemy jak brak profilu, nie jak awarię. */
export function parseProfile(raw: string): SpotifyProfile | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

    const id: unknown = Reflect.get(parsed, 'id');
    const displayName: unknown = Reflect.get(parsed, 'displayName');
    const url: unknown = Reflect.get(parsed, 'url');
    if (typeof id !== 'string' || id.length === 0) return null;

    return {
      id,
      displayName: typeof displayName === 'string' ? displayName : null,
      url: typeof url === 'string' ? url : null,
    };
  } catch {
    return null;
  }
}
