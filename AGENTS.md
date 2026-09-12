# Wskazówki dla agentów

- Stack: Vite + React 19 + TypeScript, react-router w trybie deklaratywnym,
  IndexedDB przez `idb`. Bez backendu i bez React Native.
- Przed commitem: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`.
- Style wyłącznie w plikach `.css` obok komponentów, przez klasy. Zero inline
  styli i zero selektorów po `#id`.
- Logika bez DOM (api, auth, db, bpm, ui/rangeMath) ma testy w `__tests__/`.
  Testy dotykające `window` dostają nagłówek `// @vitest-environment jsdom`.
- Deezer idzie przez JSONP (`src/api/jsonp.ts`), bo nie wspiera CORS. Nie
  zamieniać na `fetch`.
- Pliki tymczasowe tylko w `tmp/`.
