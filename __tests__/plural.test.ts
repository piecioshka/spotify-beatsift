// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setLanguage } from '../src/i18n';
import { plural, tracksLabel } from '../src/ui/plural';

// Odmiana przez liczebnik dotyczy polskiego; angielski sprawdza i18n.test.ts.
beforeAll(() => setLanguage('pl'));
afterAll(() => setLanguage('en'));

describe('tracksLabel', () => {
  it('jeden utwór', () => {
    expect(tracksLabel(1)).toBe('utwór');
  });

  it('od dwóch do czterech to utwory', () => {
    expect(tracksLabel(2)).toBe('utwory');
    expect(tracksLabel(3)).toBe('utwory');
    expect(tracksLabel(4)).toBe('utwory');
  });

  it('od pięciu w górę to utworów', () => {
    expect(tracksLabel(5)).toBe('utworów');
    expect(tracksLabel(11)).toBe('utworów');
    expect(tracksLabel(100)).toBe('utworów');
  });

  it('nastki idą jak pięć, nie jak dwa', () => {
    expect(tracksLabel(12)).toBe('utworów');
    expect(tracksLabel(13)).toBe('utworów');
    expect(tracksLabel(14)).toBe('utworów');
  });

  it('setki z nastką w środku też', () => {
    expect(tracksLabel(112)).toBe('utworów');
    expect(tracksLabel(1113)).toBe('utworów');
  });

  it('dwadzieścia dwa wraca do formy mnogiej krótkiej', () => {
    expect(tracksLabel(22)).toBe('utwory');
    expect(tracksLabel(102)).toBe('utwory');
    expect(tracksLabel(1024)).toBe('utwory');
  });

  it('zero idzie jak pięć', () => {
    expect(tracksLabel(0)).toBe('utworów');
  });
});

describe('plural', () => {
  it('działa też dla innych rzeczowników', () => {
    expect(plural(1, 'playlista', 'playlisty', 'playlist')).toBe('playlista');
    expect(plural(3, 'playlista', 'playlisty', 'playlist')).toBe('playlisty');
    expect(plural(7, 'playlista', 'playlisty', 'playlist')).toBe('playlist');
  });
});
