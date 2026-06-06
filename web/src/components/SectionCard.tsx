import type { ReactNode } from 'react';

type Props = Readonly<{
  children: ReactNode;
}>;

export default function SectionCard({ children }: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      {children}
    </section>
  );
}
