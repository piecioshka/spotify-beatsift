import { compareByAddedDesc, compareByName } from '../db/rows';
import type { TrackRow } from '../db/types';

/**
 * Porządek listy wyników. Ma znaczenie nie tylko na ekranie: w tej samej
 * kolejności utwory trafiają do playlisty i w tej kolejności idzie
 * odtwarzacz.
 */
export type SortKey =
  'name' | 'artists' | 'bpm-asc' | 'bpm-desc' | 'year-asc' | 'year-desc' | 'added-desc';

export const DEFAULT_SORT: SortKey = 'name';

/** Kolejność w liście wyboru. Etykiety siedzą w słowniku pod kluczami `sort.<klucz>`. */
export const SORT_KEYS: ReadonlyArray<SortKey> = [
  'name',
  'artists',
  'bpm-asc',
  'bpm-desc',
  'year-asc',
  'year-desc',
  'added-desc',
];

export function isSortKey(value: unknown): value is SortKey {
  return SORT_KEYS.some((key) => key === value);
}

type Comparator = (a: TrackRow, b: TrackRow) => number;

/** Liczby porównujemy z brakami na końcu, niezależnie od kierunku. */
function byNumber(pick: (row: TrackRow) => number | null, direction: 1 | -1): Comparator {
  return (a, b) => {
    const left = pick(a);
    const right = pick(b);
    if (left === right) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return (left - right) * direction;
  };
}

const byArtists: Comparator = (a, b) =>
  a.artists.localeCompare(b.artists, undefined, { sensitivity: 'base' });

const COMPARATORS: Record<SortKey, Comparator> = {
  name: compareByName,
  artists: byArtists,
  'bpm-asc': byNumber((row) => row.bpm_rounded, 1),
  'bpm-desc': byNumber((row) => row.bpm_rounded, -1),
  'year-asc': byNumber((row) => row.release_year, 1),
  'year-desc': byNumber((row) => row.release_year, -1),
  'added-desc': compareByAddedDesc,
};

/**
 * Zwraca nową, posortowaną tablicę. Remisy rozstrzyga tytuł, żeby
 * kolejność była stabilna między renderami i nie skakała przy tym samym BPM.
 */
export function sortTracks(rows: TrackRow[], key: SortKey): TrackRow[] {
  const primary = COMPARATORS[key];
  return [...rows].sort((a, b) => primary(a, b) || compareByName(a, b));
}
