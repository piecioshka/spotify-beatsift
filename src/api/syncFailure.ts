import { t } from '../i18n';
import { SourceSyncError } from './librarySync';
import { SpotifyApiError } from './spotifyClient';

export type FailureDetail = { label: string; value: string };

/** Co pokazać na karcie przerwanej synchronizacji: treść błędu i szczegóły pod nią. */
export type SyncFailure = { message: string; details: FailureDetail[] };

/**
 * Rozkłada błąd synchronizacji na treść i listę szczegółów: źródło, status
 * HTTP, żądanie, podpowiedź i godzinę. Sama treść od Spotify („Resource not
 * found”) nie mówi, co poszło nie tak ani gdzie.
 */
export function describeSyncFailure(err: unknown, now: Date = new Date()): SyncFailure {
  const sourceName = err instanceof SourceSyncError ? err.sourceName : null;
  const cause = err instanceof SourceSyncError ? err.original : err;
  const message = cause instanceof Error ? cause.message : String(cause);
  const details: FailureDetail[] = [];

  if (sourceName) details.push({ label: t('sync.error.source'), value: sourceName });

  if (cause instanceof SpotifyApiError) {
    details.push({ label: t('sync.error.status'), value: String(cause.status) });
    if (cause.endpoint) details.push({ label: t('sync.error.endpoint'), value: cause.endpoint });
    const hint = statusHint(cause.status);
    if (hint) details.push({ label: t('sync.error.hint'), value: hint });
  }

  details.push({ label: t('sync.error.time'), value: formatTime(now) });
  return { message, details };
}

function statusHint(status: number): string | null {
  if (status === 404) return t('sync.error.hint.notFound');
  if (status === 403) return t('sync.error.hint.forbidden');
  if (status === 429) return t('sync.error.hint.rateLimit');
  if (status >= 500) return t('sync.error.hint.server');
  return null;
}

/** `YYYY-MM-DD HH:mm:ss` w czasie lokalnym. */
export function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
