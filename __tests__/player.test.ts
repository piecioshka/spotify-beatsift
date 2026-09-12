// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isTrackEnded, nextTrack } from '../src/player/queue';
import {
  createController,
  loadSpotifyIframeApi,
  resetSpotifyIframeApiForTests,
  SCRIPT_URL,
  type EmbedController,
  type IFrameApi,
  type PlaybackUpdate,
} from '../src/player/spotifyIframeApi';

function update(overrides: Partial<PlaybackUpdate> = {}): PlaybackUpdate {
  return {
    playingURI: 'spotify:track:a',
    isPaused: true,
    isBuffering: false,
    duration: 200_000,
    position: 200_000,
    ...overrides,
  };
}

describe('nextTrack', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('oddaje utwór następny po bieżącym', () => {
    expect(nextTrack(list, 'a')).toEqual({ id: 'b' });
  });

  it('na końcu listy i dla nieznanego utworu oddaje null', () => {
    expect(nextTrack(list, 'c')).toBeNull();
    expect(nextTrack(list, 'nie-ma')).toBeNull();
    expect(nextTrack([], 'a')).toBeNull();
  });
});

describe('isTrackEnded', () => {
  it('koniec to pozycja równa długości, także bez flagi pauzy', () => {
    // Dokładnie taki payload przysyła embed po dojściu do końca zapowiedzi.
    expect(isTrackEnded(update({ isPaused: false, duration: 16_700, position: 16_700 }))).toBe(
      true,
    );
    expect(isTrackEnded(update({ isPaused: true }))).toBe(true);
    expect(isTrackEnded(update({ position: 199_900 }))).toBe(true);
  });

  it('pozycja sekundę przed końcem to jeszcze nie koniec', () => {
    expect(isTrackEnded(update({ isPaused: false, position: 199_000 }))).toBe(false);
  });

  it('pauza w środku utworu to nie koniec', () => {
    expect(isTrackEnded(update({ position: 90_000 }))).toBe(false);
  });

  it('świeżo załadowany utwór z pozycją zero to nie koniec', () => {
    expect(isTrackEnded(update({ position: 0 }))).toBe(false);
    expect(isTrackEnded(update({ position: 0, duration: 0 }))).toBe(false);
  });

  it('buforowanie nigdy nie liczy się jako koniec', () => {
    expect(isTrackEnded(update({ isBuffering: true }))).toBe(false);
  });
});

describe('loadSpotifyIframeApi', () => {
  afterEach(() => {
    resetSpotifyIframeApiForTests();
    document.head.replaceChildren();
  });

  function injectedScript() {
    const script = document.head.querySelector('script');
    if (!(script instanceof HTMLScriptElement)) throw new Error('Brak wstrzykniętego skryptu.');
    return script;
  }

  it('wstrzykuje skrypt Spotify i rozwiązuje się globalnym callbackiem', async () => {
    const promise = loadSpotifyIframeApi();
    const fakeApi: IFrameApi = { createController: vi.fn() };

    expect(injectedScript().src).toBe(SCRIPT_URL);
    expect(typeof window.onSpotifyIframeApiReady).toBe('function');

    window.onSpotifyIframeApiReady?.(fakeApi);

    await expect(promise).resolves.toBe(fakeApi);
  });

  it('ładuje skrypt tylko raz', async () => {
    const first = loadSpotifyIframeApi();
    const second = loadSpotifyIframeApi();
    window.onSpotifyIframeApiReady?.({ createController: vi.fn() });

    await first;

    expect(document.head.querySelectorAll('script')).toHaveLength(1);
    expect(second).toBe(first);
  });

  it('błąd ładowania odrzuca obietnicę i pozwala spróbować ponownie', async () => {
    const promise = loadSpotifyIframeApi();
    injectedScript().dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow(/Could not load/);

    const retry = loadSpotifyIframeApi();
    expect(retry).not.toBe(promise);
    window.onSpotifyIframeApiReady?.({ createController: vi.fn() });
    await expect(retry).resolves.toBeDefined();
  });
});

describe('createController', () => {
  it('oddaje kontroler dopiero po zdarzeniu ready', async () => {
    const ready: { callback: (() => void) | null } = { callback: null };
    const controller = {
      addListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'ready') ready.callback = cb;
      }),
    } as unknown as EmbedController;
    const api: IFrameApi = {
      createController: vi.fn((_element, _options, callback) => callback(controller)),
    };

    const element = document.createElement('div');
    let settled = false;
    const promise = createController(api, element, { uri: 'spotify:track:a' }).then((c) => {
      settled = true;
      return c;
    });

    await Promise.resolve();
    expect(settled).toBe(false);
    expect(api.createController).toHaveBeenCalledWith(
      element,
      { uri: 'spotify:track:a' },
      expect.any(Function),
    );

    ready.callback?.();
    await expect(promise).resolves.toBe(controller);
  });
});
