import { describe, expect, it } from 'vitest';
import { mapSavedTrack, type SavedTrackItem } from '../src/api/likedTracks';

function savedTrack(
  overrides: Partial<SavedTrackItem['track']> = {},
  addedAt = '2024-01-01T00:00:00Z',
): SavedTrackItem {
  return {
    added_at: addedAt,
    track: {
      id: '4Dvkj6JhhA12EX05fT7y2e',
      name: 'As It Was',
      duration_ms: 167303,
      artists: [{ name: 'Harry Styles' }],
      album: { name: "Harry's House", release_date: '2022-05-20' },
      external_ids: { isrc: 'USSM12200612' },
      ...overrides,
    },
  };
}

describe('mapSavedTrack', () => {
  it('przepisuje pola, których używamy dalej', () => {
    expect(mapSavedTrack(savedTrack())).toEqual({
      id: '4Dvkj6JhhA12EX05fT7y2e',
      name: 'As It Was',
      artists: 'Harry Styles',
      album: "Harry's House",
      isrc: 'USSM12200612',
      durationMs: 167303,
      addedAt: '2024-01-01T00:00:00Z',
      releaseYearSpotify: 2022,
    });
  });

  it('skleja wielu wykonawców przecinkiem', () => {
    const mapped = mapSavedTrack(
      savedTrack({ artists: [{ name: 'Daft Punk' }, { name: 'Pharrell Williams' }] }),
    );
    expect(mapped?.artists).toBe('Daft Punk, Pharrell Williams');
  });

  it('pomija pliki lokalne, bo żadne źródło BPM ich nie zna', () => {
    expect(mapSavedTrack(savedTrack({ is_local: true, id: null }))).toBeNull();
  });

  it('pomija pozycje bez ID', () => {
    expect(mapSavedTrack(savedTrack({ id: null }))).toBeNull();
    expect(mapSavedTrack({ added_at: null, track: null })).toBeNull();
  });

  it('przeżywa brak ISRC, albumu i wykonawcy', () => {
    const mapped = mapSavedTrack(savedTrack({ external_ids: null, album: null, artists: [] }));
    expect(mapped).toMatchObject({
      isrc: null,
      album: null,
      artists: 'Unknown artist',
      releaseYearSpotify: null,
    });
  });
});
