import { effectiveReleaseYear } from './releaseYear';
import type { BpmSource, IncomingTrack, TrackFilter, TrackRow } from './types';

/**
 * Czysta logika na pojedynczych rekordach. Warstwa IndexedDB tylko czyta
 * i zapisuje, a wszystko, co da się pomylić, siedzi tutaj i ma testy.
 */

export type BpmUpdate = {
  id: string;
  bpm: number | null;
  source: BpmSource | null;
  /** Rok z Deezera, o ile go dostaliśmy. Dla ReccoBeats zawsze null. */
  deezerYear?: number | null;
};

/**
 * Łączy utwór ze Spotify z tym, co już leży w bazie.
 *
 * Celowo nie rusza kolumn z BPM. Utwór może pojawić się ponownie przy
 * kolejnej synchronizacji, a wtedy szkoda byłoby wyrzucić wynik, po który
 * kolejka chodziła do Deezera kilka minut.
 */
export function mergeIncoming(
  existing: TrackRow | undefined,
  incoming: IncomingTrack,
  seenAt: string,
): TrackRow {
  const deezerYear = existing?.release_year_deezer ?? null;

  return {
    id: incoming.id,
    name: incoming.name,
    artists: incoming.artists,
    album: incoming.album,
    isrc: incoming.isrc,
    duration_ms: incoming.durationMs,
    added_at: incoming.addedAt,
    bpm: existing?.bpm ?? null,
    bpm_rounded: existing?.bpm_rounded ?? null,
    bpm_source: existing?.bpm_source ?? null,
    bpm_checked_at: existing?.bpm_checked_at ?? null,
    release_year_spotify: incoming.releaseYearSpotify,
    release_year_deezer: deezerYear,
    release_year: effectiveReleaseYear(incoming.releaseYearSpotify, deezerYear),
    last_seen_at: seenAt,
  };
}

/**
 * Nakłada wynik jednego sprawdzenia tempa. Znacznik `bpm_checked_at` dostaje
 * także utwór bez wyniku, żeby kolejka nie wracała do niego w kółko.
 */
export function applyUpdate(row: TrackRow, update: BpmUpdate, checkedAt: string): TrackRow {
  const deezerYear = update.deezerYear ?? row.release_year_deezer;

  return {
    ...row,
    bpm: update.bpm,
    bpm_rounded: update.bpm === null ? null : Math.round(update.bpm),
    bpm_source: update.source,
    bpm_checked_at: checkedAt,
    release_year_deezer: deezerYear,
    release_year: effectiveReleaseYear(row.release_year_spotify, deezerYear),
  };
}

/**
 * Utwory bez ustalonego BPM albo bez roku wydania nigdy nie pasują.
 * To zachowanie zamierzone: skoro nie wiemy, czy utwór pasuje, nie wrzucamy
 * go do playlisty.
 */
export function matchesFilter(row: TrackRow, filter: TrackFilter): boolean {
  if (row.bpm_rounded === null || row.release_year === null) return false;
  return (
    row.bpm_rounded >= filter.bpmMin &&
    row.bpm_rounded <= filter.bpmMax &&
    row.release_year >= filter.yearMin &&
    row.release_year <= filter.yearMax
  );
}

/** Porządek listy wyników: po nazwie, bez rozróżniania wielkości liter. */
export function compareByName(a: TrackRow, b: TrackRow): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/** Kolejka BPM idzie od najnowszych ulubionych; utwory bez daty na koniec. */
export function compareByAddedDesc(a: TrackRow, b: TrackRow): number {
  if (a.added_at === b.added_at) return 0;
  if (a.added_at === null) return 1;
  if (b.added_at === null) return -1;
  return a.added_at < b.added_at ? 1 : -1;
}
