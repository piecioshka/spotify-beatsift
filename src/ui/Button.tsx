import './Button.css';

type Props = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  /** Mniejszy wariant do pasków z kontrolkami, gdzie pełna wysokość by dominowała. */
  size?: 'normal' | 'small';
};

export function Button({
  label,
  onClick,
  variant = 'primary',
  disabled,
  busy,
  size = 'normal',
}: Props) {
  const inactive = disabled || busy;
  return (
    <button
      type="button"
      className={`button button--${variant}${size === 'small' ? ' button--small' : ''}`}
      onClick={onClick}
      disabled={inactive}
      aria-busy={busy ? true : undefined}
    >
      {busy ? <span className="button__spinner" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
