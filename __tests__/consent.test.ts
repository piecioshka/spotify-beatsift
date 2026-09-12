// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTokens, saveTokens } from '../src/auth/tokenStore';
import { acceptConsent, clearAppStorage, getConsent, rejectConsent } from '../src/consent/consent';
import { libraryStats, upsertTracks } from '../src/db/queries';
import { resetDatabase } from '../src/db/schema';

beforeEach(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  await resetDatabase();
});

describe('zgoda na przechowywanie danych', () => {
  it('bez decyzji oddaje null', () => {
    expect(getConsent()).toBeNull();
  });

  it('akceptacja zostaje w localStorage', () => {
    acceptConsent();
    expect(getConsent()).toBe('accepted');
    expect(window.localStorage.getItem('beatsift.consent')).toBe('accepted');
  });

  it('odmowa czyści tokeny, bibliotekę i preferencje i nie zostawia śladu w storage', async () => {
    acceptConsent();
    await saveTokens({ accessToken: 'a', refreshToken: 'r', expiresAt: 1 });
    window.localStorage.setItem('beatsift.filter.sort', 'bpm-desc');
    window.localStorage.setItem('cudzy.klucz', 'zostaje');
    await upsertTracks([
      {
        id: 'x',
        name: 'x',
        artists: 'y',
        album: null,
        isrc: null,
        durationMs: null,
        addedAt: null,
        releaseYearSpotify: 2000,
      },
    ]);

    await rejectConsent();

    expect(getConsent()).toBe('rejected');
    expect(window.sessionStorage.length).toBe(0);
    expect(window.localStorage.getItem('beatsift.consent')).toBeNull();
    await expect(loadTokens()).resolves.toBeNull();
    expect(window.localStorage.getItem('beatsift.filter.sort')).toBeNull();
    expect(window.localStorage.getItem('cudzy.klucz')).toBe('zostaje');
    await expect(libraryStats()).resolves.toMatchObject({ total: 0 });
  });

  it('akceptacja po odmowie zdejmuje odmowę', async () => {
    await rejectConsent();
    acceptConsent();
    expect(getConsent()).toBe('accepted');
  });

  it('clearAppStorage kasuje tylko klucze aplikacji', () => {
    window.localStorage.setItem('beatsift.language', 'en');
    window.localStorage.setItem('inne', '1');
    clearAppStorage();
    expect(window.localStorage.getItem('beatsift.language')).toBeNull();
    expect(window.localStorage.getItem('inne')).toBe('1');
  });
});
