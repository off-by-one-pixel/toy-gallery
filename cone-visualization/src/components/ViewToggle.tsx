'use client';

import { LayoutGrid, List } from 'lucide-react';
import { useViewMode, ViewMode } from '../providers/ViewModeProvider';

const OPTIONS = [
  { value: ViewMode.cards, label: 'Cards', Icon: LayoutGrid },
  { value: ViewMode.list, label: 'List', Icon: List },
] as const;

export default function ViewToggle() {
  const { view, setView } = useViewMode();
  const activeIndex = OPTIONS.findIndex((o) => o.value === view);

  return (
    <div
      data-active={view}
      className="relative inline-flex rounded-lg bg-neutral-200/70 p-0.5"
      role="group"
      aria-label="Gallery view"
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-white shadow-[0_1px_2px_rgba(17,24,39,0.08)] transition-transform duration-200"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setView(value)}
          aria-pressed={view === value}
          title={label}
          className={
            'relative z-10 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors ' +
            (view === value ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800')
          }
        >
          <Icon size={13} strokeWidth={2} />
          {label}
        </button>
      ))}
    </div>
  );
}
