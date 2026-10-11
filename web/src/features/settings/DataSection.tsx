'use client';

import { useRef, useState } from 'react';

import { Button } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Trash2, Trophy, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { deleteCollection, downloadExport, importFromFile, rebuildRecords } from '@/api';
import { invalidateAllData, sessionDataKeys } from '@/api/queryKeys';
import { useApiMutation } from '@/hooks/useApi';
import ConfirmModal from '@/components/ConfirmModal';
import SectionCard from '@/features/settings/SectionCard';
import SectionHeading from '@/components/SectionHeading';

export default function DataSection() {
  const t = useTranslations('settings.data');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const exportData = useApiMutation({ fn: downloadExport, success: () => t('exportedToast') });
  const importData = useApiMutation({
    fn: importFromFile,
    success: ({ toysCreated, sessionsCreated }) => t('importedToast', { toys: toysCreated, sessions: sessionsCreated }),
    onSuccess: () => invalidateAllData(queryClient),
  });
  const rebuild = useApiMutation({
    fn: rebuildRecords,
    success: (count) => t('rebuiltToast', { count }),
    invalidates: sessionDataKeys,
  });
  const deleteAll = useApiMutation({
    fn: deleteCollection,
    success: ({ toysDeleted, sessionsDeleted }) => t('deletedToast', { toys: toysDeleted, sessions: sessionsDeleted }),
    onSuccess: () => {
      setConfirmOpen(false);
      invalidateAllData(queryClient);
    },
  });
  const busy = [exportData, importData, rebuild, deleteAll].some((m) => m.isPending);

  const handleExport = () => void exportData.run();
  const handleImportFile = (file: File) => void importData.run(file);
  const handleRebuild = () => void rebuild.run();
  const handleDelete = () => void deleteAll.run();

  return (
    <SectionCard>
      <SectionHeading title={t('heading')} />
      <ul className="flex flex-col divide-y divide-border">
        <DataRow
          icon={<Download size={16} strokeWidth={1.8} className="text-muted" />}
          label={t('exportLabel')}
          description={t('exportDescription')}
          action={
            <Button variant="outline" size="sm" isDisabled={busy} onPress={handleExport}>
              {t('exportButton')}
            </Button>
          }
        />
        <DataRow
          icon={<Upload size={16} strokeWidth={1.8} className="text-muted" />}
          label={t('importLabel')}
          description={t('importDescription')}
          action={
            <Button variant="outline" size="sm" isDisabled={busy} onPress={() => fileRef.current?.click()}>
              {t('importButton')}
            </Button>
          }
        />
        <DataRow
          icon={<Trophy size={16} strokeWidth={1.8} className="text-muted" />}
          label={t('rebuildLabel')}
          description={t('rebuildDescription')}
          action={
            <Button variant="outline" size="sm" isDisabled={busy} onPress={handleRebuild}>
              {t('rebuildButton')}
            </Button>
          }
        />
        <DataRow
          icon={<Trash2 size={16} strokeWidth={1.8} className="text-danger" />}
          label={<span className="text-danger">{t('deleteLabel')}</span>}
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
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-secondary">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-meta text-muted">{description}</div>
      </div>
      {action}
    </li>
  );
}
