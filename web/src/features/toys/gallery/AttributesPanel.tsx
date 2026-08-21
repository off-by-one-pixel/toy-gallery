'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAttributesEditor } from '@/features/toys/gallery/useAttributesEditor';
import type { Toy } from '@/api/types';

export default function AttributesPanel({ toy }: Readonly<{ toy: Toy }>) {
  const { rows, saveState, updateKey, updateValue, removeRow, addRow, commitChanges } = useAttributesEditor(toy);
  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };
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
              onKeyDown={blurOnEnter}
              className="w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-foreground hover:border-border focus:border-accent focus:bg-surface focus:outline-none"
            />
            <input
              type="text"
              value={row.value}
              placeholder={t('valuePlaceholder')}
              onChange={(e) => updateValue(row.rowId, e.target.value)}
              onBlur={commitChanges}
              onKeyDown={blurOnEnter}
              className="w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-foreground hover:border-border focus:border-accent focus:bg-surface focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeRow(row.rowId)}
              aria-label={t('removeLabel')}
              className="text-text-tertiary opacity-0 transition-opacity hover:text-foreground hover:opacity-100! group-hover:opacity-60"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <button type="button" onClick={addRow} className="text-caption text-muted transition-colors hover:text-accent">
          {t('addButton')}
        </button>
        <span
          aria-live="polite"
          className={
            'inline-flex items-center gap-1 text-caption text-accent transition-opacity duration-300 ' +
            (saveState === 'saved' ? 'opacity-100' : 'opacity-0')
          }
        >
          <Check size={11} strokeWidth={2.5} />
          {t('saved')}
        </span>
      </div>
    </div>
  );
}
