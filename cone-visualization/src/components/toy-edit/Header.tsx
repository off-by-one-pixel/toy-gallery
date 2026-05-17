'use client';

import { Button, Dropdown } from '@heroui/react';
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, MoreHorizontal } from 'lucide-react';

import {
  TEMPLATE_EXPORT_MENU_DESCRIPTION,
  TEMPLATE_EXPORT_MENU_LABEL,
  TEMPLATE_IMPORT_MENU_DESCRIPTION,
  TEMPLATE_IMPORT_MENU_LABEL,
  TEMPLATE_MORE_ACTIONS_LABEL,
  TEMPLATE_NEW_TOY_HEADER_TITLE,
} from '../../labels';
import type { ToyEditMode } from '../../services/toyEditForm';
import type { WizardStage } from '../../hooks/nav/useToyEditorWizardNav';
import ActionDropdownMenu, { type ActionMenuItem } from '../ActionDropdownMenu';

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
  const isPickingTemplate = effectiveStage === 'template';
  const headerLabel = mode.kind === 'edit' ? 'Edit' : mode.kind === 'copy' ? 'Copy' : 'New toy';
  const title =
    mode.kind === 'edit'
      ? `${mode.toy.brand} · ${mode.toy.name}${mode.toy.size ? ` · ${mode.toy.size}` : ''}`
      : mode.kind === 'copy'
        ? `from ${mode.toy.brand} · ${mode.toy.name}`
        : isPickingTemplate
          ? TEMPLATE_NEW_TOY_HEADER_TITLE
          : 'Untitled toy';

  const dropdownItems: ActionMenuItem[] = [
    {
      id: 'export-json',
      icon: ArrowDownToLine,
      label: TEMPLATE_EXPORT_MENU_LABEL,
      description: TEMPLATE_EXPORT_MENU_DESCRIPTION,
      onAction: onOpenExport,
    },
    {
      id: 'import-json',
      icon: ArrowUpFromLine,
      label: TEMPLATE_IMPORT_MENU_LABEL,
      description: TEMPLATE_IMPORT_MENU_DESCRIPTION,
      onAction: onOpenImport,
    },
  ];

  return (
    <header className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
      <Button variant="outline" size="sm" isIconOnly aria-label="Back" onPress={onBack}>
        <ArrowLeft size={14} strokeWidth={2} />
      </Button>
      <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
        {headerLabel}
        <span className="ml-2 font-normal text-neutral-500">{title}</span>
      </h2>
      <div className="flex-1" />
      {!isPickingTemplate && (
        <Dropdown>
          <Dropdown.Trigger
            className="button button--outline button--sm button--icon-only inline-flex items-center justify-center"
            aria-label={TEMPLATE_MORE_ACTIONS_LABEL}
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
        Cancel
      </Button>
      {!isPickingTemplate && (
        <Button variant="primary" size="sm" isDisabled={saving} onPress={onSave}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      )}
    </header>
  );
}
