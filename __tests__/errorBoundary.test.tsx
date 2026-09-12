// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';

declare global {
  // Flaga, po której React rozpoznaje testy używające `act`.
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Boom(): never {
  throw new Error('zepsuty render');
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  // React i sam boundary logują błąd renderu; w teście to tylko szum.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renderuje dzieci, gdy nic nie pada', () => {
    act(() => {
      root.render(
        <ErrorBoundary>
          <p>wszystko gra</p>
        </ErrorBoundary>,
      );
    });

    expect(container.textContent).toBe('wszystko gra');
  });

  it('po błędzie renderu pokazuje ekran awaryjny z treścią błędu i dwoma wyjściami', () => {
    act(() => {
      root.render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(container.textContent).toContain('Something went wrong');
    expect(container.querySelector('.crash__message')?.textContent).toBe('zepsuty render');
    expect(container.querySelectorAll('button')).toHaveLength(2);
  });
});
