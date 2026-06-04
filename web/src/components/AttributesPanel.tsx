'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAttributesEditor } from '../hooks/useAttributesEditor';
import type { Toy } from '../services/types';

export default function AttributesPanel({ toy }: Readonly<{ toy: Toy }>) {
  const { rows, updateKey, updateValue, removeRow, addRow, commitChanges } = useAttributesEditor(toy);
  const t = useTranslations('attributes');

  return (
    <div>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.rowId} className="group grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input
              type="text"
              value={row.key}
              placeholder={t('keyPlaceholder')}
              onChange={(e) => updateKey(row.rowId, e.target.value)}
              onBlur={commitChanges}
              className="w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-neutral-700 hover:border-neutral-200 focus:border-blue-400 focus:bg-white focus:outline-none"
            />
            <input
              type="text"
              value={row.value}
              placeholder={t('valuePlaceholder')}
              onChange={(e) => updateValue(row.rowId, e.target.value)}
              onBlur={commitChanges}
              className="w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-neutral-900 hover:border-neutral-200 focus:border-blue-400 focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeRow(row.rowId)}
              aria-label={t('removeLabel')}
              className="text-neutral-400 opacity-0 transition-opacity hover:text-neutral-700 hover:opacity-100! group-hover:opacity-60"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addRow}
        className="mt-1.5 text-[11px] text-neutral-500 transition-colors hover:text-blue-600"
      >
        {t('addButton')}
      </button>
    </div>
  );
}
