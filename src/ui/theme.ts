import { useCallback, useSyncExternalStore } from 'react';

/**
 * Motyw aplikacji (dark/light). Źródłem prawdy jest atrybut `data-theme`
 * na `<html>`, który czyta CSS. Wybór zostaje w localStorage; przy pierwszej
 * wizycie decyduje `prefers-color-scheme`. Ten sam odczyt robi skrypt
 * w `<head>` w index.html, zanim React wystartuje, żeby strona nie migała.
 */

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'beatsift.theme';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

/** Zapisany wybór, a bez niego preferencja systemu. Inna wartość w zapisie liczy się jak brak. */
export function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

let current: Theme = 'dark';
const listeners = new Set<() => void>();

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** Ustawia motyw na starcie aplikacji. Wołane raz w main.tsx. */
export function initTheme(): Theme {
  current = readStoredTheme();
  apply(current);
  return current;
}

export function getTheme(): Theme {
  return current;
}

/** Ustawia motyw, zapisuje wybór i powiadamia komponenty. */
export function setTheme(theme: Theme): void {
  if (theme === current) return;
  current = theme;
  apply(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Zablokowany storage: motyw działa do końca sesji.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, getTheme, getTheme);
  const toggle = useCallback(() => {
    setTheme(current === 'dark' ? 'light' : 'dark');
  }, []);
  return { theme, toggle };
}
