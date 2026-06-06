'use client';

import { useRef, useState } from 'react';

import { Button, Toast } from '@heroui/react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { deleteCollection, downloadExport, importFromFile } from '../../services/api';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import ConfirmModal from '../ConfirmModal';
import SectionCard from '../SectionCard';
import SectionHeading from '../SectionHeading';

export default function DataSection() {
  const t = useTranslations('settings.data');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const runAction = useAsyncAction();

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
      },
    });

  const handleDelete = () =>
    runAction(deleteCollection, {
      busy: setBusy,
      onSuccess: ({ toys_deleted, sessions_deleted }) => {
        Toast.toast.success(t('deletedToast', { toys: toys_deleted, sessions: sessions_deleted }));
        setConfirmOpen(false);
      },
    });

  return (
    <SectionCard>
      <SectionHeading title={t('heading')} />
      <ul className="flex flex-col divide-y divide-neutral-200">
        <DataRow
          icon={<Download size={16} strokeWidth={1.8} className="text-neutral-500" />}
          label={t('exportLabel')}
          description={t('exportDescription')}
          action={
            <Button variant="outline" size="sm" isDisabled={busy} onPress={handleExport}>
              {t('exportButton')}
            </Button>
          }
        />
        <DataRow
          icon={<Upload size={16} strokeWidth={1.8} className="text-neutral-500" />}
          label={t('importLabel')}
          description={t('importDescription')}
          action={
            <Button variant="outline" size="sm" isDisabled={busy} onPress={() => fileRef.current?.click()}>
              {t('importButton')}
            </Button>
          }
        />
        <DataRow
          icon={<Trash2 size={16} strokeWidth={1.8} className="text-red-500" />}
          label={<span className="text-red-600">{t('deleteLabel')}</span>}
          description={t('deleteDescription')}
          action={
            <Button variant="danger" size="sm" isDisabled={busy} onPress={() => setConfirmOpen(true)}>
              {t('deleteButton')}
            </Button>
          }
        />
      </ul>

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

      {confirmOpen && (
        <ConfirmModal
          onClose={() => setConfirmOpen(false)}
          title={t('deleteConfirm.title')}
          body={t('deleteConfirm.body')}
          confirmLabel={t('deleteConfirm.action')}
          confirmVariant="danger"
          busy={busy}
          onConfirm={handleDelete}
        />
      )}
    </SectionCard>
  );
}

type DataRowProps = Readonly<{
  icon: React.ReactNode;
  label: React.ReactNode;
  description: string;
  action: React.ReactNode;
}>;

function DataRow({ icon, label, description, action }: DataRowProps) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium text-neutral-900">{label}</div>
        <div className="text-[13px] text-neutral-500">{description}</div>
      </div>
      {action}
    </li>
  );
}
