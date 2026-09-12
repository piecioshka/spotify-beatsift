/**
 * Wszystkie teksty interfejsu w dwóch językach. Polski jest źródłem prawdy
 * dla listy kluczy; angielski musi mieć dokładnie te same klucze, czego
 * pilnuje typ `Messages`.
 */
export const pl = {
  'app.name': 'Beatsift',

  'nav.label': 'Nawigacja',
  'nav.github': 'Kod źródłowy na GitHubie',
  'lang.label': 'Język',
  'lang.pl': 'Polski',
  'lang.en': 'English',

  'login.subtitle':
    'Przesiej ulubione ze Spotify po tempie i roku wydania, a wynik zapisz jako playlistę.',
  'login.button': 'Zaloguj przez Spotify',
  'login.failed': 'Logowanie się nie udało.',
  'login.missingClientId.title': 'Brakuje Client ID',
  'login.missingClientId.body':
    'Skopiuj plik .env.example do .env i wklej Client ID swojej aplikacji ze Spotify Developer Dashboard, potem uruchom projekt ponownie. Szczegóły są w README.',

  'callback.title': 'Logowanie',
  'callback.failedTitle': 'Logowanie się nie udało',
  'callback.back': 'Wróć do ekranu logowania',

  'sync.title': 'Synchronizacja',
  'sync.tracks.label': 'Pobieranie ulubionych',
  'sync.tracks.note': 'Spotify oddaje bibliotekę stronami po 50 utworów.',
  'sync.bpm.label': 'Ustalanie tempa',
  'sync.bpm.note':
    'Spotify nie udostępnia już BPM, więc pytamy Deezera i ReccoBeats. Przy dużej bibliotece potrafi to potrwać kilka minut. Nie zamykaj tej karty.',
  'sync.stats.total': 'Utwory w bazie',
  'sync.stats.withBpm': 'Z ustalonym BPM',
  'sync.stats.withYear': 'Ze znanym rokiem',
  'sync.stats.removed': 'Usunięto z ulubionych',
  'sync.stats.withoutBpm':
    '{n} utworów zostało bez tempa. Żadne ze źródeł ich nie zna, więc nie pojawią się w wynikach filtra.',
  'sync.error.title': 'Synchronizacja przerwana',
  'sync.retry': 'Spróbuj ponownie',
  'sync.goToFilter': 'Przejdź do filtra',

  'filter.title': 'Filtr',
  'filter.tempo': 'Tempo',
  'filter.year': 'Rok wydania',
  'filter.searching': 'Szukam…',
  'filter.sort': 'Sortuj',
  'filter.compact': 'Zwarty widok',
  'filter.export': 'Zapisz jako playlistę ({n})',
  'filter.exported.title': 'Playlista gotowa',
  'filter.exported.added': 'Dodano {count}.',
  'filter.exported.open': 'Otwórz w Spotify',
  'filter.exportFailed': 'Nie udało się zapisać playlisty',
  'filter.empty.title': 'Nic nie pasuje',
  'filter.empty.noLibrary': 'Biblioteka jest pusta. Wróć do synchronizacji i pobierz ulubione.',
  'filter.empty.noBpm':
    'Żaden utwór nie ma jeszcze ustalonego tempa. Uruchom synchronizację ponownie.',
  'filter.empty.hint':
    'Tempo znamy dla {withBpm} z {total} utworów. Poza filtrem zostaje {withoutBpm} bez tempa i {withoutYear} bez roku wydania. Spróbuj poszerzyć któryś z zakresów.',

  'sort.name': 'Tytuł A-Z',
  'sort.artists': 'Wykonawca A-Z',
  'sort.bpm-asc': 'BPM rosnąco',
  'sort.bpm-desc': 'BPM malejąco',
  'sort.year-asc': 'Rok rosnąco',
  'sort.year-desc': 'Rok malejąco',
  'sort.added-desc': 'Ostatnio dodane',

  'settings.title': 'Ustawienia',
  'settings.library': 'Biblioteka',
  'settings.fetched': 'Pobrane',
  'settings.withBpm': 'Z ustalonym tempem',
  'settings.withYear': 'Ze znanym rokiem',
  'settings.pending': 'Czeka na sprawdzenie',
  'settings.checkNew': 'Sprawdź nowe ulubione',
  'settings.fullSync': 'Przejdź całą bibliotekę',
  'settings.reset': 'Wyczyść pobrane dane',
  'settings.resetConfirm':
    'Wyczyścić pobrane dane?\n\nUtwory i ustalone tempo znikną z pamięci przeglądarki. Ponowne pobranie tempa dla dużej biblioteki potrwa kilka minut.',
  'settings.signOut': 'Wyloguj',
  'settings.footnote':
    'Tempo pochodzi z Deezera i ReccoBeats. Spotify wyłączyło swoje API z danymi o BPM w listopadzie 2024, więc wartości mogą różnić się od tych, które pamiętasz z dawnych narzędzi.',

  'consent.title': 'Ta aplikacja zapisuje dane w Twojej przeglądarce',
  'consent.body':
    'Bez ciasteczek i bez śledzenia. W localStorage i IndexedDB lądują: tokeny logowania do Spotify, pobrana lista ulubionych z tempem oraz preferencje (język, zakresy, sortowanie). Nic nie wychodzi poza tę przeglądarkę. Dane usuniesz w każdej chwili przez Wyloguj i „Wyczyść pobrane dane” w ustawieniach. Bez zgody logowanie nie zadziała, bo sesji nie ma gdzie zapisać.',
  'consent.accept': 'Akceptuję',
  'consent.reject': 'Odrzucam',
  'consent.required':
    'Logowanie wymaga zgody na zapis danych w przeglądarce. Odrzucone dane zostały usunięte; zgodę możesz dać ponownie na pasku u dołu ekranu po odświeżeniu strony.',

  'crash.title': 'Coś poszło nie tak',
  'crash.body':
    'Aplikacja napotkała błąd, którego nie umiała obsłużyć. Odświeżenie zwykle pomaga. Jeśli błąd wraca, wyczyść zapisane dane: znikną tokeny logowania i pobrana biblioteka, a Ty zaczniesz od ekranu logowania.',
  'crash.reload': 'Odśwież stronę',
  'crash.wipe': 'Wyczyść dane i zacznij od nowa',
  'crash.details': 'Szczegóły błędu',

  'player.label': 'Odtwarzacz',
  'player.playing': 'Gra',
  'player.paused': 'Wstrzymano',
  'player.close': 'Zamknij odtwarzacz',

  'track.play': 'Odtwórz',
  'track.pause': 'Wstrzymaj',
  'track.unknownYear': 'rok nieznany',
  'track.otherYear': 'wydanie {year}',
  'track.noSource': 'brak',
  'track.unknownArtist': 'Nieznany wykonawca',

  'tracks.one': 'utwór',
  'tracks.few': 'utwory',
  'tracks.many': 'utworów',

  'range.from': 'od',
  'range.to': 'do',

  'playlist.description': 'Wyfiltrowane przez Beatsift.',

  'error.spotify.sessionExpired': 'Sesja Spotify wygasła. Zaloguj się ponownie.',
  'error.spotify.forbidden': 'Spotify odmówiło dostępu.',
  'error.spotify.unavailable': 'Spotify nie odpowiada. Spróbuj później.',
  'error.spotify.generic': 'Błąd Spotify.',
  'error.spotify.status': 'Spotify odpowiedziało statusem {status}.',
  'error.auth.mismatch':
    'Powrót ze Spotify nie pasuje do rozpoczętego logowania. Spróbuj jeszcze raz.',
  'error.auth.noAccessToken': 'Spotify nie oddało access tokenu.',
  'error.auth.noRefreshToken': 'Spotify nie oddało refresh tokenu.',
  'error.deezer.rateLimit': 'Deezer przyciął limit zapytań.',
  'error.deezer.badShape': 'Deezer zwrócił odpowiedź w nieznanym kształcie.',
  'error.deezer.generic': 'Deezer zwrócił błąd.',
  'error.reccobeats.rateLimit': 'ReccoBeats przyciął limit zapytań.',
  'error.reccobeats.status': 'ReccoBeats odpowiedział statusem {status}.',
  'error.jsonp.timeout': 'Serwer nie odpowiedział w wyznaczonym czasie.',
  'error.jsonp.failed': 'Nie udało się pobrać odpowiedzi.',
  'error.player.timeout': 'Odtwarzacz Spotify nie załadował się w wyznaczonym czasie.',
  'error.player.failed': 'Nie udało się pobrać odtwarzacza Spotify.',
} as const;

