// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mergeIncoming } from '../src/db/rows';
import type { TrackRow } from '../src/db/types';
import {
  DEFAULT_RANGES,
  loadCompact,
  loadRanges,
  loadSortKey,
  parseRange,
  saveCompact,
  saveRanges,
  saveSortKey,
} from '../src/ui/preferences';
import { isSortKey, SORT_KEYS, sortTracks } from '../src/ui/sorting';

function row(overrides: Partial<TrackRow> & { id: string }): TrackRow {
  return {
    ...mergeIncoming(
      undefined,
      {
        id: overrides.id,
        name: overrides.id,
        artists: 'Ktoś',
        album: null,
        isrc: null,
        durationMs: null,
        addedAt: null,
        releaseYearSpotify: 2000,
      },
      '2024-01-01T00:00:00Z',
    ),
    ...overrides,
  };
}

const rows = [
  row({
    id: 'b',
    name: 'beta',
    artists: 'Zed',
    bpm_rounded: 120,
    release_year: 2005,
    added_at: '2024-02-01T00:00:00Z',
  }),
  row({
    id: 'a',
    name: 'Alfa',
    artists: 'anna',
    bpm_rounded: 128,
    release_year: 2001,
    added_at: '2024-03-01T00:00:00Z',
  }),
  row({
    id: 'c',
    name: 'gamma',
    artists: 'Marek',
    bpm_rounded: 120,
    release_year: 2009,
    added_at: null,
  }),
];

const ids = (list: TrackRow[]) => list.map((track) => track.id);

describe('sortTracks', () => {
  it('po tytule bez rozróżniania wielkości liter', () => {
    expect(ids(sortTracks(rows, 'name'))).toEqual(['a', 'b', 'c']);
  });

  it('po wykonawcy', () => {
    expect(ids(sortTracks(rows, 'artists'))).toEqual(['a', 'c', 'b']);
  });

  it('po BPM w obie strony, remis rozstrzyga tytuł', () => {
    expect(ids(sortTracks(rows, 'bpm-asc'))).toEqual(['b', 'c', 'a']);
    expect(ids(sortTracks(rows, 'bpm-desc'))).toEqual(['a', 'b', 'c']);
  });

  it('po roku w obie strony', () => {
    expect(ids(sortTracks(rows, 'year-asc'))).toEqual(['a', 'b', 'c']);
    expect(ids(sortTracks(rows, 'year-desc'))).toEqual(['c', 'b', 'a']);
  });

  it('ostatnio dodane pierwsze, bez daty na koniec', () => {
    expect(ids(sortTracks(rows, 'added-desc'))).toEqual(['a', 'b', 'c']);
  });

  it('braki liczbowe lądują na końcu niezależnie od kierunku', () => {
    const withGap = [...rows, row({ id: 'x', name: 'x', bpm_rounded: null })];
    expect(ids(sortTracks(withGap, 'bpm-asc')).at(-1)).toBe('x');
    expect(ids(sortTracks(withGap, 'bpm-desc')).at(-1)).toBe('x');
  });

  it('nie modyfikuje wejścia', () => {
    const copy = [...rows];
    sortTracks(rows, 'year-desc');
    expect(rows).toEqual(copy);
  });

  it('każda opcja z listy jest poprawnym kluczem', () => {
    for (const key of SORT_KEYS) expect(isSortKey(key)).toBe(true);
    expect(isSortKey('nie-ma')).toBe(false);
    expect(isSortKey(null)).toBe(false);
  });
});

describe('preferencje', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('bez zapisu oddaje domyślne', () => {
    expect(loadSortKey()).toBe('name');
    expect(loadCompact()).toBe(false);
  });

  it('pamięta sortowanie i zwarty widok', () => {
    saveSortKey('bpm-desc');
    saveCompact(true);
    expect(loadSortKey()).toBe('bpm-desc');
    expect(loadCompact()).toBe(true);
  });

  it('nieznany klucz sortowania wraca do domyślnego', () => {
    window.localStorage.setItem('beatsift.filter.sort', 'cokolwiek');
    expect(loadSortKey()).toBe('name');
  });
});

describe('zakresy suwaków', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('bez zapisu oddaje domyślne widełki', () => {
    expect(loadRanges()).toEqual(DEFAULT_RANGES);
  });

  it('pamięta zapisane zakresy', () => {
    saveRanges({ bpm: { low: 90, high: 100 }, years: { low: 1990, high: 1999 } });
    expect(loadRanges()).toEqual({ bpm: { low: 90, high: 100 }, years: { low: 1990, high: 1999 } });
  });

  it('odrzuca zakres poza widełkami, odwrócony albo uszkodzony', () => {
    expect(parseRange(JSON.stringify({ low: 10, high: 100 }), 40, 220)).toBeNull();
    expect(parseRange(JSON.stringify({ low: 150, high: 100 }), 40, 220)).toBeNull();
    expect(parseRange(JSON.stringify({ low: 100.5, high: 120 }), 40, 220)).toBeNull();
    expect(parseRange('"nie obiekt"', 40, 220)).toBeNull();
    expect(parseRange('{zepsute', 40, 220)).toBeNull();
    expect(parseRange(null, 40, 220)).toBeNull();
    expect(parseRange(JSON.stringify({ low: 100, high: 100 }), 40, 220)).toEqual({
      low: 100,
      high: 100,
    });
  });
});
