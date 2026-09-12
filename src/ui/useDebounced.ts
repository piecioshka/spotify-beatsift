import { useEffect, useState } from 'react';

/**
 * Opóźnia wartość o zadany czas. Przeciąganie suwaka zmienia stan kilkadziesiąt
 * razy na sekundę, a każda zmiana odpalałaby zapytanie do bazy.
 */
export function useDebounced<T>(value: T, delayMs = 150): T {
  const [delayed, setDelayed] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDelayed(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return delayed;
}
