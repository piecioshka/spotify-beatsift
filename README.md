# Beatsift

A web app that connects to Spotify, pulls your Liked Songs and lets you sift
out the ones at a given tempo and from a given range of years. Typical use:
"tracks at 120-130 BPM from 2000-2010". You save the result as a new playlist
on your account.

Vite + React + TypeScript. Everything happens in the browser: there is no
backend, data lives in IndexedDB and login goes straight to Spotify via PKCE.
The interface is available in English and Polish.

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
   at most 25 manually added accounts.

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
the server refuses to start instead of silently moving to another one.

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

`npm run build` produces static files in `dist/` that any static host can
serve. Three things to set up:

- The host must serve `index.html` for every path (the classic SPA fallback),
  otherwise the return from login at `/callback` ends in a 404.
- In the Spotify dashboard add a Redirect URI with the host's domain, for
  example `https://beatsift.example/callback`. The app builds this address
  from the current page on its own; set `VITE_SPOTIFY_REDIRECT_URI` at build
  time when it should be different.
- Set `VITE_SITE_URL` at build time (for example `https://beatsift.example`)
  so that the Open Graph tags point to an absolute image URL. Without it the
  tags use a root-relative path, which most link previews ignore.

## How it works inside

0. **Consent** comes first. The app sets no cookies and does no tracking, but
   it keeps tokens, the library and preferences in `localStorage` and
   IndexedDB, so a bar at the bottom asks before anything is stored. Accept
   is remembered in `localStorage`; reject wipes everything the app has
   written and disables login, and the bar comes back on the next load.
1. **Login** via Authorization Code with PKCE, no client secret. Tokens land
   in `localStorage`. Scopes: `user-library-read` for Liked Songs and
   `playlist-modify-private` for the export.
2. **Sync** walks `GET /v1/me/tracks` in pages of 50 and writes the tracks to
   IndexedDB. Incremental by default, meaning it stops at the first track it
   already knows. A full pass, available in settings, additionally deletes
   from the database whatever you removed from Liked Songs.
3. **BPM lookup** goes through the database in two passes, Deezer and
   ReccoBeats. The queue respects rate limits and saves results after every
   portion, so after closing the tab it resumes where it left off.
4. **Filtering** is a pass over all tracks in memory. A few thousand records
   go through the filter in a fraction of a millisecond, so there is no point
   in building indexes. The list can be sorted (title, artist, BPM, year,
   date added) and switched to a compact view. Slider ranges, sort order,
   view and language persist in `localStorage`. The order of the list is also
   the order of the playlist and of the player.
5. **Playback** from the result list uses the embedded Spotify player
   (iFrame API), with no extra scopes and no Premium. When a track ends the
   next one from the list starts. Full tracks play when you are logged in to
   Spotify in the same browser; otherwise the embed plays 30-second
   previews. The browser may block the automatic start, in which case the
   button inside the player remains.
6. **Export** creates a private playlist and adds the tracks in batches
   of 100.

### The release year can be made up

Spotify reports the release date of the album, not of the track. A song from
2003 that you have from some 2015 compilation gets the year 2015 and falls
out of a 2000-2010 filter. Beatsift rescues this with the date from Deezer,
which is attached to the track, and takes the earlier of the two. It does not
catch everything, but most compilations and remasters yes.

## Limitations

- The Deezer API terms allow non-commercial use only.
- The first sync of a few thousand Liked Songs takes a few minutes, because
  Deezer accepts about 50 requests per 5 seconds. Results stay in the
  database for good, so it is a one-time cost. The tab has to stay open.
- Tracks without an ISRC and local files added to the library are skipped.
- A track without a known tempo or without a release year does not show up
  in the results. If it is not known whether it matches, it does not go into
  the playlist.
- JSONP means a script from Deezer's domain runs inside the page. For a
  personal tool that is acceptable; for a public deployment a proxy of your
  own is the better choice.

## License

MIT, see [LICENSE](./LICENSE).
