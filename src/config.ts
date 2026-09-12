/** Client ID aplikacji ze Spotify Developer Dashboard. */
export const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';

/** Czy aplikacja została w ogóle skonfigurowana. Ekran logowania na tym bazuje. */
export const isConfigured = SPOTIFY_CLIENT_ID.length > 0;

/**
 * Adres, na który Spotify odsyła po logowaniu. Musi być identyczny z wpisem
 * w dashboardzie. Domyślnie to bieżąca strona plus `/callback`, więc lokalnie
 * wychodzi `http://127.0.0.1:3000/callback`, a po wdrożeniu adres hostingu.
 */
export function redirectUri(): string {
  const configured = import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim();
  if (configured) return configured;
  return `${window.location.origin}/callback`;
}

/** Widełki suwaka BPM. Poniżej 40 i powyżej 220 nie ma sensownej muzyki do filtrowania. */
export const BPM_MIN = 40;
export const BPM_MAX = 220;

/** Widełki suwaka lat. Górna granica jedzie z zegarem, żeby nie trzeba było jej ruszać. */
export const YEAR_MIN = 1950;
export const YEAR_MAX = new Date().getFullYear();
