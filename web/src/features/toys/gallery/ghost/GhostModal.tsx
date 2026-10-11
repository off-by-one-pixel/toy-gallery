'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import ConfirmModal from '@/components/ConfirmModal';
import UnitField from '@/features/preferences/UnitField';
import { useGirth } from '@/features/preferences/useGirth';
import { useUnit } from '@/features/preferences/useUnit';
import {
  ghostDimsToInputs,
  ghostSourceName,
  parseGhostInputs,
  type GhostDimensions,
  type GhostInputs,
  type GhostTarget,
} from '@/features/toys/gallery/ghost/ghosts';

type Props = Readonly<{
  target: GhostTarget;
  onSave: (dims: GhostDimensions) => void;
  onClose: () => void;
}>;

const targetDimensions = (target: GhostTarget): GhostDimensions =>
  target.kind === 'edit'
    ? { circumference: target.ghost.circumference, insertableLength: target.ghost.insertableLength }
    : { circumference: target.source.circumference ?? 0, insertableLength: target.source.insertableLength ?? 0 };

export default function GhostModal({ target, onSave, onClose }: Props) {
  const t = useTranslations('toy.ghost');
  const common = useTranslations('common');
  const { unit } = useUnit();
  const { girth } = useGirth();
  const isEdit = target.kind === 'edit';
  const sourceName = isEdit ? target.ghost.sourceName : ghostSourceName(target.source);
  const [inputs, setInputs] = useState<GhostInputs>(() => ghostDimsToInputs(targetDimensions(target), unit, girth));
  const dims = parseGhostInputs(inputs, unit, girth);

  const save = () => {
    if (dims) onSave(dims);
  };

  return (
    <ConfirmModal
      onClose={onClose}
      title={isEdit ? t('modalTitleEdit') : t('modalTitleNew')}
      body={t('modalSubtitle', { name: sourceName })}
      confirmLabel={isEdit ? common('save') : t('add')}
      confirmDisabled={!dims}
      onConfirm={save}
    >
      <div className="flex flex-col gap-3">
        <UnitField
          label={common(girth)}
          value={inputs.girthValue}
          unit={unit}
          onChange={(girthValue) => setInputs((current) => ({ ...current, girthValue }))}
        />
        <UnitField
          label={common('insertable')}
          value={inputs.lengthValue}
          unit={unit}
          onChange={(lengthValue) => setInputs((current) => ({ ...current, lengthValue }))}
        />
      </div>
    </ConfirmModal>
  );
}
