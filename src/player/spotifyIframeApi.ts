import { t } from '../i18n';

/**
 * Cienka warstwa nad Spotify iFrame API. Skrypt Spotify wstrzykuje
 * odtwarzacz jako iframe w miejsce wskazanego elementu i oddaje kontroler
 * z metodami play/pause/loadUri. Odtwarzanie idzie przez open.spotify.com,
 * więc nie potrzebuje ani dodatkowych zakresów, ani konta Premium.
 */

export const SCRIPT_URL = 'https://open.spotify.com/embed/iframe-api/v1';

/** Ile czekamy na skrypt Spotify, zanim uznamy, że coś go blokuje. */
const LOAD_TIMEOUT_MS = 15_000;

export type PlaybackUpdate = {
  playingURI: string;
  isPaused: boolean;
  isBuffering: boolean;
  /** Milisekundy. */
  duration: number;
  /** Milisekundy. */
  position: number;
};

export type EmbedController = {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  destroy: () => void;
  addListener: ((event: 'ready', cb: () => void) => void) &
    ((event: 'playback_update', cb: (event: { data: PlaybackUpdate }) => void) => void);
};

export type ControllerOptions = { uri: string; width?: string | number; height?: string | number };

export type IFrameApi = {
  createController: (
    element: HTMLElement,
    options: ControllerOptions,
    callback: (controller: EmbedController) => void,
  ) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameApi) => void;
  }
}

let apiPromise: Promise<IFrameApi> | null = null;

/**
 * Ładuje skrypt raz i pamięta obietnicę. Spotify woła globalny callback
 * tylko przy pierwszym załadowaniu, więc kolejne odtwarzacze muszą
 * korzystać z tego samego obiektu API.
 */
export function loadSpotifyIframeApi(): Promise<IFrameApi> {
  if (!apiPromise) {
    apiPromise = new Promise<IFrameApi>((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error(t('error.player.timeout')));
      }, LOAD_TIMEOUT_MS);

      window.onSpotifyIframeApiReady = (api) => {
        clearTimeout(timer);
        resolve(api);
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(new Error(t('error.player.failed')));
      };

      script.src = SCRIPT_URL;
      script.async = true;
      document.head.append(script);
    }).catch((error: unknown) => {
      // Nieudane ładowanie nie może zablokować kolejnych prób.
      apiPromise = null;
      throw error;
    });
  }
  return apiPromise;
}

/** Wyłącznie do testów: zapomina załadowane API, żeby kolejny test zaczął od zera. */
export function resetSpotifyIframeApiForTests(): void {
  apiPromise = null;
  delete window.onSpotifyIframeApiReady;
}

/** Tworzy kontroler w miejscu elementu i czeka, aż zgłosi gotowość. */
export function createController(
  api: IFrameApi,
  element: HTMLElement,
  options: ControllerOptions,
): Promise<EmbedController> {
  return new Promise((resolve) => {
    api.createController(element, options, (controller) => {
      controller.addListener('ready', () => resolve(controller));
    });
  });
}
