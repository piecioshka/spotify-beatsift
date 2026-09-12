import { DEEZER_RATE, DeezerRateLimitError, lookupByIsrc, type JsonGetter } from '../api/deezer';
import { jsonp } from '../api/jsonp';
import {
  lookupTempoBatch,
  RECCOBEATS_BATCH,
  RECCOBEATS_GAP_MS,
  ReccoBeatsRateLimitError,
} from '../api/reccobeats';
import { applyBpmUpdates, pendingBpmTracks, type BpmUpdate } from '../db/queries';
import type { TrackRow } from '../db/types';
import { chunk, createRateLimiter, mapWithConcurrency } from './rateLimiter';

/**
 * Ile utworów bierzemy z bazy na raz. Zapisujemy wyniki po każdej porcji,
 * więc zamknięcie karty w trakcie kosztuje najwyżej jedną porcję pracy.
 */
const PORTION = 120;

export type EnrichProgress = {
  /** Ile utworów przerobiliśmy w tym przebiegu, z BPM czy bez. */
  processed: number;
  /** Ilu udało się przypisać tempo. */
  resolved: number;
};

export type EnrichOptions = {
  onProgress?: (progress: EnrichProgress) => void;
  signal?: { cancelled: boolean };
  /** ReccoBeats wspiera CORS, więc idzie zwykłym fetchem. */
  fetchImpl?: typeof fetch;
  /** Deezer nie wspiera CORS, więc idzie JSONP-em. */
  deezerGet?: JsonGetter;
  sleep?: (ms: number) => Promise<void>;
  /** Wstrzykiwane wyłącznie w testach, żeby nie dotykać IndexedDB. */
  loadPending?: (limit: number) => Promise<TrackRow[]>;
  saveUpdates?: (updates: BpmUpdate[]) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Uzupełnia BPM dla utworów, których jeszcze nie sprawdzaliśmy.
 *
 * Dwa przebiegi na każdą porcję. Najpierw Deezer po ISRC, bo dopasowanie
 * po tym identyfikatorze jest twardsze. Czego Deezer nie zna, tym zajmuje
 * się ReccoBeats, który przyjmuje ID Spotify paczkami po 40.
 *
 * Każdy przerobiony utwór dostaje `bpm_checked_at`, także ten bez wyniku.
 * Dzięki temu kolejna próba nie wraca w kółko do tych samych beznadziejnych
 * przypadków.
 */
export async function enrichBpm(options: EnrichOptions = {}): Promise<EnrichProgress> {
  const {
    onProgress,
    signal,
    fetchImpl = fetch,
    deezerGet = jsonp,
    sleep = defaultSleep,
    loadPending = pendingBpmTracks,
    saveUpdates = applyBpmUpdates,
  } = options;

  const acquireDeezer = createRateLimiter(DEEZER_RATE.requests, DEEZER_RATE.perMs, Date.now, sleep);

  let processed = 0;
  let resolved = 0;

  for (;;) {
    if (signal?.cancelled) break;

    const portion = await loadPending(PORTION);
    if (portion.length === 0) break;

    const updates = new Map<string, BpmUpdate>();

    // Przebieg 1: Deezer, po jednym zapytaniu na utwór z ISRC.
    const withIsrc = portion.filter((track) => track.isrc !== null);
    await mapWithConcurrency(withIsrc, DEEZER_RATE.concurrency, async (track) => {
      if (signal?.cancelled || track.isrc === null) return;
      await acquireDeezer();

      try {
        const found = await lookupByIsrc(track.isrc, deezerGet);
        if (found.bpm !== null) {
          updates.set(track.id, {
            id: track.id,
            bpm: found.bpm,
            source: 'deezer',
            deezerYear: found.year,
          });
        } else if (found.year !== null) {
          // Tempa nie ma, ale rok i tak jest cenny: ratuje filtr lat
          // przy składankach i remasterach.
          updates.set(track.id, { id: track.id, bpm: null, source: null, deezerYear: found.year });
        }
      } catch (error) {
        if (error instanceof DeezerRateLimitError) {
          await sleep(DEEZER_RATE.perMs);
        }
        // Pojedyncza wywrotka nie może zatrzymać całej porcji.
        // Utwór po prostu trafi do przebiegu drugiego.
      }
    });

    // Przebieg 2: ReccoBeats dla wszystkiego, czego Deezer nie ustalił.
    const missing = portion.filter((track) => updates.get(track.id)?.bpm == null);
    for (const batch of chunk(missing, RECCOBEATS_BATCH)) {
      if (signal?.cancelled) break;

      try {
        const tempos = await lookupTempoBatch(
          batch.map((track) => track.id),
          fetchImpl,
        );
        for (const track of batch) {
          const tempo = tempos.get(track.id);
          if (tempo === undefined) continue;
          updates.set(track.id, {
            id: track.id,
            bpm: tempo,
            source: 'reccobeats',
            // Rok z Deezera mógł przyjść w przebiegu pierwszym, nie gubimy go.
            deezerYear: updates.get(track.id)?.deezerYear ?? null,
          });
        }
      } catch (error) {
        if (error instanceof ReccoBeatsRateLimitError) {
          await sleep(error.retryAfterMs);
        }
      }

      await sleep(RECCOBEATS_GAP_MS);
    }

    // Utwory bez żadnego trafienia też oznaczamy jako sprawdzone.
    const batchUpdates = portion.map<BpmUpdate>(
      (track) =>
        updates.get(track.id) ?? { id: track.id, bpm: null, source: null, deezerYear: null },
    );

    await saveUpdates(batchUpdates);

    processed += portion.length;
    resolved += batchUpdates.filter((update) => update.bpm !== null).length;
    onProgress?.({ processed, resolved });

    // Krótsza porcja niż zamówiona oznacza, że kolejka się skończyła.
    if (portion.length < PORTION) break;
  }

  return { processed, resolved };
}
