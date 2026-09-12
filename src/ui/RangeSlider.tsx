import { useId } from 'react';
import { useT } from '../i18n';
import { handleOnTop, moveHandle, valueToRatio, type Range } from './rangeMath';
import './RangeSlider.css';

export type { Range } from './rangeMath';

type Props = {
  label: string;
  min: number;
  max: number;
  value: Range;
  onChange: (next: Range) => void;
  /** Dopisek przy wartości, na przykład „BPM”. */
  unit?: string;
};

/** Szerokość toru w jednostkach SVG. Rysunek i tak skaluje się do kontenera. */
const TRACK_UNITS = 1000;

/**
 * Suwak z dwoma uchwytami.
 *
 * Dwa natywne `<input type="range">` leżą jeden na drugim nad wspólnym torem,
 * a klikalne są tylko ich uchwyty. Przeglądarka daje za darmo klawiaturę,
 * czytnik ekranu i dotyk, a my dokładamy tylko wypełnienie między uchwytami
 * i pilnujemy, żeby dolny nie przeskoczył górnego.
 */
export function RangeSlider({ label, min, max, value, onChange, unit }: Props) {
  const id = useId();
  const t = useT();
  const bounds = { min, max };
  const top = handleOnTop(value, bounds);

  const lowRatio = valueToRatio(value.low, min, max);
  const highRatio = valueToRatio(value.high, min, max);
  const suffix = unit ? ` ${unit}` : '';

  return (
    <div className="range">
      <div className="range__header">
        <span className="range__label" id={`${id}-label`}>
          {label}
        </span>
        <output className="range__value tabular" htmlFor={`${id}-low ${id}-high`}>
          {value.low === value.high
            ? `${value.low}${suffix}`
            : `${value.low} – ${value.high}${suffix}`}
        </output>
      </div>

      <div className="range__area">
        <svg
          className="range__track"
          viewBox={`0 0 ${TRACK_UNITS} 8`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect className="range__rail" x="0" y="0" width={TRACK_UNITS} height="8" rx="4" />
          <rect
            className="range__fill"
            x={lowRatio * TRACK_UNITS}
            y="0"
            width={Math.max((highRatio - lowRatio) * TRACK_UNITS, 0)}
            height="8"
            rx="4"
          />
        </svg>

        <input
          id={`${id}-low`}
          type="range"
          className={`range__input${top === 'low' ? ' range__input--top' : ''}`}
          min={min}
          max={max}
          step={1}
          value={value.low}
          aria-label={`${label}, ${t('range.from')}`}
          onChange={(event) =>
            onChange(moveHandle(value, 'low', Number(event.target.value), bounds))
          }
        />
        <input
          id={`${id}-high`}
          type="range"
          className={`range__input${top === 'high' ? ' range__input--top' : ''}`}
          min={min}
          max={max}
          step={1}
          value={value.high}
          aria-label={`${label}, ${t('range.to')}`}
          onChange={(event) =>
            onChange(moveHandle(value, 'high', Number(event.target.value), bounds))
          }
        />
      </div>

      <div className="range__bounds text-muted tabular">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
