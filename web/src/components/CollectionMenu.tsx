'use client';

import { useRef, useState } from 'react';
import { Dropdown, Toast } from '@heroui/react';
import { ChevronDown, Download, KeyRound, LogOut, Trash2, Upload } from 'lucide-react';

import { APP_COMMIT_SHA, APP_VERSION } from '../config';
import { deleteCollection, downloadExport, importFromFile } from '../services/api';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useAuth } from '../providers/AuthProvider';
import ActionDropdownMenu, { type ActionMenuItem } from './ActionDropdownMenu';

type Props = Readonly<{
  onImported: () => void;
  onChangePassword: () => void;
  subtitle?: React.ReactNode;
}>;

type MenuItem = ActionMenuItem & Readonly<{ disabledWhenBusy?: boolean }>;

export default function CollectionMenu({ onImported, onChangePassword, subtitle }: Props) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const runAction = useAsyncAction();
  const { username, logout } = useAuth();

  const handleExport = () =>
    runAction(downloadExport, {
      busy: setBusy,
      onSuccess: () => Toast.toast.success('Exported collection'),
    });

  const handleImportFile = (file: File) =>
    runAction(() => importFromFile(file), {
      busy: setBusy,
      onSuccess: ({ toys_created, sessions_created }) => {
        const toys = `${toys_created} ${toys_created === 1 ? 'toy' : 'toys'}`;
        const sessions =
          sessions_created > 0 ? ` and ${sessions_created} ${sessions_created === 1 ? 'session' : 'sessions'}` : '';
        Toast.toast.success(`Imported ${toys}${sessions}`);
        onImported();
      },
    });

  const handleDeleteAll = () => {
    if (
      !confirm(
        'Permanently delete the entire collection? All toys and sessions will be removed. This cannot be undone.',
      )
    ) {
      return;
    }
    runAction(deleteCollection, {
      busy: setBusy,
      onSuccess: ({ toys_deleted, sessions_deleted }) => {
        const toys = `${toys_deleted} ${toys_deleted === 1 ? 'toy' : 'toys'}`;
        const sessions =
          sessions_deleted > 0 ? ` and ${sessions_deleted} ${sessions_deleted === 1 ? 'session' : 'sessions'}` : '';
        Toast.toast.success(`Deleted ${toys}${sessions}`);
        onImported();
      },
    });
  };

  const items: MenuItem[] = [
    {
      id: 'export',
      icon: Download,
      label: 'Export collection',
      description: 'Download the gallery as JSON',
      onAction: handleExport,
      disabledWhenBusy: true,
    },
    {
      id: 'import',
      icon: Upload,
      label: 'Import collection',
      description: 'Add toys from a JSON file',
      onAction: () => fileRef.current?.click(),
      disabledWhenBusy: true,
    },
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete collection',
      description: 'Permanently remove all toys and sessions',
      onAction: handleDeleteAll,
      danger: true,
      disabledWhenBusy: true,
    },
    {
      id: 'change-password',
      icon: KeyRound,
      label: 'Change password',
      description: 'Set a new sign-in password',
      onAction: onChangePassword,
    },
    {
      id: 'logout',
      icon: LogOut,
      label: 'Sign out',
      description: username ? `Signed in as ${username}` : 'End your session',
      onAction: logout,
    },
  ];

  const disabledKeys = busy ? items.filter((i) => i.disabledWhenBusy).map((i) => i.id) : [];

  return (
    <>
      <Dropdown>
        <Dropdown.Trigger className="group inline-flex items-baseline gap-2 rounded-md px-1 -mx-1 text-left transition-colors hover:bg-neutral-200/60">
          <span className="text-lg font-semibold tracking-tight text-neutral-900">Toy Gallery</span>
          {subtitle !== undefined && (
            <span className="inline-block min-w-22 text-sm font-normal text-neutral-500">{subtitle}</span>
          )}
          <ChevronDown
            size={10}
            strokeWidth={2.5}
            className="text-neutral-400 transition-colors group-hover:text-neutral-600"
          />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom start">
          <ActionDropdownMenu items={items} disabledKeys={disabledKeys} />
          <div className="px-3 py-1.5 text-center font-mono text-[10px] text-neutral-400">
            {APP_VERSION}
            {APP_COMMIT_SHA && ` · ${APP_COMMIT_SHA}`}
          </div>
        </Dropdown.Popover>
      </Dropdown>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) handleImportFile(file);
        }}
      />
    </>
  );
}