export type MessageKey = keyof typeof pl;
export type Messages = Record<MessageKey, string>;

export const en: Messages = {
  'app.name': 'Beatsift',

  'nav.label': 'Navigation',
  'nav.github': 'Source code on GitHub',
  'lang.label': 'Language',
  'lang.pl': 'Polski',
  'lang.en': 'English',

  'login.subtitle':
    'Sift your Spotify Liked Songs by tempo and release year, then save the result as a playlist.',
  'login.button': 'Log in with Spotify',
  'login.failed': 'Login failed.',
  'login.missingClientId.title': 'Client ID is missing',
  'login.missingClientId.body':
    'Copy .env.example to .env, paste the Client ID of your app from the Spotify Developer Dashboard and restart the project. Details are in the README.',

  'callback.title': 'Login',
  'callback.failedTitle': 'Login failed',
  'callback.back': 'Back to the login screen',

  'sync.title': 'Sync',
  'sync.tracks.label': 'Fetching Liked Songs',
  'sync.tracks.note': 'Spotify returns the library in pages of 50 tracks.',
  'sync.bpm.label': 'Finding tempo',
  'sync.bpm.note':
    'Spotify no longer exposes BPM, so we ask Deezer and ReccoBeats. For a large library this can take a few minutes. Keep this tab open.',
  'sync.stats.total': 'Tracks in the database',
  'sync.stats.withBpm': 'With known BPM',
  'sync.stats.withYear': 'With known year',
  'sync.stats.removed': 'Removed from Liked Songs',
  'sync.stats.withoutBpm':
    '{n} tracks have no tempo. Neither source knows them, so they will not show up in the filter results.',
  'sync.error.title': 'Sync interrupted',
  'sync.retry': 'Try again',
  'sync.goToFilter': 'Go to the filter',

  'filter.title': 'Filter',
  'filter.tempo': 'Tempo',
  'filter.year': 'Release year',
  'filter.searching': 'Searching…',
  'filter.sort': 'Sort',
  'filter.compact': 'Compact view',
  'filter.export': 'Save as playlist ({n})',
  'filter.exported.title': 'Playlist ready',
  'filter.exported.added': 'Added {count}.',
  'filter.exported.open': 'Open in Spotify',
  'filter.exportFailed': 'Could not save the playlist',
  'filter.empty.title': 'Nothing matches',
  'filter.empty.noLibrary': 'The library is empty. Go back to sync and fetch your Liked Songs.',
  'filter.empty.noBpm': 'No track has a known tempo yet. Run the sync again.',
  'filter.empty.hint':
    'Tempo is known for {withBpm} of {total} tracks. {withoutBpm} without tempo and {withoutYear} without a release year fall outside the filter. Try widening one of the ranges.',

  'sort.name': 'Title A-Z',
  'sort.artists': 'Artist A-Z',
  'sort.bpm-asc': 'BPM ascending',
  'sort.bpm-desc': 'BPM descending',
  'sort.year-asc': 'Year ascending',
  'sort.year-desc': 'Year descending',
  'sort.added-desc': 'Recently added',

  'settings.title': 'Settings',
  'settings.library': 'Library',
  'settings.fetched': 'Fetched',
  'settings.withBpm': 'With known tempo',
  'settings.withYear': 'With known year',
  'settings.pending': 'Waiting to be checked',
  'settings.checkNew': 'Check for new Liked Songs',
  'settings.fullSync': 'Go through the whole library',
  'settings.reset': 'Clear downloaded data',
  'settings.resetConfirm':
    'Clear downloaded data?\n\nTracks and their tempo will be removed from this browser. Fetching tempo again for a large library takes a few minutes.',
  'settings.signOut': 'Log out',
  'settings.footnote':
    'Tempo comes from Deezer and ReccoBeats. Spotify shut down its BPM API in November 2024, so the values may differ from what you remember from older tools.',

  'consent.title': 'This app stores data in your browser',
  'consent.body':
    'No cookies and no tracking. localStorage and IndexedDB hold: your Spotify login tokens, the fetched list of Liked Songs with tempo, and preferences (language, ranges, sorting). Nothing leaves this browser. You can delete the data at any time with Log out and “Clear downloaded data” in settings. Without consent login cannot work, because there is nowhere to keep the session.',
  'consent.accept': 'Accept',
  'consent.reject': 'Reject',
  'consent.required':
    'Login requires consent to store data in the browser. The rejected data has been deleted; you can give consent again from the bar at the bottom of the screen after reloading the page.',

  'crash.title': 'Something went wrong',
  'crash.body':
    'The app hit an error it could not handle. Reloading usually helps. If the error keeps coming back, clear the stored data: the login tokens and the fetched library will be removed and you will start from the login screen.',
  'crash.reload': 'Reload the page',
  'crash.wipe': 'Clear data and start over',
  'crash.details': 'Error details',

  'player.label': 'Player',
  'player.playing': 'Playing',
  'player.paused': 'Paused',
  'player.close': 'Close the player',

  'track.play': 'Play',
  'track.pause': 'Pause',
  'track.unknownYear': 'year unknown',
  'track.otherYear': 'release {year}',
  'track.noSource': 'none',
  'track.unknownArtist': 'Unknown artist',

  'tracks.one': 'track',
  'tracks.few': 'tracks',
  'tracks.many': 'tracks',

  'range.from': 'from',
  'range.to': 'to',

  'playlist.description': 'Filtered by Beatsift.',

  'error.spotify.sessionExpired': 'Your Spotify session has expired. Log in again.',
  'error.spotify.forbidden': 'Spotify denied access.',
  'error.spotify.unavailable': 'Spotify is not responding. Try again later.',
  'error.spotify.generic': 'Spotify error.',
  'error.spotify.status': 'Spotify responded with status {status}.',
  'error.auth.mismatch':
    'The return from Spotify does not match the login that was started. Try again.',
  'error.auth.noAccessToken': 'Spotify did not return an access token.',
  'error.auth.noRefreshToken': 'Spotify did not return a refresh token.',
  'error.deezer.rateLimit': 'Deezer rate limit hit.',
  'error.deezer.badShape': 'Deezer returned an unexpected response.',
  'error.deezer.generic': 'Deezer returned an error.',
  'error.reccobeats.rateLimit': 'ReccoBeats rate limit hit.',
  'error.reccobeats.status': 'ReccoBeats responded with status {status}.',
  'error.jsonp.timeout': 'The server did not respond in time.',
  'error.jsonp.failed': 'Could not fetch the response.',
  'error.player.timeout': 'The Spotify player did not load in time.',
  'error.player.failed': 'Could not load the Spotify player.',
};
