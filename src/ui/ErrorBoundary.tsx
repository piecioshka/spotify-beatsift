import { Component, type ErrorInfo, type ReactNode } from 'react';
import { wipeAllData } from '../consent/consent';
import { useT } from '../i18n';
import { Button } from './Button';
import './ErrorBoundary.css';

type Props = { children: ReactNode };
type State = { error: unknown };

/**
 * Ostatnia linia obrony: błąd renderu w dowolnym ekranie nie zostawia
 * pustej strony, tylko pokazuje, co się stało, i daje dwa wyjścia. Klasa,
 * bo React nadal nie ma hookowego odpowiednika `getDerivedStateFromError`.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Nie mamy zbierania błędów po stronie serwera, więc konsola to jedyny ślad.
    console.error('Beatsift: nieobsłużony błąd renderu', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error !== null) return <CrashScreen error={this.state.error} />;
    return this.props.children;
  }
}

function CrashScreen({ error }: { error: unknown }) {
  const t = useT();
  const message = error instanceof Error ? error.message : String(error);

  function reload() {
    window.location.reload();
  }

  async function wipe() {
    await wipeAllData();
    // Pełne przeładowanie, żeby żaden stan w pamięci nie przeżył.
    window.location.assign(import.meta.env.BASE_URL);
  }

  return (
    <main className="page crash" role="alert">
      <h1 className="page__title">{t('crash.title')}</h1>
      <p className="crash__body text-muted">{t('crash.body')}</p>
      <div className="crash__actions">
        <Button label={t('crash.reload')} onClick={reload} />
        <Button label={t('crash.wipe')} onClick={wipe} variant="secondary" />
      </div>
      <details className="crash__details">
        <summary className="text-muted text-small">{t('crash.details')}</summary>
        <pre className="crash__message text-small">{message}</pre>
      </details>
    </main>
  );
}
