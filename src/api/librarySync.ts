import { pruneUnseenTracks } from '../db/queries';
import { setSyncState, SYNC_KEYS } from '../db/schema';
import { t } from '../i18n';
import type { SourceSelection } from '../sources/selection';
import { syncLikedTracks } from './likedTracks';
import { syncPlaylistTracks } from './playlistTracks';
import { SpotifyApiError, SpotifyAuthError } from './spotifyClient';

export type SourceProgress = {
  sourceIndex: number;
  sourceCount: number;
  sourceName: string;
  /** Postęp w bieżącym źródle. */
  saved: number;
  total: number;
  /** Narastająco po wszystkich źródłach do tej pory, do jednego paska postępu. */
  savedSoFar: number;
  totalSoFar: number;
};

/** Playlista, której Spotify już nie oddaje (404). Przebieg idzie dalej bez niej. */
export type SkippedSource = {
  name: string;
  status: number;
  endpoint: string;
  message: string;
};

export type SourcesSyncResult = {
  saved: number;
  removed: number;
  stoppedEarly: boolean;
  skipped: SkippedSource[];
};

/**
 * Błąd jednego źródła z doklejoną nazwą tego źródła. Sama treść od Spotify
 * („Resource not found”) nie mówi, która z kilku playlist zawiodła.
 */
export class SourceSyncError extends Error {
  constructor(
    readonly sourceName: string,
    readonly original: unknown,
  ) {
    super(original instanceof Error ? original.message : String(original));
    this.name = 'SourceSyncError';
  }
}

type SourceRun = { saved: number; total: number; stoppedEarly: boolean };

export type SourcesDeps = {
  syncLiked: (options: {
    seenAt: string;
    full: boolean;
    since: string | null;
    signal?: { cancelled: boolean };
    onProgress: (progress: { saved: number; total: number }) => void;
  }) => Promise<SourceRun>;
  syncPlaylist: (options: {
    playlistId: string;
    seenAt: string;
    signal?: { cancelled: boolean };
    onProgress: (progress: { saved: number; total: number }) => void;
  }) => Promise<SourceRun>;
  prune: (seenAt: string) => Promise<number>;
  markFullSync: (seenAt: string) => Promise<void>;
};

const defaultDeps: SourcesDeps = {
  syncLiked: (options) => syncLikedTracks({ ...options, prune: false }),
  syncPlaylist: (options) => syncPlaylistTracks(options),
  prune: pruneUnseenTracks,
  markFullSync: (seenAt) => setSyncState(SYNC_KEYS.lastFullSyncAt, seenAt),
};

export type SourcesSyncOptions = {
  selection: SourceSelection;
  /** Pełne przejście wszystkich źródeł, na końcu porządki. */
  full?: boolean;
  /** Dla polubionych: `added_at` najnowszego znanego utworu (synchronizacja przyrostowa). */
  since?: string | null;
  signal?: { cancelled: boolean };
  onProgress?: (progress: SourceProgress) => void;
  deps?: SourcesDeps;
};

/**
 * Przechodzi wybrane źródła po kolei ze wspólnym `seenAt`. Dzięki temu
 * jedno czyszczenie na końcu usuwa wszystko, czego nie pokazało ŻADNE
 * źródło, także utwory z playlisty odznaczonej w ustawieniach.
 *
 * Czyścimy tylko w trybie pełnym i tylko po komplecie: przerwany przebieg
 * wyrzuciłby utwory, do których po prostu nie doszliśmy.
 */
export async function syncSources(options: SourcesSyncOptions): Promise<SourcesSyncResult> {
  const { selection, full = false, since = null, signal, onProgress } = options;
  const deps = options.deps ?? defaultDeps;
  const seenAt = new Date().toISOString();

  type Source = {
    name: string;
    isPlaylist: boolean;
    run: (report: SourceRunReport) => Promise<SourceRun>;
  };
  type SourceRunReport = (progress: { saved: number; total: number }) => void;

  const sources: Source[] = [];
  if (selection.liked) {
    sources.push({
      name: t('sources.liked'),
      isPlaylist: false,
      run: (onProgress) => deps.syncLiked({ seenAt, full, since, signal, onProgress }),
    });
  }
  for (const playlist of selection.playlists) {
    sources.push({
      name: playlist.name,
      isPlaylist: true,
      run: (onProgress) =>
        deps.syncPlaylist({ playlistId: playlist.id, seenAt, signal, onProgress }),
    });
  }

  let saved = 0;
  let total = 0;
  let stoppedEarly = false;
  const skipped: SkippedSource[] = [];

  for (const [index, source] of sources.entries()) {
    if (signal?.cancelled) {
      stoppedEarly = true;
      break;
    }

    const report: SourceRunReport = (progress) =>
      onProgress?.({
        sourceIndex: index,
        sourceCount: sources.length,
        sourceName: source.name,
        ...progress,
        savedSoFar: saved + progress.saved,
        totalSoFar: total + progress.total,
      });
    report({ saved: 0, total: 0 });

    let result: SourceRun;
    try {
      result = await source.run(report);
    } catch (err) {
      if (err instanceof SpotifyAuthError) throw err;
      // Usunięta playlista, wciąż zapisana w wyborze źródeł, odpowiada 404.
      // Nie ma powodu, żeby przez nią przepadły pozostałe źródła.
      if (source.isPlaylist && err instanceof SpotifyApiError && err.status === 404) {
        skipped.push({
          name: source.name,
          status: err.status,
          endpoint: err.endpoint,
          message: err.message,
        });
        continue;
      }
      throw new SourceSyncError(source.name, err);
    }
    saved += result.saved;
    total += result.total;
    if (result.stoppedEarly || signal?.cancelled) {
      stoppedEarly = true;
      break;
    }
  }

  // Pominięte źródło to niepełny obraz biblioteki, więc też bez porządków:
  // lepiej zostawić kilka zbędnych utworów niż skasować cudze BPM przez pomyłkę.
  let removed = 0;
  if (full && !stoppedEarly && skipped.length === 0) {
    removed = await deps.prune(seenAt);
    await deps.markFullSync(seenAt);
  }

  return { saved, removed, stoppedEarly, skipped };
}
