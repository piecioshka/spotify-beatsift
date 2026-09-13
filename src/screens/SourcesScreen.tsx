import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchLikedCount } from '../api/likedTracks';
import { fetchOwnPlaylists, type PlaylistSummary } from '../api/playlists';
import { fetchProfile, loadCachedProfile, saveProfile } from '../api/profile';
import { SpotifyAuthError } from '../api/spotifyClient';
import { useT } from '../i18n';
import {
  DEFAULT_SELECTION,
  isEmptySelection,
  loadSelection,
  saveSelection,
  type SourceSelection,
} from '../sources/selection';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { tracksCount } from '../ui/plural';
import { usePageTitle } from '../ui/usePageTitle';
import './SourcesScreen.css';

type Catalog = { likedTotal: number; playlists: PlaylistSummary[] };

/** Lista playlist i licznik polubionych; profil jest potrzebny, żeby odsiać cudze playlisty. */
async function loadCatalog(): Promise<Catalog> {
  let profile = loadCachedProfile();
  if (!profile) {
    profile = await fetchProfile();
    saveProfile(profile);
  }
  const [playlists, likedTotal] = await Promise.all([
    fetchOwnPlaylists(profile.id),
    fetchLikedCount(),
  ]);
  return { likedTotal, playlists };
}

/**
 * Wybór źródeł: polubione utwory i własne playlisty. Pokazuje się raz po
 * pierwszym logowaniu, potem tylko z ustawień. Zapis prowadzi zawsze do
 * pełnej synchronizacji, bo tylko ona sprząta utwory z odznaczonych źródeł.
 */
export function SourcesScreen() {
  const t = useT();
  usePageTitle(t('sources.title'));
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<SourceSelection>(
    () => loadSelection() ?? DEFAULT_SELECTION,
  );

  useEffect(() => {
    let active = true;
    loadCatalog()
      .then((loaded) => active && setCatalog(loaded))
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof SpotifyAuthError) {
          navigate('/', { replace: true });
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const playlists = catalog?.playlists ?? [];
  const selectedIds = new Set(selection.playlists.map((playlist) => playlist.id));
  const selectedCount =
    (selection.liked ? 1 : 0) + playlists.filter((playlist) => selectedIds.has(playlist.id)).length;
  const totalCount = 1 + playlists.length;
  const allSelected = catalog !== null && selectedCount === totalCount;
  const someSelected = selectedCount > 0 && !allSelected;

  // `indeterminate` nie ma atrybutu w JSX, więc ustawiamy je na elemencie.
  const allRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggleAll() {
    if (allSelected) {
      setSelection({ liked: false, playlists: [] });
    } else {
      setSelection({
        liked: true,
        playlists: playlists.map(({ id, name }) => ({ id, name })),
      });
    }
  }

  function toggleLiked(checked: boolean) {
    setSelection((previous) => ({ ...previous, liked: checked }));
  }

  function togglePlaylist(playlist: PlaylistSummary, checked: boolean) {
    setSelection((previous) => ({
      ...previous,
      playlists: checked
        ? [
            ...previous.playlists.filter((p) => p.id !== playlist.id),
            { id: playlist.id, name: playlist.name },
          ]
        : previous.playlists.filter((p) => p.id !== playlist.id),
    }));
  }

  function save() {
    // Zapisujemy tylko playlisty, które nadal istnieją, w kolejności z Spotify.
    const kept = playlists
      .filter((playlist) => selectedIds.has(playlist.id))
      .map(({ id, name }) => ({ id, name }));
    saveSelection({ liked: selection.liked, playlists: kept });
    navigate('/sync?full=1', { replace: true });
  }

  const empty = isEmptySelection(selection);

  return (
    <main className="page sources">
      <h1 className="page__title">{t('sources.title')}</h1>
      <p className="text-muted">{t('sources.intro')}</p>

      {error ? (
        <Card title={t('sources.failed')}>
          <p className="text-danger">{error}</p>
        </Card>
      ) : null}

      <ul className="sources__list">
        <li className="sources__row sources__row--all">
          <label className="sources__option">
            <input
              ref={allRef}
              type="checkbox"
              className="sources__check"
              checked={allSelected}
              disabled={catalog === null}
              onChange={toggleAll}
            />
            <span className="sources__name">{t('sources.all')}</span>
          </label>
        </li>

        <li className="sources__row">
          <label className="sources__option">
            <input
              type="checkbox"
              className="sources__check"
              checked={selection.liked}
              onChange={(event) => toggleLiked(event.target.checked)}
            />
            <span className="sources__name">{t('sources.liked')}</span>
          </label>
          {catalog ? (
            <span className="sources__count text-muted text-small tabular">
              {tracksCount(catalog.likedTotal)}
            </span>
          ) : null}
        </li>

        {playlists.map((playlist) => (
          <li key={playlist.id} className="sources__row">
            <label className="sources__option">
              <input
                type="checkbox"
                className="sources__check"
                checked={selectedIds.has(playlist.id)}
                onChange={(event) => togglePlaylist(playlist, event.target.checked)}
              />
              <span className="sources__name">
                {playlist.name}
                {playlist.collaborative ? (
                  <span className="sources__tag text-muted text-small">
                    {' '}
                    · {t('sources.collaborative')}
                  </span>
                ) : null}
              </span>
            </label>
            <span className="sources__count text-muted text-small tabular">
              {tracksCount(playlist.total)}
            </span>
          </li>
        ))}
      </ul>

      {catalog === null && !error ? (
        <p className="text-muted text-small" role="status">
          {t('sources.loading')}
        </p>
      ) : null}
      {catalog !== null && playlists.length === 0 ? (
        <p className="text-muted text-small">{t('sources.empty')}</p>
      ) : null}

      <div className="sources__actions">
        <Button label={t('sources.save')} onClick={save} disabled={empty || catalog === null} />
        {empty ? <p className="text-muted text-small">{t('sources.none')}</p> : null}
      </div>
    </main>
  );
}
