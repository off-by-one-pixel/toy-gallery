import type { ReactNode } from 'react';

type Props = Readonly<{
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}>;

export default function SectionHeading({ title, subtitle, className }: Props) {
  return (
    <header className={className}>
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {subtitle !== undefined && <p className="mt-1 text-meta text-muted">{subtitle}</p>}
    </header>
  );
}
