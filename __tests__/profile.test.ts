// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearProfile,
  fetchProfile,
  loadCachedProfile,
  parseProfile,
  saveProfile,
  type SpotifyProfile,
} from '../src/api/profile';

afterEach(() => {
  window.localStorage.clear();
});

const fakeClient = (response: unknown) => ({
  request: async <T>(path: string): Promise<T> => {
    expect(path).toBe('/me');
    return response as T;
  },
});

describe('fetchProfile', () => {
  it('mapuje odpowiedź /me na profil', async () => {
    const profile = await fetchProfile(
      fakeClient({
        id: 'alex',
        display_name: 'Alex',
        external_urls: { spotify: 'https://open.spotify.com/user/alex' },
      }),
    );

    expect(profile).toEqual({
      id: 'alex',
      displayName: 'Alex',
      url: 'https://open.spotify.com/user/alex',
    });
  });

  it('konto bez nazwy wyświetlanej dostaje null, nie pusty string', async () => {
    const profile = await fetchProfile(fakeClient({ id: 'alex', display_name: null }));
    expect(profile).toEqual({ id: 'alex', displayName: null, url: null });
  });

  it('odpowiedź bez id jest błędem', async () => {
    await expect(fetchProfile(fakeClient({ display_name: 'Alex' }))).rejects.toThrow();
  });
});

describe('cache profilu', () => {
  const profile: SpotifyProfile = { id: 'alex', displayName: 'Alex', url: null };

  it('zapisuje i odczytuje profil pod kluczem aplikacji', () => {
    saveProfile(profile);
    expect(window.localStorage.getItem('beatsift.spotify.profile')).not.toBeNull();
    expect(loadCachedProfile()).toEqual(profile);
  });

  it('bez wpisu oddaje null', () => {
    expect(loadCachedProfile()).toBeNull();
  });

  it('czyści wpis', () => {
    saveProfile(profile);
    clearProfile();
    expect(loadCachedProfile()).toBeNull();
  });

  it('uszkodzony wpis traktuje jak brak profilu', () => {
    expect(parseProfile('nie json')).toBeNull();
    expect(parseProfile('null')).toBeNull();
    expect(parseProfile('[]')).toBeNull();
    expect(parseProfile('{"displayName":"Alex"}')).toBeNull();
  });
});
