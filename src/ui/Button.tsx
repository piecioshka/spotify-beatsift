import './Button.css';

type Props = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  busy?: boolean;
};

export function Button({ label, onClick, variant = 'primary', disabled, busy }: Props) {
  const inactive = disabled || busy;
  return (
    <button
      type="button"
      className={`button button--${variant}`}
      onClick={onClick}
      disabled={inactive}
      aria-busy={busy ? true : undefined}
    >
      {busy ? <span className="button__spinner" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
