import { Trophy } from 'lucide-react';

type Props = Readonly<{ label: string; className?: string }>;

export default function RecordTrophy({ label, className = '' }: Props) {
  return (
    <span
      aria-label={label}
      title={label}
      className={
        'inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm ' +
        className
      }
    >
      <Trophy size={12} strokeWidth={2.2} />
    </span>
  );
}
