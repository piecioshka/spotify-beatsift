import { describe, expect, it } from 'vitest';
import { clamp, handleOnTop, moveHandle, valueToRatio } from '../src/ui/rangeMath';

describe('clamp', () => {
  it('trzyma wartość w granicach', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe('valueToRatio', () => {
  it('mapuje granice na zero i jeden', () => {
    expect(valueToRatio(40, 40, 220)).toBe(0);
    expect(valueToRatio(220, 40, 220)).toBe(1);
  });

  it('środek zakresu wypada w połowie toru', () => {
    expect(valueToRatio(130, 40, 220)).toBeCloseTo(0.5);
  });

  it('nie dzieli przez zero przy zdegenerowanym zakresie', () => {
    expect(valueToRatio(5, 5, 5)).toBe(0);
  });
});

describe('moveHandle', () => {
  const bounds = { min: 40, max: 220 };

  it('przesuwa dolny uchwyt', () => {
    expect(moveHandle({ low: 100, high: 150 }, 'low', 120, bounds)).toEqual({
      low: 120,
      high: 150,
    });
  });

  it('nie pozwala dolnemu przeskoczyć górnego', () => {
    expect(moveHandle({ low: 100, high: 150 }, 'low', 180, bounds)).toEqual({
      low: 150,
      high: 150,
    });
  });

  it('nie pozwala górnemu zejść poniżej dolnego', () => {
    expect(moveHandle({ low: 100, high: 150 }, 'high', 60, bounds)).toEqual({
      low: 100,
      high: 100,
    });
  });

  it('pozwala uchwytom spotkać się, bo to filtrowanie po dokładnym BPM', () => {
    const result = moveHandle({ low: 100, high: 150 }, 'high', 100, bounds);
    expect(result).toEqual({ low: 100, high: 100 });
  });

  it('trzyma się granic suwaka', () => {
    expect(moveHandle({ low: 100, high: 150 }, 'low', 0, bounds).low).toBe(40);
    expect(moveHandle({ low: 100, high: 150 }, 'high', 999, bounds).high).toBe(220);
  });

  it('zaokrągla wartości ułamkowe', () => {
    expect(moveHandle({ low: 100, high: 150 }, 'low', 120.7, bounds).low).toBe(121);
  });
});

describe('handleOnTop', () => {
  const bounds = { min: 40, max: 220 };

  it('przy rozsuniętych uchwytach na wierzchu jest górny', () => {
    expect(handleOnTop({ low: 100, high: 150 }, bounds)).toBe('high');
  });

  it('gdy uchwyty stoją razem w górnej połowie, na wierzch idzie dolny, bo tylko on ma dokąd iść', () => {
    expect(handleOnTop({ low: 220, high: 220 }, bounds)).toBe('low');
    expect(handleOnTop({ low: 200, high: 200 }, bounds)).toBe('low');
  });

  it('gdy uchwyty stoją razem w dolnej połowie, na wierzch idzie górny', () => {
    expect(handleOnTop({ low: 40, high: 40 }, bounds)).toBe('high');
    expect(handleOnTop({ low: 100, high: 100 }, bounds)).toBe('high');
  });
});
