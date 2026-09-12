import { describe, expect, it } from 'vitest';
import {
  applyUpdate,
  compareByAddedDesc,
  compareByName,
  matchesFilter,
  mergeIncoming,
} from '../src/db/rows';
import type { IncomingTrack, TrackRow } from '../src/db/types';

function incoming(overrides: Partial<IncomingTrack> = {}): IncomingTrack {
  return {
    id: 'abc',
    name: 'Utwór',
    artists: 'Ktoś',
    album: 'Album',
    isrc: 'ISRC-1',
    durationMs: 200000,
    addedAt: '2024-03-01T00:00:00Z',
    releaseYearSpotify: 2015,
    ...overrides,
  };
}

function row(overrides: Partial<TrackRow> = {}): TrackRow {
  return {
    ...mergeIncoming(undefined, incoming(), '2024-03-01T00:00:00Z'),
    ...overrides,
  };
}

describe('mergeIncoming', () => {
  it('nowy utwór dostaje dane ze Spotify i pusty BPM', () => {
    const merged = mergeIncoming(undefined, incoming(), '2024-03-02T00:00:00Z');

    expect(merged).toMatchObject({
      id: 'abc',
      bpm: null,
      bpm_checked_at: null,
      release_year_spotify: 2015,
      release_year_deezer: null,
      release_year: 2015,
      last_seen_at: '2024-03-02T00:00:00Z',
    });
  });

  it('nie rusza ustalonego BPM przy ponownej synchronizacji', () => {
    const existing = row({
      bpm: 128.4,
      bpm_rounded: 128,
      bpm_source: 'deezer',
      bpm_checked_at: '2024-03-01T01:00:00Z',
    });

    const merged = mergeIncoming(
      existing,
      incoming({ name: 'Nowa nazwa' }),
      '2024-04-01T00:00:00Z',
    );

    expect(merged.name).toBe('Nowa nazwa');
    expect(merged.bpm).toBe(128.4);
    expect(merged.bpm_source).toBe('deezer');
    expect(merged.bpm_checked_at).toBe('2024-03-01T01:00:00Z');
  });

  it('rok z Deezera przeżywa synchronizację i wygrywa, gdy jest wcześniejszy', () => {
    const existing = row({ release_year_deezer: 2003, release_year: 2003 });

    const merged = mergeIncoming(existing, incoming({ releaseYearSpotify: 2015 }), 'x');

    expect(merged.release_year_deezer).toBe(2003);
    expect(merged.release_year).toBe(2003);
  });

  it('gdy Spotify nie podało roku, zostaje rok z Deezera', () => {
    const existing = row({ release_year_deezer: 2003 });

    const merged = mergeIncoming(existing, incoming({ releaseYearSpotify: null }), 'x');

    expect(merged.release_year).toBe(2003);
  });
});

describe('applyUpdate', () => {
  it('zapisuje tempo, zaokrąglenie, źródło i znacznik sprawdzenia', () => {
    const updated = applyUpdate(
      row(),
      { id: 'abc', bpm: 127.6, source: 'deezer', deezerYear: 2010 },
      '2024-03-01T02:00:00Z',
    );

    expect(updated).toMatchObject({
      bpm: 127.6,
      bpm_rounded: 128,
      bpm_source: 'deezer',
      bpm_checked_at: '2024-03-01T02:00:00Z',
      release_year_deezer: 2010,
      release_year: 2010,
    });
  });

  it('brak wyniku też dostaje znacznik sprawdzenia', () => {
    const updated = applyUpdate(row(), { id: 'abc', bpm: null, source: null }, 'checked');

    expect(updated.bpm).toBeNull();
    expect(updated.bpm_rounded).toBeNull();
    expect(updated.bpm_checked_at).toBe('checked');
  });

  it('bez roku z Deezera nie kasuje roku zapisanego wcześniej', () => {
    const updated = applyUpdate(
      row({ release_year_deezer: 2003, release_year: 2003 }),
      { id: 'abc', bpm: 100, source: 'reccobeats', deezerYear: null },
      'checked',
    );

    expect(updated.release_year_deezer).toBe(2003);
    expect(updated.release_year).toBe(2003);
  });
});

describe('matchesFilter', () => {
  const filter = { bpmMin: 120, bpmMax: 130, yearMin: 2000, yearMax: 2010 };

  it('przepuszcza utwór w obu zakresach, włącznie z granicami', () => {
    expect(matchesFilter(row({ bpm_rounded: 120, release_year: 2010 }), filter)).toBe(true);
    expect(matchesFilter(row({ bpm_rounded: 130, release_year: 2000 }), filter)).toBe(true);
  });

  it('odrzuca utwór poza którymkolwiek zakresem', () => {
    expect(matchesFilter(row({ bpm_rounded: 131, release_year: 2005 }), filter)).toBe(false);
    expect(matchesFilter(row({ bpm_rounded: 125, release_year: 2011 }), filter)).toBe(false);
  });

  it('utwór bez tempa albo bez roku nigdy nie pasuje', () => {
    expect(matchesFilter(row({ bpm_rounded: null, release_year: 2005 }), filter)).toBe(false);
    expect(matchesFilter(row({ bpm_rounded: 125, release_year: null }), filter)).toBe(false);
  });
});

describe('porządek', () => {
  it('compareByName nie rozróżnia wielkości liter', () => {
    const sorted = [row({ name: 'b' }), row({ name: 'A' }), row({ name: 'c' })].sort(compareByName);
    expect(sorted.map((r) => r.name)).toEqual(['A', 'b', 'c']);
  });

  it('compareByAddedDesc daje najnowsze pierwsze, a bez daty na koniec', () => {
    const sorted = [
      row({ id: 'stary', added_at: '2020-01-01T00:00:00Z' }),
      row({ id: 'bez-daty', added_at: null }),
      row({ id: 'nowy', added_at: '2024-01-01T00:00:00Z' }),
    ].sort(compareByAddedDesc);

    expect(sorted.map((r) => r.id)).toEqual(['nowy', 'stary', 'bez-daty']);
  });
});
