import { useSyncExternalStore } from 'react';
import { clearTokens } from '../auth/tokenStore';
import { resetDatabase } from '../db/schema';

/**
 * Zgoda na trzymanie danych w przeglądarce. Aplikacja nie ma ciasteczek
 * ani śledzenia, ale zapisuje tokeny Spotify, bibliotekę i preferencje
 * w localStorage i IndexedDB, więc pytamy zanim cokolwiek zapiszemy.
 *
 * Akceptacja zostaje w localStorage (sam zapis decyzji jest dozwolony).
 * Odmowa czyści wszystko, co aplikacja zapisała, i żyje tylko w pamięci
 * strony: po odświeżeniu pasek wraca, bo nie ma już nic do chronienia,
 * a odmowy celowo nigdzie nie zapisujemy.
 */

export type Consent = 'accepted' | 'rejected' | null;

const KEY = 'beatsift.consent';

/** Prefiks wszystkich kluczy aplikacji w localStorage. */
const APP_PREFIX = 'beatsift.';

let rejected = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getConsent(): Consent {
  if (rejected) return 'rejected';
  try {
    if (window.localStorage.getItem(KEY) === 'accepted') return 'accepted';
  } catch {
    // Zablokowany storage: traktujemy jak brak decyzji.
  }
  return null;
}

export function acceptConsent(): void {
  rejected = false;
  try {
    window.localStorage.setItem(KEY, 'accepted');
  } catch {
    // Bez storage'u aplikacja i tak nie zadziała; ekran logowania to powie.
  }
  notify();
}

/** Odmowa kasuje wszystko, co zapisaliśmy, także wcześniejszą akceptację. */
export async function rejectConsent(): Promise<void> {
  await wipeAllData();
  rejected = true;
  notify();
}

/**
 * Usuwa wszystko, co aplikacja zapisała w przeglądarce: tokeny, bibliotekę
 * i preferencje. Poza odmową zgody korzysta z tego ekran awaryjny, gdy
 * uszkodzone dane nie pozwalają aplikacji wystartować.
 */
export async function wipeAllData(): Promise<void> {
  await clearTokens();
  await resetDatabase();
  clearAppStorage();
}

/** Usuwa klucze aplikacji z localStorage, zostawiając cudze wpisy w spokoju. */
export function clearAppStorage(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(APP_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // Zablokowany storage: nie ma czego czyścić.
  }
}

/** Komponent renderuje się ponownie po każdej zmianie decyzji. */
export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, getConsent, getConsent);
}
