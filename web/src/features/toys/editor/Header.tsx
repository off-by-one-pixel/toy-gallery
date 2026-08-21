'use client';

import { Button, Dropdown } from '@heroui/react';
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ToyEditMode } from '@/features/toys/editor/toyEditForm';
import type { WizardStage } from '@/features/toys/editor/useToyEditorWizardNav';
import ActionDropdownMenu, { type ActionMenuItem } from '@/components/ActionDropdownMenu';

type Props = Readonly<{
  mode: ToyEditMode;
  effectiveStage: WizardStage;
  saving: boolean;
  onBack: () => void;
  onClose: () => void;
  onSave: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
}>;

export default function Header({
  mode,
  effectiveStage,
  saving,
  onBack,
  onClose,
  onSave,
  onOpenExport,
  onOpenImport,
}: Props) {
  const t = useTranslations('toyEdit.header');
  const common = useTranslations('common');
  const templateT = useTranslations('template');
  const isPickingTemplate = effectiveStage === 'template';
  const headerLabel = mode.kind === 'edit' ? common('edit') : mode.kind === 'copy' ? common('copy') : t('newMode');
  const title =
    mode.kind === 'edit'
      ? `${mode.toy.brand} · ${mode.toy.name}${mode.toy.size ? ` · ${mode.toy.size}` : ''}`
      : mode.kind === 'copy'
        ? t('copyFrom', { brand: mode.toy.brand, name: mode.toy.name })
        : isPickingTemplate
          ? templateT('newToyHeaderTitle')
          : t('untitled');

  const dropdownItems: ActionMenuItem[] = [
    {
      id: 'export-json',
      icon: ArrowDownToLine,
      label: templateT('exportMenu'),
      description: templateT('exportMenuDescription'),
      onAction: onOpenExport,
    },
    {
      id: 'import-json',
      icon: ArrowUpFromLine,
      label: templateT('importMenu'),
      description: templateT('importMenuDescription'),
      onAction: onOpenImport,
    },
  ];

  return (
    <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
      <Button variant="outline" size="sm" isIconOnly aria-label={common('back')} onPress={onBack}>
        <ArrowLeft size={14} strokeWidth={2} />
      </Button>
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {headerLabel}
        <span className="ml-2 font-normal text-muted">{title}</span>
      </h2>
      <div className="flex-1" />
      {!isPickingTemplate && (
        <Dropdown>
          <Dropdown.Trigger
            className="button button--outline button--sm button--icon-only inline-flex items-center justify-center"
            aria-label={templateT('moreActions')}
            isDisabled={saving}
          >
            <MoreHorizontal size={14} strokeWidth={2} />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <ActionDropdownMenu items={dropdownItems} />
          </Dropdown.Popover>
        </Dropdown>
      )}
      <Button variant="outline" size="sm" isDisabled={saving} onPress={onClose}>
        {common('cancel')}
      </Button>
      {!isPickingTemplate && (
        <Button variant="primary" size="sm" isDisabled={saving} onPress={onSave}>
          {saving ? common('saving') : common('save')}
        </Button>
      )}
    </header>
  );
}
