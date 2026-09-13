/**
 * Które źródła utworów użytkownik wybrał do importu: polubione utwory
 * i/lub własne playlisty. Zapis w localStorage pod prefiksem aplikacji,
 * więc znika razem z resztą przy odmowie zgody; wylogowanie czyści go
 * osobno, bo kolejne konto ma inne playlisty.
 */

export type PlaylistRef = { id: string; name: string };

export type SourceSelection = {
  liked: boolean;
  playlists: PlaylistRef[];
};

const KEY = 'beatsift.sources';

/** Pierwsze wejście: zaznaczone tylko polubione, czyli to, co aplikacja robiła od zawsze. */
export const DEFAULT_SELECTION: SourceSelection = { liked: true, playlists: [] };

/** `null` znaczy „użytkownik jeszcze nie wybierał”, a nie „nic nie wybrał”. */
export function loadSelection(): SourceSelection | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? parseSelection(raw) : null;
  } catch {
    return null;
  }
}

export function saveSelection(selection: SourceSelection): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(selection));
  } catch {
    // Bez storage'u wybór nie przeżyje odświeżenia; ekran źródeł wróci sam.
  }
}

export function clearSelection(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Zablokowany storage: nie ma czego czyścić.
  }
}

export function isEmptySelection(selection: SourceSelection): boolean {
  return !selection.liked && selection.playlists.length === 0;
}

/** Uszkodzony albo obcy wpis traktujemy jak brak wyboru, nie jak awarię. */
export function parseSelection(raw: string): SourceSelection | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

    const liked: unknown = Reflect.get(parsed, 'liked');
    const playlists: unknown = Reflect.get(parsed, 'playlists');
    if (typeof liked !== 'boolean') return null;

    const refs: PlaylistRef[] = [];
    for (const entry of Array.isArray(playlists) ? playlists : []) {
      if (typeof entry !== 'object' || entry === null) continue;
      const id: unknown = Reflect.get(entry, 'id');
      const name: unknown = Reflect.get(entry, 'name');
      if (typeof id === 'string' && id && typeof name === 'string') refs.push({ id, name });
    }

    return { liked, playlists: refs };
  } catch {
    return null;
  }
}
