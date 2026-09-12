/** Źródło, z którego przyszło BPM. Pokazujemy je przy każdym wyniku. */
export type BpmSource = 'deezer' | 'reccobeats';

/** Rekord ze składu `tracks` w IndexedDB. Nazwy pól zostały z czasów SQLite. */
export type TrackRow = {
  id: string;
  name: string;
  artists: string;
  album: string | null;
  isrc: string | null;
  duration_ms: number | null;
  added_at: string | null;
  bpm: number | null;
  bpm_rounded: number | null;
  bpm_source: BpmSource | null;
  bpm_checked_at: string | null;
  release_year_spotify: number | null;
  release_year_deezer: number | null;
  release_year: number | null;
  /**
   * Kiedy utwór ostatnio pojawił się w odpowiedzi Spotify. Pełna
   * synchronizacja kasuje po tym polu wszystko, czego już nie ma
   * w ulubionych.
   */
  last_seen_at: string | null;
};

/** Utwór przygotowany do zapisu, prosto z odpowiedzi Spotify. */
export type IncomingTrack = {
  id: string;
  name: string;
  artists: string;
  album: string | null;
  isrc: string | null;
  durationMs: number | null;
  addedAt: string | null;
  releaseYearSpotify: number | null;
};

export type TrackFilter = {
  bpmMin: number;
  bpmMax: number;
  yearMin: number;
  yearMax: number;
};

export type LibraryStats = {
  total: number;
  withBpm: number;
  withYear: number;
  pending: number;
};
