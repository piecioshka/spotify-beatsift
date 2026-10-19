// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTheme, initTheme, isTheme, readStoredTheme, setTheme } from '../src/ui/theme';

/** jsdom nie ma matchMedia; udajemy preferencję systemu. */
function stubPrefersLight(light: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: light && query.includes('light'),
    media: query,
  }));
}

beforeEach(() => {
  stubPrefersLight(false);
});

afterEach(() => {
  setTheme('dark');
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.unstubAllGlobals();
});

describe('readStoredTheme', () => {
  it('bierze zapisany wybór', () => {
    window.localStorage.setItem('beatsift.theme', 'light');
    expect(readStoredTheme()).toBe('light');
  });

  it('bez zapisu idzie za prefers-color-scheme', () => {
    stubPrefersLight(true);
    expect(readStoredTheme()).toBe('light');
    stubPrefersLight(false);
    expect(readStoredTheme()).toBe('dark');
  });

  it('inną wartość w zapisie traktuje jak brak', () => {
    window.localStorage.setItem('beatsift.theme', 'system');
    expect(readStoredTheme()).toBe('dark');
    expect(isTheme('system')).toBe(false);
  });
});

describe('initTheme i setTheme', () => {
  it('ustawia data-theme na html przy starcie', () => {
    stubPrefersLight(true);
    expect(initTheme()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('po przełączeniu zapisuje wybór i zmienia atrybut', () => {
    initTheme();
    setTheme('light');
    expect(getTheme()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('beatsift.theme')).toBe('light');
  });
});
