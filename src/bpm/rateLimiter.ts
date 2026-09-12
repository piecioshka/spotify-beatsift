/**
 * Prosty licznik w oknie czasu. Przepuszcza najwyżej `requests` zapytań
 * na `perMs`, resztę wstrzymuje. Deezer liczy limit po IP, więc ograniczamy
 * się sami, zamiast zbierać błędy i ponawiać.
 */
export function createRateLimiter(
  requests: number,
  perMs: number,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
) {
  const stamps: number[] = [];

  return async function acquire(): Promise<void> {
    for (;;) {
      const cutoff = now() - perMs;
      // Wyrzucamy z okna wszystko, co już się nie liczy.
      while (stamps.length > 0 && stamps[0] <= cutoff) stamps.shift();

      if (stamps.length < requests) {
        stamps.push(now());
        return;
      }

      // Czekamy dokładnie tyle, ile zostało do wypadnięcia najstarszego wpisu.
      await sleep(Math.max(stamps[0] - cutoff, 1));
    }
  };
}

/** Dzieli listę na paczki o zadanym rozmiarze. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error('Rozmiar paczki musi być dodatni.');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Puszcza zadania z ograniczoną liczbą równoległych wykonań.
 * Wyniki wracają w kolejności wejścia.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}
