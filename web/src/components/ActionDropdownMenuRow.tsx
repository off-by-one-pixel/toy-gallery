import type { ReactNode } from 'react';

type Props = Readonly<{
  icon: ReactNode;
  label: ReactNode;
  description: string;
}>;

/** Row layout used by ActionDropdownMenu: leading icon + stacked
 *  label/description. Paired with that component, not a general-purpose row. */
export default function ActionDropdownMenuRow({ icon, label, description }: Props) {
  return (
    <span className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted">{icon}</span>
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-caption text-muted">{description}</span>
      </span>
    </span>
  );
}
