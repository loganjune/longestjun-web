// The bar above a filtered list (Stories, Projects, Albums): a label on the left, then a row of
// toggle buttons ("All" plus the choices). Shared so the three pages behave alike.
import type { ReactNode } from 'react';

type Props = { label: ReactNode; live?: boolean; choices: string[]; value: string; onChange: (v: string) => void; groupLabel: string };

export default function FilterBar({ label, live, choices, value, onChange, groupLabel }: Props) {
  return (
    <div className="split proj-bar">
      <span className={live ? 'lab soft' : 'lab'} aria-live={live ? 'polite' : undefined}>
        {label}
      </span>
      {choices.length > 1 && (
        <div className="filters lab" role="group" aria-label={groupLabel}>
          {choices.map((c) => (
            <button key={c} type="button" aria-pressed={c === value} onClick={() => onChange(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Staggers the fade-in of list items (the first nine; the rest come in together). */
export const rise = (i: number) => ({ animationDelay: `${Math.min(i, 8) * 60}ms` });

export const count = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
