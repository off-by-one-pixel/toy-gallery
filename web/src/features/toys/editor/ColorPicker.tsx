'use client';

import { ColorSwatchPicker } from '@heroui/react';
import { useTranslations } from 'next-intl';

import { PRESET_COLORS } from '@/features/toys/editor/constants';

type Props = Readonly<{
  value: string;
  onChange: (v: string) => void;
}>;

export default function ColorPicker({ value, onChange }: Props) {
  const t = useTranslations('colorPicker');
  const isPreset = PRESET_COLORS.some((p) => p.hex.toLowerCase() === value.toLowerCase());
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ColorSwatchPicker value={value} onChange={(c) => onChange(c.toString('hex'))} aria-label={t('presets')}>
        {PRESET_COLORS.map((p) => (
          <ColorSwatchPicker.Item key={p.hex} color={p.hex} aria-label={p.name}>
            <ColorSwatchPicker.Swatch />
            <ColorSwatchPicker.Indicator />
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
      <label
        aria-label={t('custom')}
        className={`relative inline-flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white ring-1 transition-transform hover:scale-110 ${
          isPreset ? 'ring-border' : 'ring-2 ring-accent'
        }`}
        style={{
          background: isPreset
            ? 'conic-gradient(from 0deg, #fca5a5, #fbbf24, #bbf7d0, #bae6fd, #c4b5fd, #fca5a5)'
            : value,
        }}
        title={t('custom')}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
          aria-label={t('custom')}
        />
      </label>
    </div>
  );
}
