import {
  applyUpdate,
  compareByAddedDesc,
  compareByName,
  matchesFilter,
  mergeIncoming,
  type BpmUpdate,
} from './rows';
import { getDb } from './schema';
import type { IncomingTrack, LibraryStats, TrackFilter, TrackRow } from './types';

export type { BpmUpdate } from './rows';

export async function findTracks(filter: TrackFilter): Promise<TrackRow[]> {
  const db = await getDb();
  const rows = await db.getAll('tracks');
  return rows.filter((row) => matchesFilter(row, filter)).sort(compareByName);
}

export async function countTracks(filter: TrackFilter): Promise<number> {
  const rows = await findTracks(filter);
  return rows.length;
}

/** Zapisuje stronę utworów w jednej transakcji. */
export async function upsertTracks(
  tracks: IncomingTrack[],
  seenAt: string = new Date().toISOString(),
): Promise<void> {
  if (tracks.length === 0) return;
  const db = await getDb();

  const tx = db.transaction('tracks', 'readwrite');
  for (const track of tracks) {
    const existing = await tx.store.get(track.id);
    await tx.store.put(mergeIncoming(existing, track, seenAt));
  }
  await tx.done;
}

/** Utwory, dla których nie próbowaliśmy jeszcze ustalić BPM. */
export async function pendingBpmTracks(limit: number): Promise<TrackRow[]> {
  const db = await getDb();
  const rows = await db.getAll('tracks');
  return rows
    .filter((row) => row.bpm_checked_at === null)
    .sort(compareByAddedDesc)
    .slice(0, limit);
}

/**
 * Zapisuje wyniki jednej paczki. Utwór usunięty z bazy w międzyczasie
 * (pełna synchronizacja w innej karcie) po prostu pomijamy.
 */
export async function applyBpmUpdates(updates: BpmUpdate[]): Promise<void> {
  if (updates.length === 0) return;
  const db = await getDb();
  const checkedAt = new Date().toISOString();

  const tx = db.transaction('tracks', 'readwrite');
  for (const update of updates) {
    const row = await tx.store.get(update.id);
    if (row) await tx.store.put(applyUpdate(row, update, checkedAt));
  }
  await tx.done;
}

export async function libraryStats(): Promise<LibraryStats> {
  const db = await getDb();
  const rows = await db.getAll('tracks');

  const stats: LibraryStats = { total: rows.length, withBpm: 0, withYear: 0, pending: 0 };
  for (const row of rows) {
    if (row.bpm_rounded !== null) stats.withBpm += 1;
    if (row.release_year !== null) stats.withYear += 1;
    if (row.bpm_checked_at === null) stats.pending += 1;
  }
  return stats;
}

/**
 * Usuwa utwory, których Spotify nie pokazało w ostatniej pełnej
 * synchronizacji, czyli te wypisane z ulubionych.
 */
export async function pruneUnseenTracks(seenAt: string): Promise<number> {
  const db = await getDb();
  let removed = 0;

  const tx = db.transaction('tracks', 'readwrite');
  let cursor = await tx.store.openCursor();
  while (cursor) {
    const { last_seen_at } = cursor.value;
    if (last_seen_at === null || last_seen_at < seenAt) {
      await cursor.delete();
      removed += 1;
    }
    cursor = await cursor.continue();
  }
  await tx.done;

  return removed;
}
