/**
 * Matematyka suwaka dwusuwakowego, wydzielona z komponentu.
 * Komponent zajmuje się DOM-em, ten plik liczbami, więc da się go
 * sprawdzić testem bez uruchamiania aplikacji.
 */

export type Range = { low: number; high: number };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Zamienia wartość na ułamek szerokości toru, w przedziale od 0 do 1. */
export function valueToRatio(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

export type Handle = 'low' | 'high';

/**
 * Przesuwa jeden uchwyt, nie pozwalając mu przeskoczyć drugiego.
 *
 * Uchwyty mogą się spotkać na tej samej wartości, bo zakres zwężony
 * do jednej liczby to sposób na filtrowanie po dokładnym BPM.
 */
export function moveHandle(
  current: { low: number; high: number },
  handle: Handle,
  nextValue: number,
  bounds: { min: number; max: number },
): { low: number; high: number } {
  const value = clamp(Math.round(nextValue), bounds.min, bounds.max);

  return handle === 'low'
    ? { low: Math.min(value, current.high), high: current.high }
    : { low: current.low, high: Math.max(value, current.low) };
}

/**
 * Który z nałożonych na siebie suwaków ma leżeć na wierzchu, gdy oba
 * uchwyty stoją na tej samej wartości. W górnej połowie toru na wierzch
 * idzie dolny, bo tylko on ma dokąd się ruszyć (w lewo); w dolnej połowie
 * odwrotnie. Przy rozsuniętych uchwytach kolejność nie ma znaczenia.
 */
export function handleOnTop(
  current: { low: number; high: number },
  bounds: { min: number; max: number },
): Handle {
  if (current.low !== current.high) return 'high';
  return current.low > (bounds.min + bounds.max) / 2 ? 'low' : 'high';
}
