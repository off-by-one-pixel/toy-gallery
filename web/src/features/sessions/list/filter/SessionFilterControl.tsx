'use client';

import { useContext } from 'react';
import { Button, Slider } from '@heroui/react';
import { Check, Funnel, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { BottomSheetContext } from '@/components/BottomSheet';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import { toyTooltip } from '@/features/sessions/session';
import { localizedHourLabel } from '@/lib/dates';
import {
  FULL_DAY,
  type SessionFiltersArgs,
  type SessionFiltersState,
  type TimeSliderState,
  type ToyOption,
  useSessionFilters,
} from '@/features/sessions/list/filter/useSessionFilters';

export default function SessionFilterControl(props: SessionFiltersArgs) {
  const t = useTranslations('session.filters');
  const state = useSessionFilters(props);

  const triggerClass = `inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
    state.count > 0
      ? 'bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft/80'
      : 'bg-surface-tertiary/70 text-muted hover:text-foreground'
  }`;

  return (
    <ResponsiveOverlay
      label={t('buttonLabel')}
      trigger={<TriggerContent label={t('buttonLabel')} count={state.count} />}
      triggerClassName={triggerClass}
      popoverClassName="flex flex-col overflow-hidden"
    >
      {({ close, mode }) => (
        <>
          <FilterPanel state={state} />
          {mode === 'sheet' && (
            <div className="shrink-0 px-2.5 pt-2">
              <Button variant="primary" size="sm" className="w-full" onPress={close}>
                {t('doneButton')}
              </Button>
            </div>
          )}
        </>
      )}
    </ResponsiveOverlay>
  );
}

function TriggerContent({ label, count }: Readonly<{ label: string; count: number }>) {
  return (
    <>
      <Funnel size={13} strokeWidth={2} />
      <span className="hidden sm:inline">{label}</span>
      {count > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
          {count}
        </span>
      )}
    </>
  );
}

function FilterPanel({ state }: Readonly<{ state: SessionFiltersState }>) {
  const t = useTranslations('session.filters');
  const translate = t as unknown as (key: string) => string;
  const wide = useContext(BottomSheetContext);

  return (
    <div className={`flex min-h-0 flex-col p-2.5 ${wide ? 'w-full' : 'w-66'}`}>
      <SectionLabel text={t('timeLabel')} />
      <TimeWindowSlider slider={state.slider} anyLabel={t('timeAny')} fromLabel={t('timeFrom')} toLabel={t('timeTo')} />
      <div className="my-1.5 h-px shrink-0 bg-border" />
      <label className="mb-2 flex shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
        <Search size={13} strokeWidth={2} className="shrink-0 text-muted" />
        <input
          value={state.query}
          onChange={(e) => state.setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="min-w-0 flex-1 border-0 bg-transparent text-xs text-foreground outline-none placeholder:text-text-tertiary"
        />
      </label>
      {state.selectedToys.length > 0 && (
        <>
          <SectionLabel text={t('selectedHeading', { count: state.selectedToys.length })} />
          <div className="flex max-h-40 shrink-0 flex-col gap-px overflow-y-auto pr-1.5">
            {state.selectedToys.map((option) => (
              <ToyRow key={option.toy.id} option={option} checked />
            ))}
          </div>
          <div className="my-1.5 h-px shrink-0 bg-border" />
        </>
      )}
      <SectionLabel text={t('toysHeading')} />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1.5">
        {state.availableToys.map((option) => (
          <ToyRow key={option.toy.id} option={option} checked={false} />
        ))}
        {state.availableToys.length === 0 && <p className="px-2.5 py-1.5 text-xs text-text-tertiary">{t('noToys')}</p>}
      </div>
      <div className="my-1.5 h-px shrink-0 bg-border" />
      <SectionLabel text={t('moreHeading')} />
      <div className="shrink-0">
        {state.flags.map((flag) => (
          <CheckRow key={flag.key} label={translate(flag.labelKey)} checked={flag.active} onToggle={flag.toggle} />
        ))}
      </div>
      {state.count > 0 && (
        <button
          type="button"
          onClick={state.clearAll}
          className="mt-2 shrink-0 self-start px-2.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('clearAll')}
        </button>
      )}
    </div>
  );
}

function TimeWindowSlider({
  slider,
  anyLabel,
  fromLabel,
  toLabel,
}: Readonly<{ slider: TimeSliderState; anyLabel: string; fromLabel: string; toLabel: string }>) {
  const locale = useLocale();
  return (
    <div className="shrink-0 px-2.5 py-1.5">
      <Slider.Root
        key={slider.value.join('-')}
        aria-label={`${fromLabel} – ${toLabel}`}
        minValue={0}
        maxValue={24}
        step={1}
        defaultValue={[...slider.value]}
        onChangeEnd={(next) => slider.onCommit(next as [number, number])}
      >
        <Slider.Output className="mb-1 flex w-full items-center justify-between text-xs tabular-nums text-foreground">
          {({ state }) =>
            state.values[0] === FULL_DAY[0] && state.values[1] === FULL_DAY[1] ? (
              <span className="text-muted">{anyLabel}</span>
            ) : (
              <>
                <span>{localizedHourLabel(state.values[0], locale)}</span>
                <span>{localizedHourLabel(state.values[1] % 24, locale)}</span>
              </>
            )
          }
        </Slider.Output>
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb index={0} aria-label={fromLabel} className="size-4 rounded-full" />
          <Slider.Thumb index={1} aria-label={toLabel} className="size-4 rounded-full" />
        </Slider.Track>
      </Slider.Root>
    </div>
  );
}

function SectionLabel({ text }: Readonly<{ text: string }>) {
  return <div className="shrink-0 px-2.5 pb-1 text-caption uppercase tracking-wider text-text-tertiary">{text}</div>;
}

function ToyRow({ option, checked }: Readonly<{ option: ToyOption; checked: boolean }>) {
  return <CheckRow label={toyTooltip(option.toy)} meta={`${option.uses}`} checked={checked} onToggle={option.toggle} />;
}

function CheckRow({
  label,
  meta,
  checked,
  onToggle,
}: Readonly<{ label: string; meta?: string; checked: boolean; onToggle: () => void }>) {
  return (
    <label
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
        checked ? 'bg-accent-soft text-accent-soft-foreground' : 'text-foreground hover:bg-surface-tertiary/60'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
          checked ? 'border-accent bg-accent text-accent-foreground' : 'border-border-secondary bg-surface'
        }`}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      {meta !== undefined && <span className="text-caption text-text-tertiary">{meta}</span>}
    </label>
  );
}
