import { BPM_MAX, BPM_MIN, YEAR_MAX, YEAR_MIN } from '../config';
import type { Range } from './rangeMath';
import { DEFAULT_SORT, isSortKey, type SortKey } from './sorting';

/**
 * Drobne preferencje widoku w localStorage. To wygoda dla tej przeglądarki,
 * nie dane: gdy odczyt się nie uda (tryb prywatny, uszkodzony wpis),
 * wracamy do wartości domyślnej i nic się nie dzieje.
 */

const KEYS = {
  sort: 'beatsift.filter.sort',
  compact: 'beatsift.filter.compact',
  bpm: 'beatsift.filter.bpm',
  years: 'beatsift.filter.years',
} as const;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Brak miejsca albo zablokowany storage: preferencja po prostu nie przeżyje odświeżenia.
  }
}

export function loadSortKey(): SortKey {
  const raw = read(KEYS.sort);
  return isSortKey(raw) ? raw : DEFAULT_SORT;
}

export function saveSortKey(key: SortKey): void {
  write(KEYS.sort, key);
}

export function loadCompact(): boolean {
  return read(KEYS.compact) === '1';
}

export function saveCompact(compact: boolean): void {
  write(KEYS.compact, compact ? '1' : '0');
}

export type FilterRanges = { bpm: Range; years: Range };

export const DEFAULT_RANGES: FilterRanges = {
  bpm: { low: 120, high: 130 },
  years: { low: 2000, high: 2010 },
};

/**
 * Zakres z zapisu przyjmujemy tylko wtedy, gdy obie granice są liczbami
 * całkowitymi w widełkach suwaka i dolna nie przekracza górnej. Wszystko
 * inne (stary format, ręczna edycja, zmiana widełek) wraca do domyślnych.
 */
export function parseRange(raw: string | null, min: number, max: number): Range | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { low, high } = parsed as Partial<Range>;
    if (!Number.isInteger(low) || !Number.isInteger(high)) return null;
    if (typeof low !== 'number' || typeof high !== 'number') return null;
    if (low < min || high > max || low > high) return null;
    return { low, high };
  } catch {
    return null;
  }
}

export function loadRanges(): FilterRanges {
  return {
    bpm: parseRange(read(KEYS.bpm), BPM_MIN, BPM_MAX) ?? DEFAULT_RANGES.bpm,
    years: parseRange(read(KEYS.years), YEAR_MIN, YEAR_MAX) ?? DEFAULT_RANGES.years,
  };
}

export function saveRanges(ranges: FilterRanges): void {
  write(KEYS.bpm, JSON.stringify(ranges.bpm));
  write(KEYS.years, JSON.stringify(ranges.years));
}
