import { useEffect } from 'react';

/** Tytuł karty przeglądarki: „Filtr · Beatsift”, a na stronie głównej samo „Beatsift”. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · Beatsift` : 'Beatsift';
  }, [title]);
}
