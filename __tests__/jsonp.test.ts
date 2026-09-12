// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { jsonp } from '../src/api/jsonp';

/** Ostatni wstrzyknięty skrypt i nazwa callbacku wyciągnięta z jego adresu. */
function lastScript() {
  const script = document.head.querySelector('script:last-of-type');
  if (!(script instanceof HTMLScriptElement)) throw new Error('Brak wstrzykniętego skryptu.');
  const url = new URL(script.src);
  return { script, url, callback: url.searchParams.get('callback') ?? '' };
}

function invokeCallback(name: string, data: unknown) {
  const fn: unknown = Reflect.get(window, name);
  if (typeof fn !== 'function') throw new Error(`Brak globalnego callbacku ${name}.`);
  fn(data);
}

describe('jsonp', () => {
  it('wstrzykuje skrypt z parametrami JSONP i oddaje dane z callbacku', async () => {
    const promise = jsonp('https://api.deezer.com/track/isrc:X');
    const { url, callback } = lastScript();

    expect(url.origin + url.pathname).toBe('https://api.deezer.com/track/isrc:X');
    expect(url.searchParams.get('output')).toBe('jsonp');
    expect(callback).toMatch(/^__beatsiftJsonp\d+$/);

    invokeCallback(callback, { bpm: 120 });

    await expect(promise).resolves.toEqual({ bpm: 120 });
  });

  it('po odpowiedzi sprząta skrypt i globalną funkcję', async () => {
    const promise = jsonp('https://api.deezer.com/track/isrc:Y');
    const { script, callback } = lastScript();

    invokeCallback(callback, {});
    await promise;

    expect(script.isConnected).toBe(false);
    expect(Reflect.has(window, callback)).toBe(false);
  });

  it('błąd ładowania skryptu odrzuca obietnicę', async () => {
    const promise = jsonp('https://api.deezer.com/track/isrc:Z');
    const { script } = lastScript();

    script.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow(/Could not fetch/);
  });

  it('brak odpowiedzi w limicie czasu odrzuca obietnicę', async () => {
    await expect(jsonp('https://api.deezer.com/track/isrc:T', { timeoutMs: 5 })).rejects.toThrow(
      /did not respond in time/,
    );
  });

  it('każde wywołanie dostaje osobną nazwę callbacku', () => {
    jsonp('https://api.deezer.com/track/isrc:A');
    const first = lastScript().callback;
    jsonp('https://api.deezer.com/track/isrc:B');
    const second = lastScript().callback;

    expect(first).not.toBe(second);
  });
});
