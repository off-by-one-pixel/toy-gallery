'use client';

import { useState } from 'react';

import { Button, Modal, useOverlayState } from '@heroui/react';
import { useTranslations } from 'next-intl';

import SectionHeading from '@/components/SectionHeading';
import { useGirth } from '@/features/preferences/GirthProvider';
import { useUnit } from '@/features/preferences/UnitProvider';
import {
  ghostDimsToInputs,
  parseGhostInputs,
  type GhostDimensions,
  type GhostInputs,
} from '@/features/toys/gallery/ghost/ghosts';

type Props = Readonly<{
  initial: GhostDimensions;
  sourceName: string;
  isEdit: boolean;
  onSave: (dims: GhostDimensions) => void;
  onClose: () => void;
}>;

export default function GhostModal({ initial, sourceName, isEdit, onSave, onClose }: Props) {
  const t = useTranslations('toy.ghost');
  const common = useTranslations('common');
  const { unit } = useUnit();
  const { girth } = useGirth();
  const [inputs, setInputs] = useState<GhostInputs>(() => ghostDimsToInputs(initial, unit, girth));
  const dims = parseGhostInputs(inputs, unit, girth);

  const overlayState = useOverlayState({
    defaultOpen: true,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });

  const save = () => {
    if (dims) onSave(dims);
  };

  return (
    <Modal.Root state={overlayState}>
      <Modal.Backdrop>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <div className="flex flex-col gap-4 p-5">
              <SectionHeading
                title={isEdit ? t('modalTitleEdit') : t('modalTitleNew')}
                subtitle={t('modalSubtitle', { name: sourceName })}
              />
              <div className="flex flex-col gap-3">
                <DimensionField
                  label={common(girth)}
                  value={inputs.girthValue}
                  unitId={unit.id}
                  onChange={(girthValue) => setInputs((current) => ({ ...current, girthValue }))}
                />
                <DimensionField
                  label={common('insertable')}
                  value={inputs.lengthValue}
                  unitId={unit.id}
                  onChange={(lengthValue) => setInputs((current) => ({ ...current, lengthValue }))}
                />
              </div>
              <div className="mt-1 flex justify-end gap-2">
                <Button variant="outline" size="sm" onPress={() => overlayState.close()}>
                  {common('cancel')}
                </Button>
                <Button variant="primary" size="sm" isDisabled={!dims} onPress={save}>
                  {isEdit ? common('save') : t('add')}
                </Button>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

function DimensionField({
  label,
  value,
  unitId,
  onChange,
}: Readonly<{ label: string; value: string; unitId: string; onChange: (value: string) => void }>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption uppercase tracking-wider text-text-tertiary">{label}</span>
      <span className="flex items-baseline gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-accent">
        <input
          value={value}
          inputMode="decimal"
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold tabular-nums text-foreground outline-none"
        />
        <span className="text-caption text-muted">{unitId}</span>
      </span>
    </label>
  );
}
