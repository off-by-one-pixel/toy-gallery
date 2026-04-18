'use client';

import { useUnit } from '../providers/UnitProvider';
import { Unit } from '../services/units';

const OPTIONS: Unit[] = [Unit.mm, Unit.in];

export default function UnitToggle() {
  const { unit, setUnit } = useUnit();
  const activeIndex = OPTIONS.indexOf(unit);

  return (
    <div
      data-active={unit}
      className="relative inline-flex rounded-lg bg-neutral-200/70 p-0.5"
      role="group"
      aria-label="Display units"
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-white shadow-[0_1px_2px_rgba(17,24,39,0.08)] transition-transform duration-200"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setUnit(opt)}
          aria-pressed={unit === opt}
          className={
            'relative z-10 min-w-9 px-3.5 py-1 text-xs font-medium tabular-nums transition-colors ' +
            (unit === opt ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800')
          }
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
