// Generates the raster favicons from public/favicon.svg.
// Usage: npm run favicons
// Requires `rsvg-convert` (librsvg) and `magick` (ImageMagick 7) on PATH.
//
// Google Search does not render SVG favicons, so the site also ships
// favicon.ico (16 + 32 px) and PNG variants, plus the 180 px icon iOS uses
// for the home screen.

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SOURCE = resolve(PUBLIC, 'favicon.svg');

const PNGS = [
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
];

for (const { file, size } of PNGS) {
  execFileSync('rsvg-convert', [
    '-w',
    String(size),
    '-h',
    String(size),
    '-o',
    resolve(PUBLIC, file),
    SOURCE,
  ]);
}

// One .ico with both small sizes inside, as browsers and Google expect.
execFileSync('magick', [
  resolve(PUBLIC, 'favicon-16.png'),
  resolve(PUBLIC, 'favicon-32.png'),
  resolve(PUBLIC, 'favicon.ico'),
]);

console.log(`Wrote ${PNGS.map((png) => png.file).join(', ')} and favicon.ico to ${PUBLIC}`);
