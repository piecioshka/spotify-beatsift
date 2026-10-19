import { useT } from '../i18n';
import { useTheme } from './theme';
import './ThemeToggle.css';

/**
 * Przełącznik motywu: sama ikona lucide, bez tekstu. W motywie ciemnym
 * słońce (klik daje jasny), w jasnym księżyc. Nazwa tylko w `aria-label`
 * i `title`, tak jak w pozostałych aplikacjach.
 */
export function ThemeToggle() {
  const t = useT();
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle icon-control"
      onClick={toggle}
      aria-label={t('theme.toggle')}
      title={t('theme.toggle')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

/* Ścieżki z lucide (Sun, Moon) wklejone inline, bo repo nie ma zależności lucide-react. */
function SunIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
