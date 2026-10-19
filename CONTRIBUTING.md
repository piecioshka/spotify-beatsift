# Contributing to Beatsift

Everything you need to run, test and deploy the app. For what Beatsift does,
see the [README](README.md).

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/piecioshka/spotify-beatsift
cd spotify-beatsift
npm install
```

### 2. An app in the Spotify Developer Dashboard

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   and click **Create app**. Tick **Web API**.
2. Name: `Beatsift`. **Redirect URI**: `http://127.0.0.1:3000/callback`.
   Since April 2025 Spotify rejects `localhost` and plain `http://`, but a
   loopback address given as an IP still passes.
3. Copy the **Client ID**. No client secret is needed, login uses PKCE.
4. **Settings → User Management** → add the e-mail of your Spotify account.
   Without it your own app returns 403 on login. Development mode allows
   up to 5 allowlisted users, and Spotify requires the app owner to have
   a Premium account for the app to work at all.

### 3. Environment variables

```bash
cp .env.example .env
# paste the Client ID into VITE_SPOTIFY_CLIENT_ID
```

### 4. Run

```bash
npm run dev
```

The app is served at `http://127.0.0.1:3000`. The port is fixed because it is
part of the Redirect URI registered in the dashboard; when the port is taken
the server refuses to start instead of silently moving to another one. Behind a
reverse proxy set `PORT` to move it and register the proxy's `https://`
address plus `/callback` as an extra Redirect URI.

## Scripts

| Command                | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | Vite dev server                                                 |
| `npm run build`        | production build into `dist/`                                   |
| `npm run preview`      | preview of the build at the same address                        |
| `npm test`             | unit tests (Vitest)                                             |
| `npm run typecheck`    | type check without emitting                                     |
| `npm run lint`         | ESLint                                                          |
| `npm run format:check` | Prettier                                                        |
| `npm run og-image`     | regenerates the Open Graph image in `public/`                   |
| `npm run favicons`     | regenerates favicon.ico and PNG icons from `public/favicon.svg` |

## Deployment

Every push to `main` builds the app and publishes it to GitHub Pages through
`.github/workflows/pages.yml`. The workflow passes the repository subpath as
`BASE_PATH`, the public address as `VITE_SITE_URL` and the Client ID from the
`VITE_SPOTIFY_CLIENT_ID` repository secret. A copy of `index.html` saved as
`404.html` gives the single-page app its fallback, so the return from login at
`/callback` works even though Pages has no rewrites.

To host it elsewhere, `npm run build` produces static files in `dist/`. Three
things to set up:

- The host must serve `index.html` for every path (the classic SPA fallback),
  otherwise the return from login at `/callback` ends in a 404.
- In the Spotify dashboard add a Redirect URI with the host's domain, for
  example `https://beatsift.example/callback`. The app builds this address
  from the current page on its own; set `VITE_SPOTIFY_REDIRECT_URI` at build
  time when it should be different.
- Set `VITE_SITE_URL` at build time (for example `https://beatsift.example`).
  It switches on the canonical link, `og:url`, the absolute Open Graph image,
  JSON-LD and `sitemap.xml`; without it the build ships only the static tags.

## How it works inside

0. **Consent** comes first. The app sets no cookies and does no tracking, but
   it keeps tokens, the library and preferences in `localStorage` and
   IndexedDB, so a bar at the bottom asks before anything is stored. Accept
   is remembered in `localStorage`; reject wipes everything the app has
   written and disables login, and the bar comes back on the next load.
1. **Login** via Authorization Code with PKCE, no client secret. Tokens land
   in `localStorage`. Scopes: `user-library-read` for Liked Songs,
   `playlist-read-private` and `playlist-read-collaborative` for your
   playlists and `playlist-modify-private` for the export.
2. **Sources** are picked once after the first login: Liked Songs plus any of
   your own or collaborative playlists (followed playlists of other users are
   left out). The choice lives in `localStorage` and can be changed in
   settings; every change runs a full pass.
3. **Sync** walks `GET /v1/me/tracks` in pages of 50 for Liked Songs and
   `GET /v1/playlists/{id}/items` for every selected playlist, writing the
   tracks to IndexedDB. Liked Songs sync incrementally, meaning the walk
   stops at the first track it already knows; playlists always get a full
   pass, because tracks can be removed from them. A full pass, available in
   settings, additionally deletes from the database whatever no selected
   source shows any more. A track present in several sources is one record.
4. **BPM lookup** goes through the database in two passes, Deezer and
   ReccoBeats. The queue respects rate limits and saves results after every
   portion, so after closing the tab it resumes where it left off.
5. **Filtering** is a pass over all tracks in memory. A few thousand records
   go through the filter in a fraction of a millisecond, so there is no point
   in building indexes. The list can be sorted (title, artist, BPM, year,
   date added) and switched to a compact view. Slider ranges, sort order,
   view, language and theme persist in `localStorage`. The order of the list is also
   the order of the playlist and of the player.
6. **Playback** from the result list uses the embedded Spotify player
   (iFrame API), with no extra scopes and no Premium. When a track ends the
   next one from the list starts. Full tracks play when you are logged in to
   Spotify in the same browser; otherwise the embed plays 30-second
   previews. The browser may block the automatic start, in which case the
   button inside the player remains.
7. **Export** creates a private playlist and adds the tracks in batches
   of 100.

### The release year can be made up

Spotify reports the release date of the album, not of the track. A song from
2003 that you have from some 2015 compilation gets the year 2015 and falls
out of a 2000-2010 filter. Beatsift rescues this with the date from Deezer,
which is attached to the track, and takes the earlier of the two. It does not
catch everything, but most compilations and remasters yes.

## Where the BPM comes from

On November 27, 2024 Spotify shut down the `/v1/audio-features` endpoint, the
one that returned the `tempo` field. New apps get a 403 there and there is no
official replacement. Beatsift therefore looks the tempo up elsewhere:

| Order | Source                                      | Match                   | API key    |
| ----- | ------------------------------------------- | ----------------------- | ---------- |
| 1     | [Deezer](https://developers.deezer.com/api) | by the track's ISRC     | not needed |
| 2     | [ReccoBeats](https://reccobeats.com/docs)   | by the Spotify track ID | not needed |

Deezer goes first because an ISRC match is stricter than an ID match.
ReccoBeats fills in whatever Deezer does not know, in batches of 40 tracks.

The two sources can differ by a factor of two, for example 87 versus 174 for
the same track, so every result shows where its number came from.

Deezer does not send an `Access-Control-Allow-Origin` header, so a plain
`fetch` from the browser fails. Beatsift queries it over JSONP
(`?output=jsonp`), which Deezer officially supports. ReccoBeats and Spotify
have CORS enabled.

## Conventions

- Stack: Vite + React 19 + TypeScript, react-router in declarative mode,
  IndexedDB through `idb`. No backend.
- Before every commit run `npm run format:check`, `npm run lint`,
  `npm run typecheck` and `npm test`. CI runs the same checks.
- Styles live only in `.css` files next to their components and target
  classes. No inline styles and no `#id` selectors.
- Logic without DOM (`api`, `auth`, `db`, `bpm`, `ui/rangeMath`) has tests in
  `__tests__/`. Tests that touch `window` start with
  `// @vitest-environment jsdom`.
- Deezer goes through JSONP (`src/api/jsonp.ts`) because it does not support
  CORS. Do not replace it with `fetch`.
- Every user-facing string goes to both dictionaries in `src/i18n/messages.ts`;
  a test checks that English and Polish have the same keys.
- Temporary files go to `tmp/`, which is ignored by git.
