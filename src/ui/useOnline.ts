import { useSyncExternalStore } from 'react';
import { isOnline } from '../bpm/online';

function subscribe(listener: () => void): () => void {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

/** Stan sieci wg przeglądarki; komponent renderuje się ponownie po każdej zmianie. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, () => true);
}
