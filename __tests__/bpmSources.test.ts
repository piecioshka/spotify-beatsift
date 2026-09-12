import { describe, expect, it, vi } from 'vitest';
import { DeezerRateLimitError, deezerTrackUrl, lookupByIsrc } from '../src/api/deezer';
import { lookupTempoBatch, spotifyIdFromHref } from '../src/api/reccobeats';

function respond(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('Deezer lookupByIsrc', () => {
  it('oddaje tempo i rok utworu', async () => {
    // Kształt odpowiedzi sprawdzony na żywo dla ISRC USUM71703861.
    const getJson = async () => ({ isrc: 'USUM71703861', bpm: 114.84, release_date: '2017-05-26' });

    await expect(lookupByIsrc('USUM71703861', getJson)).resolves.toEqual({
      bpm: 114.84,
      year: 2017,
    });
  });

  it('wstawia ISRC do adresu w formie bezpiecznej dla URL', async () => {
    const calls: string[] = [];
    const getJson = async (url: string) => {
      calls.push(url);
      return { bpm: 100, release_date: '2000-01-01' };
    };

    await lookupByIsrc('GB-AHS-16-00463', getJson);

    expect(calls[0]).toBe('https://api.deezer.com/track/isrc:GB-AHS-16-00463');
    expect(deezerTrackUrl('a b')).toBe('https://api.deezer.com/track/isrc:a%20b');
  });

  it('traktuje bpm równe zero jako brak tempa, nie jako utwór bez rytmu', async () => {
    const getJson = async () => ({ bpm: 0, release_date: '1999-04-02' });

    await expect(lookupByIsrc('X', getJson)).resolves.toEqual({ bpm: null, year: 1999 });
  });

  it('kod 800 znaczy, że Deezer nie zna utworu', async () => {
    const getJson = async () => ({
      error: { type: 'DataException', message: 'no data', code: 800 },
    });

    await expect(lookupByIsrc('X', getJson)).resolves.toEqual({ bpm: null, year: null });
  });

  it('kod 4 to przekroczony limit, a nie brak danych', async () => {
    const getJson = async () => ({ error: { code: 4, message: 'Quota limit exceeded' } });

    await expect(lookupByIsrc('X', getJson)).rejects.toBeInstanceOf(DeezerRateLimitError);
  });

  it('sam rok też się liczy, gdy tempa brak', async () => {
    const getJson = async () => ({ release_date: '2003-07-14' });

    await expect(lookupByIsrc('X', getJson)).resolves.toEqual({ bpm: null, year: 2003 });
  });

  it('odpowiedź, która nie jest obiektem, to błąd, a nie brak danych', async () => {
    const getJson = async () => 'nie-json';

    await expect(lookupByIsrc('X', getJson)).rejects.toThrow(/unexpected response/);
  });
});

describe('spotifyIdFromHref', () => {
  it('wyciąga ID z adresu open.spotify.com', () => {
    expect(spotifyIdFromHref('https://open.spotify.com/track/4Dvkj6JhhA12EX05fT7y2e')).toBe(
      '4Dvkj6JhhA12EX05fT7y2e',
    );
  });

  it('zwraca null dla braku i dla obcego adresu', () => {
    expect(spotifyIdFromHref(undefined)).toBeNull();
    expect(spotifyIdFromHref('https://example.com/album/1')).toBeNull();
  });
});

describe('ReccoBeats lookupTempoBatch', () => {
  /** Odpowiada kolejno na zapytanie o utwory, a potem o cechy audio. */
  function twoStepFetch() {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      const asString = String(url);
      urls.push(asString);

      if (asString.includes('/track?ids=')) {
        return respond({
          content: [
            { id: 'inner-1', href: 'https://open.spotify.com/track/4Dvkj6JhhA12EX05fT7y2e' },
            { id: 'inner-2', href: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3' },
          ],
        });
      }
      return respond({
        content: [
          { id: 'inner-1', tempo: 173.93 },
          { id: 'inner-2', tempo: 0 },
        ],
      });
    };

    return { fetchImpl, urls };
  }

  it('tłumaczy ID Spotify na tempo w dwóch krokach', async () => {
    const { fetchImpl, urls } = twoStepFetch();

    const result = await lookupTempoBatch(
      ['4Dvkj6JhhA12EX05fT7y2e', '7qiZfU4dY1lWllzX7mPBI3'],
      fetchImpl,
    );

    expect(result.get('4Dvkj6JhhA12EX05fT7y2e')).toBe(173.93);
    expect(urls[0]).toContain('/track?ids=4Dvkj6JhhA12EX05fT7y2e,7qiZfU4dY1lWllzX7mPBI3');
    expect(urls[1]).toContain('/audio-features?ids=inner-1,inner-2');
  });

  it('pomija utwory z zerowym tempem', async () => {
    const { fetchImpl } = twoStepFetch();

    const result = await lookupTempoBatch(
      ['4Dvkj6JhhA12EX05fT7y2e', '7qiZfU4dY1lWllzX7mPBI3'],
      fetchImpl,
    );

    expect(result.has('7qiZfU4dY1lWllzX7mPBI3')).toBe(false);
  });

  it('na pustej liście nie wykonuje żadnego zapytania', async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(lookupTempoBatch([], fetchImpl)).resolves.toEqual(new Map());
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('gdy ReccoBeats nie zna żadnego utworu, drugie zapytanie nie leci', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => respond({ content: [] }));

    const result = await lookupTempoBatch(['nieznany'], fetchImpl);

    expect(result.size).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('429 z Retry-After zamienia na błąd limitu z czasem oczekiwania', async () => {
    const fetchImpl: typeof fetch = async () => respond({}, 429, { 'Retry-After': '3' });

    await expect(lookupTempoBatch(['x'], fetchImpl)).rejects.toMatchObject({
      name: 'ReccoBeatsRateLimitError',
      retryAfterMs: 3000,
    });
  });
});
