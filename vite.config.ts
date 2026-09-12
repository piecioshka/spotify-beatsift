import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const APP_NAME = 'Beatsift';
const DESCRIPTION =
  'Sift your Spotify Liked Songs by tempo and release year, then save the result as a playlist.';

/**
 * Serwer deweloperski siedzi na 127.0.0.1, nie na `localhost`, bo Spotify od
 * kwietnia 2025 przyjmuje jako Redirect URI tylko `https://` albo adres
 * pętli zwrotnej podany jako IP. Port jest sztywny, bo wpisujemy go
 * w dashboardzie Spotify; zajęty port ma się wywalić, a nie po cichu
 * przeskoczyć na inny i rozjechać się z Redirect URI.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Strona projektu na GitHub Pages żyje w podkatalogu /<repo>; workflow
    // podaje go w BASE_PATH (bez końcowego ukośnika, stąd normalizacja).
    base: withTrailingSlash(env.BASE_PATH),
    plugins: [react(), seo(env.VITE_SITE_URL)],
    server: { host: '127.0.0.1', port: 3000, strictPort: true },
    preview: { host: '127.0.0.1', port: 3000, strictPort: true },
    test: {
      include: ['__tests__/**/*.test.{ts,tsx}'],
      environment: 'node',
    },
  };
});

function withTrailingSlash(path: string | undefined): string {
  if (!path) return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * Tagi, które mają sens dopiero z publicznym adresem: canonical, og:url,
 * bezwzględny obrazek Open Graph, JSON-LD oraz sitemap i robots. Bez
 * `VITE_SITE_URL` (lokalny dev) zostają tylko statyczne tagi z index.html,
 * a robots.txt wychodzi bez wpisu Sitemap.
 */
function seo(siteUrlRaw: string | undefined): Plugin {
  const siteUrl = siteUrlRaw?.trim().replace(/\/+$/, '') ?? '';
  const pageUrl = siteUrl ? `${siteUrl}/` : null;

  return {
    name: 'beatsift-seo',
    transformIndexHtml() {
      if (!pageUrl) return [];
      const image = `${siteUrl}/og.png`;
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: APP_NAME,
        url: pageUrl,
        description: DESCRIPTION,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        image,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      };
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: pageUrl }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: pageUrl }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image', content: image }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'twitter:image', content: image }, injectTo: 'head' },
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          // `<` nie może pojawić się w JSON wewnątrz <script>.
          children: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          injectTo: 'head',
        },
      ];
    },
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /callback'];
      if (pageUrl) {
        robots.push(`Sitemap: ${siteUrl}/sitemap.xml`);
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            `  <url><loc>${pageUrl}</loc></url>`,
            `  <url><loc>${pageUrl}privacy</loc></url>`,
            '</urlset>',
            '',
          ].join('\n'),
        });
      }
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `${robots.join('\n')}\n` });
    },
  };
}
