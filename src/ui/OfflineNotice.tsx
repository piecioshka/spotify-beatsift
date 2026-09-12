import { useT } from '../i18n';
import { useOnline } from './useOnline';
import './OfflineNotice.css';

/**
 * Pasek nad treścią ekranu, gdy przeglądarka zgłasza brak sieci. Bez niego
 * nieudane zapytania wyglądałyby jak błędy aplikacji.
 */
export function OfflineNotice() {
  const t = useT();
  const online = useOnline();

  if (online) return null;

  return (
    <div className="offline">
      <p className="offline__box text-small" role="status">
        {t('offline.notice')}
      </p>
    </div>
  );
}
