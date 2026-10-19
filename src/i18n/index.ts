import { useSyncExternalStore } from 'react';
import { en, pl, type MessageKey, type Messages } from './messages';

/**
 * Bieżący język żyje poza Reactem, bo komunikaty błędów powstają też
 * w modułach bez komponentów (klient Spotify, Deezer, odtwarzacz).
 * Komponenty subskrybują zmiany przez `useLanguage`, moduły wołają `t`.
 */

export type Language = 'pl' | 'en';

export const DEFAULT_LANGUAGE: Language = 'en';

const STORAGE_KEY = 'beatsift.language';

const DICTIONARIES: Record<Language, Messages> = { pl, en };

let current: Language = DEFAULT_LANGUAGE;
const listeners = new Set<() => void>();

export function isLanguage(value: unknown): value is Language {
  return value === 'pl' || value === 'en';
}

export function getLanguage(): Language {
  return current;
}

/** Ustawia język, zapisuje wybór i powiadamia komponenty. */
export function setLanguage(language: Language): void {
  if (language === current) return;
  current = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Zablokowany storage: wybór nie przeżyje odświeżenia, ale działa teraz.
  }
  applyToDocument(language);
  for (const listener of listeners) listener();
}

/**
 * Język startowy: zapisany wybór, a bez niego język przeglądarki (polski,
 * gdy `navigator.language` zaczyna się od `pl`, inaczej angielski).
 * Wołane raz przy starcie aplikacji.
 */
export function initLanguage(): Language {
  const stored = readStored();
  const language = isLanguage(stored) ? stored : browserLanguage();
  current = language;
  applyToDocument(language);
  return language;
}

export function browserLanguage(): Language {
  const tag = typeof navigator === 'undefined' ? '' : (navigator.language ?? '');
  return tag.toLowerCase().startsWith('pl') ? 'pl' : DEFAULT_LANGUAGE;
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function applyToDocument(language: Language): void {
  document.documentElement.lang = language;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type Params = Record<string, string | number>;

/** Tłumaczenie z podstawieniem `{nazwa}` z parametrów. */
export function t(key: MessageKey, params?: Params): string {
  const template = DICTIONARIES[current][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Komponent renderuje się ponownie po zmianie języka. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

/** `t` związane z bieżącym językiem, do użycia w komponentach. */
export function useT(): typeof t {
  useLanguage();
  return t;
}

export type { MessageKey };
