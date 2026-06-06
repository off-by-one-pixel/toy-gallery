'use client';

import { useRef, useState } from 'react';
import { Dropdown, Toast } from '@heroui/react';
import { ChevronDown, Download, KeyRound, LogOut, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('collection');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const runAction = useAsyncAction();
  const { username, logout } = useAuth();

  const handleExport = () =>
    runAction(downloadExport, {
      busy: setBusy,
      onSuccess: () => Toast.toast.success(t('exportedToast')),
    });

  const handleImportFile = (file: File) =>
    runAction(() => importFromFile(file), {
      busy: setBusy,
      onSuccess: ({ toys_created, sessions_created }) => {
        Toast.toast.success(t('importedToast', { toys: toys_created, sessions: sessions_created }));
        onImported();
      },
    });

  const handleDeleteAll = () => {
    if (!confirm(t('deleteAllConfirm'))) return;
    runAction(deleteCollection, {
      busy: setBusy,
      onSuccess: ({ toys_deleted, sessions_deleted }) => {
        Toast.toast.success(t('deletedToast', { toys: toys_deleted, sessions: sessions_deleted }));
        onImported();
      },
    });
  };

  const items: MenuItem[] = [
    {
      id: 'export',
      icon: Download,
      label: t('menu.exportLabel'),
      description: t('menu.exportDescription'),
      onAction: handleExport,
      disabledWhenBusy: true,
    },
    {
      id: 'import',
      icon: Upload,
      label: t('menu.importLabel'),
      description: t('menu.importDescription'),
      onAction: () => fileRef.current?.click(),
      disabledWhenBusy: true,
    },
    {
      id: 'delete',
      icon: Trash2,
      label: t('menu.deleteLabel'),
      description: t('menu.deleteDescription'),
      onAction: handleDeleteAll,
      danger: true,
      disabledWhenBusy: true,
    },
    {
      id: 'change-password',
      icon: KeyRound,
      label: t('menu.changePasswordLabel'),
      description: t('menu.changePasswordDescription'),
      onAction: onChangePassword,
    },
    {
      id: 'logout',
      icon: LogOut,
      label: t('menu.signOutLabel'),
      description: username
        ? t('menu.signOutDescriptionSignedIn', { username })
        : t('menu.signOutDescriptionAnonymous'),
      onAction: logout,
    },
  ];

  const disabledKeys = busy ? items.filter((i) => i.disabledWhenBusy).map((i) => i.id) : [];

  return (
    <>
      <Dropdown>
        <Dropdown.Trigger className="group inline-flex items-baseline gap-2 rounded-md px-1 -mx-1 text-left transition-colors hover:bg-neutral-200/60">
          <span className="text-lg font-semibold tracking-tight text-neutral-900">{t('appTitle')}</span>
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
