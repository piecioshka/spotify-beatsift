// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { getLanguage, initLanguage, isLanguage, setLanguage, t } from '../src/i18n';
import { en, pl } from '../src/i18n/messages';
import { tracksCount, tracksLabel } from '../src/ui/plural';

afterEach(() => {
  setLanguage('en');
  window.localStorage.clear();
});

describe('słowniki', () => {
  it('angielski ma dokładnie te same klucze co polski', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pl).sort());
  });

  it('żaden tekst nie jest pusty', () => {
    for (const value of [...Object.values(pl), ...Object.values(en)]) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('t', () => {
  it('domyślnie mówi po angielsku', () => {
    expect(getLanguage()).toBe('en');
    expect(t('login.button')).toBe('Log in with Spotify');
  });

  it('podstawia parametry i zostawia nieznane nawiasy', () => {
    expect(t('filter.export', { n: 7 })).toBe('Save as playlist (7)');
    expect(t('track.otherYear', {})).toBe('release {year}');
  });

  it('po zmianie języka oddaje polski i zapisuje wybór', () => {
    setLanguage('pl');
    expect(getLanguage()).toBe('pl');
    expect(t('login.button')).toBe('Zaloguj przez Spotify');
    expect(document.documentElement.lang).toBe('pl');
    expect(window.localStorage.getItem('beatsift.language')).toBe('pl');
  });
});

describe('initLanguage', () => {
  it('bierze zapisany wybór', () => {
    window.localStorage.setItem('beatsift.language', 'pl');
    expect(initLanguage()).toBe('pl');
  });

  it('bez zapisu wybiera angielski niezależnie od przeglądarki', () => {
    expect(initLanguage()).toBe('en');
  });

  it('nieznany zapis traktuje jak brak', () => {
    window.localStorage.setItem('beatsift.language', 'de');
    expect(initLanguage()).toBe('en');
    expect(isLanguage('de')).toBe(false);
  });
});

describe('tracksLabel', () => {
  it('po polsku odmienia przez liczebnik', () => {
    setLanguage('pl');
    expect(tracksCount(1)).toBe('1 utwór');
    expect(tracksCount(3)).toBe('3 utwory');
    expect(tracksCount(12)).toBe('12 utworów');
  });

  it('po angielsku ma tylko liczbę pojedynczą i mnogą', () => {
    expect(tracksLabel(1)).toBe('track');
    expect(tracksLabel(2)).toBe('tracks');
    expect(tracksLabel(12)).toBe('tracks');
  });
});
