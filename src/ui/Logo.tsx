import './Logo.css';

/**
 * Znak aplikacji: cztery słupki jak w favicon.svg, ten sam rysunek co
 * w ikonach i obrazku Open Graph. Dekoracja, więc ukryta przed czytnikami;
 * nazwę aplikacji podaje tekst obok.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="logo__background" width="32" height="32" rx="7" />
      <g className="logo__bars">
        <rect x="6" y="14" width="4" height="10" rx="2" />
        <rect x="12" y="8" width="4" height="16" rx="2" />
        <rect x="18" y="11" width="4" height="13" rx="2" />
        <rect x="24" y="17" width="4" height="7" rx="2" />
      </g>
    </svg>
  );
}
