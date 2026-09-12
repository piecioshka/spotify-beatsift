import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Serwer deweloperski siedzi na 127.0.0.1, nie na `localhost`, bo Spotify od
 * kwietnia 2025 przyjmuje jako Redirect URI tylko `https://` albo adres
 * pętli zwrotnej podany jako IP. Port jest sztywny, bo wpisujemy go
 * w dashboardzie Spotify; zajęty port ma się wywalić, a nie po cichu
 * przeskoczyć na inny i rozjechać się z Redirect URI.
 */
export default defineConfig(({ mode }) => {
  // `%VITE_SITE_URL%` w index.html zostałby w HTML dosłownie, gdyby zmiennej
  // nie było. Pusta wartość daje ścieżkę względną do roota, co lokalnie wystarcza.
  const env = loadEnv(mode, process.cwd(), '');
  process.env.VITE_SITE_URL = env.VITE_SITE_URL ?? '';

  return {
    plugins: [react()],
    server: { host: '127.0.0.1', port: 3000, strictPort: true },
    preview: { host: '127.0.0.1', port: 3000, strictPort: true },
    test: {
      include: ['__tests__/**/*.test.ts'],
      environment: 'node',
    },
  };
});
