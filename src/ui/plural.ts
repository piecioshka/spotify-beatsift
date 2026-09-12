import { getLanguage, t } from '../i18n';

/**
 * Polska odmiana rzeczownika po liczebniku.
 *
 * Trzy formy: 1 utwór, 2-4 utwory, 5+ utworów. Wyjątek dotyczy nastek,
 * bo 12, 13 i 14 idą jak 5, a nie jak 2. Podobnie 112 czy 1113.
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count));
  if (n === 1) return one;

  const lastDigit = n % 10;
  const lastTwo = n % 100;

  const isTeen = lastTwo >= 12 && lastTwo <= 14;
  const isFew = lastDigit >= 2 && lastDigit <= 4 && !isTeen;

  return isFew ? few : many;
}

/** Sam rzeczownik w odmianie właściwej dla bieżącego języka. */
export function tracksLabel(count: number): string {
  if (getLanguage() === 'en') {
    return Math.abs(Math.trunc(count)) === 1 ? t('tracks.one') : t('tracks.many');
  }
  return plural(count, t('tracks.one'), t('tracks.few'), t('tracks.many'));
}

/** Liczba z rzeczownikiem, najczęstszy przypadek w tej aplikacji. */
export function tracksCount(count: number): string {
  return `${count} ${tracksLabel(count)}`;
}
