import type { ReactNode } from 'react';

type Props = Readonly<{
  title: ReactNode;
  subtitle?: ReactNode;
}>;

export default function SectionHeading({ title, subtitle }: Props) {
  return (
    <header>
      <h2 className="text-base font-semibold tracking-tight text-neutral-900">{title}</h2>
      {subtitle !== undefined && <p className="mt-1 text-[13px] text-neutral-500">{subtitle}</p>}
    </header>
  );
}
