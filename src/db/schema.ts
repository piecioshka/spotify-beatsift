import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TrackRow } from './types';

const DB_NAME = 'beatsift';
const DB_VERSION = 1;

/**
 * IndexedDB, a nie localStorage. Biblioteka ulubionych potrafi mieć kilka
 * tysięcy pozycji, a localStorage trzyma tylko stringi i ma limit rzędu
 * kilku megabajtów na domenę. Filtrowanie i tak robimy w pamięci, bo kilka
 * tysięcy rekordów przechodzi przez `Array.filter` w ułamku milisekundy.
 */
export interface BeatsiftSchema extends DBSchema {
  tracks: { key: string; value: TrackRow };
  sync_state: { key: string; value: { key: string; value: string } };
}

export type Database = IDBPDatabase<BeatsiftSchema>;

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = openDB<BeatsiftSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('tracks', { keyPath: 'id' });
        db.createObjectStore('sync_state', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

/** Kasuje wszystko. Podpięte pod „wyczyść dane” w ustawieniach. */
export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['tracks', 'sync_state'], 'readwrite');
  await Promise.all([tx.objectStore('tracks').clear(), tx.objectStore('sync_state').clear()]);
  await tx.done;
}

export async function getSyncState(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.get('sync_state', key);
  return row?.value ?? null;
}

export async function setSyncState(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.put('sync_state', { key, value });
}

export const SYNC_KEYS = {
  /** `added_at` najnowszego utworu zapisanego przy ostatniej synchronizacji. */
  lastAddedAt: 'liked.lastAddedAt',
  /** Kiedy ostatnio przeszliśmy całą bibliotekę. */
  lastFullSyncAt: 'liked.lastFullSyncAt',
} as const;
