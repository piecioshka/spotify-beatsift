import { loadSelection } from './selection';

/** Po zalogowaniu: kto nie wybrał jeszcze źródeł, ten najpierw je wybiera. */
export function afterLoginRoute(): string {
  return loadSelection() ? '/sync' : '/sources';
}
