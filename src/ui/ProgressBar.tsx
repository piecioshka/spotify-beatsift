import './ProgressBar.css';

type Props = {
  label: string;
  current: number;
  total: number;
  /** Dopisek pod paskiem, na przykład ile utworów zostało bez BPM. */
  note?: string;
};

export function ProgressBar({ label, current, total, note }: Props) {
  // Dopóki nie znamy sumy, pasek jest nieokreślony zamiast dzielić przez zero.
  const known = total > 0;

  return (
    <div className="progress">
      <div className="progress__header">
        <span className="progress__label">{label}</span>
        <span className="progress__count tabular">
          {known ? `${current} / ${total}` : String(current)}
        </span>
      </div>
      <progress
        className="progress__bar"
        value={known ? Math.min(current, total) : undefined}
        max={known ? total : undefined}
        aria-label={label}
      />
      {note ? <p className="progress__note text-muted text-small">{note}</p> : null}
    </div>
  );
}
