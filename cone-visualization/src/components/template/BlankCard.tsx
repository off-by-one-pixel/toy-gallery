'use client';

import { Plus } from 'lucide-react';

import { TEMPLATE_BLANK_DESCRIPTION, TEMPLATE_BLANK_NAME } from '../../labels';

type Props = Readonly<{
  onClick: () => void;
}>;

export default function BlankCard({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/40 text-left transition-colors hover:border-blue-500 hover:bg-blue-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex h-44 items-center justify-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 text-neutral-400 transition-colors group-hover:border-blue-500 group-hover:text-blue-600">
          <Plus size={22} strokeWidth={2.2} />
        </span>
      </div>
      <div className="border-t border-neutral-200 px-3 py-2.5">
        <div className="text-sm font-semibold text-neutral-900">{TEMPLATE_BLANK_NAME}</div>
        <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{TEMPLATE_BLANK_DESCRIPTION}</div>
      </div>
    </button>
  );
}
