'use client';

import { useRef, useState } from 'react';
import { Dropdown, Toast } from '@heroui/react';
import { ChevronDown, Download, LogOut, Upload } from 'lucide-react';

import { APP_COMMIT_SHA, APP_VERSION } from '../config';
import { downloadExport, importFromFile } from '../services/api';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useAuth } from '../providers/AuthProvider';

type Props = {
  onImported: () => void;
  subtitle?: React.ReactNode;
};

export default function CollectionMenu({ onImported, subtitle }: Props) {
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
      onSuccess: (result) => {
        Toast.toast.success(`Imported ${result.created} ${result.created === 1 ? 'toy' : 'toys'}`);
        onImported();
      },
    });

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
          <Dropdown.Menu disabledKeys={busy ? ['export', 'import'] : []}>
            <Dropdown.Item id="export" onAction={handleExport}>
              <MenuRow
                icon={<Download size={14} strokeWidth={1.8} />}
                label="Export collection"
                description="Download the gallery as JSON"
              />
            </Dropdown.Item>
            <Dropdown.Item id="import" onAction={() => fileRef.current?.click()}>
              <MenuRow
                icon={<Upload size={14} strokeWidth={1.8} />}
                label="Import collection"
                description="Add toys from a JSON file"
              />
            </Dropdown.Item>
            <Dropdown.Item id="logout" onAction={logout}>
              <MenuRow
                icon={<LogOut size={14} strokeWidth={1.8} />}
                label="Sign out"
                description={username ? `Signed in as ${username}` : 'End your session'}
              />
            </Dropdown.Item>
          </Dropdown.Menu>
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

function MenuRow({ icon, label, description }: { icon: React.ReactNode; label: string; description: string }) {
  return (
    <span className="flex items-start gap-2.5">
      <span className="mt-0.5 text-neutral-500">{icon}</span>
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-[11px] text-neutral-500">{description}</span>
      </span>
    </span>
  );
}
