import type { ReactNode } from 'react';

type Props = Readonly<{
  icon: ReactNode;
  label: ReactNode;
  description: string;
  action: ReactNode;
}>;

export default function SettingsRow({ icon, label, description, action }: Props) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-secondary">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-meta text-muted">{description}</div>
      </div>
      {action}
    </li>
  );
}
