/**
 * Wyciąganie roku wydania i godzenie dwóch źródeł, które się nie zgadzają.
 *
 * Spotify podaje datę wydania albumu, nie utworu. Piosenka z 2003 roku,
 * którą masz w ulubionych ze składanki z 2015, dostanie od Spotify rok 2015
 * i wypadnie z filtra „lata 2000-2010”. Deezer zwraca datę przypisaną
 * do utworu, więc zwykle trafia bliżej premiery.
 */

/** Najstarszy rok, jaki uznajemy za sensowny. Poniżej to na pewno śmieciowe dane. */
const EARLIEST_PLAUSIBLE_YEAR = 1900;

/**
 * Wycina rok z daty w formacie Spotify albo Deezera.
 *
 * Spotify potrafi podać `2003`, `2003-07` albo `2003-07-14`, zależnie
 * od `release_date_precision`. Deezer używa `2003-07-14`, ale przy braku
 * danych wstawia `0000-00-00`.
 */
export function parseReleaseYear(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = /^(\d{4})/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  if (year < EARLIEST_PLAUSIBLE_YEAR) return null;

  // Rok z przyszłości oznacza błąd w katalogu, nie premierę.
  if (year > new Date().getFullYear() + 1) return null;

  return year;
}

/**
 * Rok użyty do filtrowania: wcześniejszy z dwóch, bo remaster i składanka
 * zawsze mają datę późniejszą niż oryginał. Gdy znamy tylko jedno źródło,
 * bierzemy je bez dyskusji.
 */
export function effectiveReleaseYear(
  spotifyYear: number | null | undefined,
  deezerYear: number | null | undefined,
): number | null {
  const candidates = [spotifyYear, deezerYear].filter(
    (year): year is number => typeof year === 'number' && Number.isFinite(year),
  );
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}
