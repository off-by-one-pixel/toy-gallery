'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { ToyEditorLabels } from 'toy-editor';

export function useToyEditorLabels(): ToyEditorLabels {
  const t = useTranslations('toyEditor');
  const common = useTranslations('common');
  const shape = useTranslations('shape');
  const colorPicker = useTranslations('colorPicker');
  return useMemo(
    () => ({
      knownMeasurements: t('knownMeasurements'),
      insertable: common('insertable'),
      total: t('total'),
      circumference: common('circumference'),
      snap: t('snap'),
      sectionCircumferences: t('sectionCircumferences'),
      topShape: t('topShape'),
      bottomShape: t('bottomShape'),
      shapes: { FLAT: shape('FLAT'), EGG: shape('EGG'), CONE: shape('CONE'), SPIKE: shape('SPIKE') },
      addSection: t('addSection'),
      addReferenceImage: t('addReferenceImage'),
      removeReferenceImage: t('removeReferenceImage'),
      referenceImageFile: t('referenceImageFile'),
      resizeReferenceImage: t('resizeReferenceImage'),
      insertableGuide: (length) => t('insertableGuide', { length }),
      totalGuide: (length) => t('totalGuide', { length }),
      totalReadout: (length) => t('totalReadout', { length }),
      heightPrefix: t('heightPrefix'),
      circumferencePrefix: t('circumferencePrefix'),
      sectionHeight: (section) => t('sectionHeight', { section }),
      sectionDiameter: (section) => t('sectionDiameter', { section }),
      sectionCircumference: (section) => t('sectionCircumference', { section }),
      sectionTooWide: t('sectionTooWide'),
      sectionTopAngle: (section, degrees) => t('sectionTopAngle', { section, degrees }),
      sectionBottomAngle: (section, degrees) => t('sectionBottomAngle', { section, degrees }),
      removeSection: (section) => t('removeSection', { section }),
      sectionColor: (section) => t('sectionColor', { section }),
      sectionColorPalette: t('sectionColorPalette'),
      toyColor: t('toyColor'),
      customColor: colorPicker('custom'),
    }),
    [t, common, shape, colorPicker],
  );
}
