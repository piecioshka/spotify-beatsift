import { describe, expect, it, vi } from 'vitest';
import { chunk, createRateLimiter, mapWithConcurrency } from '../src/bpm/rateLimiter';

describe('chunk', () => {
  it('dzieli na równe paczki', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('ostatnia paczka bywa krótsza', () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
  });

  it('pusta lista daje pustą listę paczek', () => {
    expect(chunk([], 40)).toEqual([]);
  });

  it('odmawia przy niedodatnim rozmiarze', () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});

describe('createRateLimiter', () => {
  it('przepuszcza bez czekania, dopóki mieści się w oknie', async () => {
    const slept: number[] = [];
    const acquire = createRateLimiter(
      3,
      1000,
      () => 0,
      async (ms) => {
        slept.push(ms);
      },
    );

    await acquire();
    await acquire();
    await acquire();

    expect(slept).toEqual([]);
  });

  it('wstrzymuje czwarte zapytanie, gdy limit to trzy na okno', async () => {
    let clock = 0;
    const slept: number[] = [];
    const acquire = createRateLimiter(
      3,
      1000,
      () => clock,
      async (ms) => {
        slept.push(ms);
        // Symulujemy upływ czasu, żeby okno się przesunęło.
        clock += ms;
      },
    );

    await acquire();
    await acquire();
    await acquire();
    await acquire();

    expect(slept).toHaveLength(1);
    expect(slept[0]).toBeGreaterThan(0);
  });
});

describe('mapWithConcurrency', () => {
  it('zachowuje kolejność wyników mimo równoległości', async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 10);
    expect(out).toEqual([10, 20, 30, 40, 50]);
  });

  it('nie przekracza zadanej liczby równoległych zadań', async () => {
    let running = 0;
    let peak = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 1));
      running -= 1;
    });

    expect(peak).toBeLessThanOrEqual(2);
  });

  it('pusta lista niczego nie uruchamia', async () => {
    const worker = vi.fn(async (item: number) => item);
    await mapWithConcurrency([], 4, worker);
    expect(worker).not.toHaveBeenCalled();
  });
});
