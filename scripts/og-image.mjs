// Generates the Open Graph image (1200x630 PNG) from an inline SVG.
// Usage: npm run og-image
// Requires `rsvg-convert` (librsvg) on PATH.

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 1200;
const HEIGHT = 630;

const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#121212" />
  <g fill="#1db954">
    <rect x="96" y="250" width="34" height="130" rx="17" />
    <rect x="148" y="190" width="34" height="190" rx="17" />
    <rect x="200" y="222" width="34" height="158" rx="17" />
    <rect x="252" y="290" width="34" height="90" rx="17" />
  </g>
  <text x="340" y="272" fill="#f2f2f7" font-family="Helvetica, Arial, sans-serif" font-size="112" font-weight="700">Beatsift</text>
  <text x="344" y="340" fill="#9b9ba1" font-family="Helvetica, Arial, sans-serif" font-size="36">Sift your Spotify Liked Songs</text>
  <text x="344" y="392" fill="#9b9ba1" font-family="Helvetica, Arial, sans-serif" font-size="36">by tempo and release year,</text>
  <text x="344" y="444" fill="#9b9ba1" font-family="Helvetica, Arial, sans-serif" font-size="36">then save the result as a playlist.</text>
  <text x="96" y="548" fill="#1db954" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="600">120–130 BPM · 2000–2010</text>
</svg>
`;

mkdirSync(dirname(OUTPUT), { recursive: true });
execFileSync('rsvg-convert', ['-w', String(WIDTH), '-h', String(HEIGHT), '-o', OUTPUT], {
  input: svg,
});
console.log(`Wrote ${OUTPUT}`);
