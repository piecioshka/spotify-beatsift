import { describe, expect, it } from 'vitest';
import { SourceSyncError } from '../src/api/librarySync';
import { SpotifyApiError } from '../src/api/spotifyClient';
import { describeSyncFailure, formatTime } from '../src/api/syncFailure';

const NOW = new Date(2026, 9, 19, 14, 5, 9);

describe('describeSyncFailure', () => {
  it('przy 404 z playlisty podaje źródło, status, żądanie, podpowiedź i czas', () => {
    const err = new SourceSyncError(
      'Bieganie',
      new SpotifyApiError(404, 'Resource not found', 'GET /playlists/p1/items'),
    );

    const failure = describeSyncFailure(err, NOW);

    expect(failure.message).toBe('Resource not found');
    expect(failure.details).toEqual([
      { label: 'Source', value: 'Bieganie' },
      { label: 'HTTP status', value: '404' },
      { label: 'Request', value: 'GET /playlists/p1/items' },
      { label: 'What it means', value: expect.stringContaining('deleted') },
      { label: 'Time', value: '2026-10-19 14:05:09' },
    ]);
  });

  it('zwykły błąd bez statusu dostaje tylko czas', () => {
    const failure = describeSyncFailure(new TypeError('boom'), NOW);
    expect(failure).toEqual({
      message: 'boom',
      details: [{ label: 'Time', value: '2026-10-19 14:05:09' }],
    });
  });
});

describe('formatTime', () => {
  it('dopełnia zerami', () => {
    expect(formatTime(new Date(2026, 0, 2, 3, 4, 5))).toBe('2026-01-02 03:04:05');
  });
});
