import { Trophy } from 'lucide-react';

type Props = Readonly<{ label: string; count?: number; className?: string }>;

export default function RecordTrophy({ label, count = 1, className = '' }: Props) {
  return (
    <span
      aria-label={label}
      className={
        'inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-amber-500 text-white shadow-sm ' +
        (count > 1 ? 'px-1.5 ' : '') +
        className
      }
    >
      <Trophy size={12} strokeWidth={2.2} />
      {count > 1 && <span className="text-[10px] font-bold leading-none tabular-nums">×{count}</span>}
    </span>
  );
}
