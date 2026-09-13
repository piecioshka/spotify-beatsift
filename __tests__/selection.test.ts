// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearSelection,
  isEmptySelection,
  loadSelection,
  parseSelection,
  saveSelection,
  type SourceSelection,
} from '../src/sources/selection';

afterEach(() => {
  window.localStorage.clear();
});

const selection: SourceSelection = {
  liked: true,
  playlists: [{ id: 'p1', name: 'Bieganie' }],
};

describe('wybór źródeł', () => {
  it('bez zapisu oddaje null, żeby aplikacja wiedziała, że trzeba zapytać', () => {
    expect(loadSelection()).toBeNull();
  });

  it('zapisuje pod kluczem aplikacji i odczytuje to samo', () => {
    saveSelection(selection);
    expect(window.localStorage.getItem('beatsift.sources')).not.toBeNull();
    expect(loadSelection()).toEqual(selection);
  });

  it('czyści zapis', () => {
    saveSelection(selection);
    clearSelection();
    expect(loadSelection()).toBeNull();
  });

  it('uszkodzony wpis traktuje jak brak wyboru', () => {
    expect(parseSelection('nie json')).toBeNull();
    expect(parseSelection('null')).toBeNull();
    expect(parseSelection('[]')).toBeNull();
    expect(parseSelection('{"liked":"tak"}')).toBeNull();
  });

  it('odsiewa playlisty bez id albo nazwy', () => {
    expect(
      parseSelection(
        JSON.stringify({ liked: false, playlists: [{ id: 'p1', name: 'A' }, { id: 7 }, 'x'] }),
      ),
    ).toEqual({ liked: false, playlists: [{ id: 'p1', name: 'A' }] });
  });

  it('pusty wybór to ani polubione, ani żadna playlista', () => {
    expect(isEmptySelection({ liked: false, playlists: [] })).toBe(true);
    expect(isEmptySelection({ liked: true, playlists: [] })).toBe(false);
    expect(isEmptySelection({ liked: false, playlists: [{ id: 'p', name: 'P' }] })).toBe(false);
  });
});
