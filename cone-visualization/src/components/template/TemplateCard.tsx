'use client';

import { useMemo } from 'react';
import { ThumbnailRender } from 'cone-editor';

import { templatePreviewToy } from '../../services/templateForm';
import type { ToyTemplate } from '../../services/types';
import { PREVIEW_STYLE } from './styles';

type Props = Readonly<{
  template: ToyTemplate;
  onSelect: () => void;
}>;

export default function TemplateCard({ template, onSelect }: Props) {
  const previewToy = useMemo(() => templatePreviewToy(template), [template]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="relative h-44 bg-neutral-50">
        <div className="absolute inset-x-0 top-2 bottom-2 flex items-end justify-center">
          <ThumbnailRender toy={previewToy} scaleFactor={1} style={PREVIEW_STYLE} />
        </div>
      </div>
      <div className="border-t border-neutral-200 px-3 py-2.5">
        <div className="text-sm font-semibold text-neutral-900">{template.name}</div>
        {template.description && (
          <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{template.description}</div>
        )}
      </div>
    </button>
  );
}
