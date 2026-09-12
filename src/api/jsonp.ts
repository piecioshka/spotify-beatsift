import { t } from '../i18n';

/**
 * JSONP dla API, które nie oddają nagłówka `Access-Control-Allow-Origin`.
 *
 * Deezer jest dokładnie takim przypadkiem: zwykły `fetch` z przeglądarki
 * pada na CORS, ale `?output=jsonp&callback=nazwa` zwraca skrypt wołający
 * globalną funkcję z odpowiedzią. Wstrzykujemy `<script>`, czekamy na
 * wywołanie i sprzątamy po sobie.
 *
 * Cena: skrypt z cudzej domeny wykonuje się w naszej stronie. Dla API
 * Deezera, które i tak kontroluje odpowiedź, to akceptowalne; alternatywą
 * byłby własny serwer pośredniczący.
 */

let counter = 0;

/** Domyślnie tyle czekamy na odpowiedź, zanim uznamy zapytanie za nieudane. */
const DEFAULT_TIMEOUT_MS = 10_000;

export type JsonpOptions = {
  timeoutMs?: number;
  /** Nazwa parametru z nazwą callbacku, u Deezera `callback`. */
  callbackParam?: string;
  /** Dodatkowe parametry, u Deezera `output=jsonp`. */
  extraParams?: Record<string, string>;
};

export function jsonp(url: string, options: JsonpOptions = {}): Promise<unknown> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    callbackParam = 'callback',
    extraParams = { output: 'jsonp' },
  } = options;

  return new Promise((resolve, reject) => {
    counter += 1;
    const name = `__beatsiftJsonp${counter}`;
    const script = document.createElement('script');

    const cleanup = () => {
      clearTimeout(timer);
      Reflect.deleteProperty(window, name);
      script.remove();
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(t('error.jsonp.timeout')));
    }, timeoutMs);

    Reflect.set(window, name, (data: unknown) => {
      cleanup();
      resolve(data);
    });

    script.onerror = () => {
      cleanup();
      reject(new Error(t('error.jsonp.failed')));
    };

    const target = new URL(url);
    for (const [key, value] of Object.entries(extraParams)) target.searchParams.set(key, value);
    target.searchParams.set(callbackParam, name);

    script.src = target.toString();
    document.head.append(script);
  });
}
