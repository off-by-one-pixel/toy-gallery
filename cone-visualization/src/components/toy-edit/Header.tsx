'use client';

import type { ReactNode } from 'react';
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

type Props = Readonly<{
  mode: ToyEditMode;
  effectiveStage: WizardStage;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
}>;

export default function Header({ mode, effectiveStage, saving, onClose, onSave, onOpenExport, onOpenImport }: Props) {
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

  return (
    <header className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
      <Button variant="outline" size="sm" isIconOnly aria-label="Back" onPress={onClose}>
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
            <Dropdown.Menu>
              <Dropdown.Item id="export-json" onAction={onOpenExport}>
                <ActionRow
                  icon={<ArrowDownToLine size={14} strokeWidth={1.8} />}
                  label={TEMPLATE_EXPORT_MENU_LABEL}
                  description={TEMPLATE_EXPORT_MENU_DESCRIPTION}
                />
              </Dropdown.Item>
              <Dropdown.Item id="import-json" onAction={onOpenImport}>
                <ActionRow
                  icon={<ArrowUpFromLine size={14} strokeWidth={1.8} />}
                  label={TEMPLATE_IMPORT_MENU_LABEL}
                  description={TEMPLATE_IMPORT_MENU_DESCRIPTION}
                />
              </Dropdown.Item>
            </Dropdown.Menu>
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

function ActionRow({
  icon,
  label,
  description,
}: Readonly<{
  icon: ReactNode;
  label: ReactNode;
  description: string;
}>) {
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
