import { describe, expect, it } from 'vitest';
import { effectiveReleaseYear, parseReleaseYear } from '../src/db/releaseYear';

describe('parseReleaseYear', () => {
  it('radzi sobie z każdą precyzją daty, jaką podaje Spotify', () => {
    expect(parseReleaseYear('2003')).toBe(2003);
    expect(parseReleaseYear('2003-07')).toBe(2003);
    expect(parseReleaseYear('2003-07-14')).toBe(2003);
  });

  it('zwraca null dla braku danych i śmieci', () => {
    expect(parseReleaseYear(null)).toBeNull();
    expect(parseReleaseYear(undefined)).toBeNull();
    expect(parseReleaseYear('')).toBeNull();
    expect(parseReleaseYear('nieznana')).toBeNull();
  });

  it('odrzuca zerową datę, którą Deezer wstawia przy braku informacji', () => {
    expect(parseReleaseYear('0000-00-00')).toBeNull();
  });

  it('odrzuca rok z odległej przyszłości, bo to błąd w katalogu', () => {
    expect(parseReleaseYear('2999-01-01')).toBeNull();
  });
});

describe('effectiveReleaseYear', () => {
  it('bierze wcześniejszy rok, żeby składanka nie wypchnęła utworu z dekady', () => {
    // Piosenka z 2003 wydana ponownie na składance w 2015.
    expect(effectiveReleaseYear(2015, 2003)).toBe(2003);
  });

  it('działa też w drugą stronę, gdy to Deezer ma późniejsze wydanie', () => {
    expect(effectiveReleaseYear(2003, 2015)).toBe(2003);
  });

  it('przy jednym znanym źródle bierze to, co jest', () => {
    expect(effectiveReleaseYear(2003, null)).toBe(2003);
    expect(effectiveReleaseYear(null, 2003)).toBe(2003);
  });

  it('bez żadnego źródła zwraca null', () => {
    expect(effectiveReleaseYear(null, null)).toBeNull();
    expect(effectiveReleaseYear(undefined, undefined)).toBeNull();
  });
});
