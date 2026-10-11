'use client';

import { Chip } from '@heroui/react';
import { Check, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { DURATION_INCREMENTS_MINUTES, formatDuration } from '@/lib/duration';
import { Involvement, type Toy } from '@/api/types';
import ToyThumbnail from '@/features/toys/ToyThumbnail';

type Props = Readonly<{
  toy: Toy;
  state: Involvement | null;
  duration: number | null;
  wholeSessionMinutes: number | null;
  wholeSessionIsLive?: boolean;
  onChange: (next: Involvement | null) => void;
  onAddDuration: (minutes: number) => void;
  onSetDuration: (minutes: number) => void;
  onClearDuration: () => void;
}>;

const STATE_ORDER: Involvement[] = [Involvement.USED, Involvement.INSERTED, Involvement.FULLY_INSERTED];

const CHIP_BORDER: Record<Involvement, string> = {
  [Involvement.USED]: 'border-blue-300',
  [Involvement.INSERTED]: 'border-blue-500',
  [Involvement.FULLY_INSERTED]: 'border-blue-800',
};

const CHIP_CHECK: Record<Involvement, string> = {
  [Involvement.USED]: 'bg-blue-100 border-blue-300 text-blue-800',
  [Involvement.INSERTED]: 'bg-blue-400 border-blue-500 text-white',
  [Involvement.FULLY_INSERTED]: 'bg-blue-700 border-blue-800 text-white',
};

const SEG_ACTIVE: Record<Involvement, string> = {
  [Involvement.USED]: 'bg-blue-100 text-blue-800 shadow-xs',
  [Involvement.INSERTED]: 'bg-blue-400 text-white shadow-xs',
  [Involvement.FULLY_INSERTED]: 'bg-blue-700 text-white shadow-xs',
};

const STATE_CYCLE: (Involvement | null)[] = [null, Involvement.USED, Involvement.INSERTED, Involvement.FULLY_INSERTED];

const nextInCycle = (current: Involvement | null): Involvement | null => {
  const idx = STATE_CYCLE.indexOf(current);
  return STATE_CYCLE[(idx + 1) % STATE_CYCLE.length];
};

export default function ToyChipSelector({
  toy,
  state,
  duration,
  wholeSessionMinutes,
  wholeSessionIsLive = false,
  onChange,
  onAddDuration,
  onSetDuration,
  onClearDuration,
}: Props) {
  const t = useTranslations('involvement');
  const tDuration = useTranslations('session.duration');
  const locale = useLocale();

  const handlePick = (next: Involvement) => {
    onChange(state === next ? null : next);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChange(nextInCycle(state))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(nextInCycle(state));
        }
      }}
      className={
        'relative cursor-pointer overflow-hidden rounded-2xl border bg-surface shadow-sm transition-shadow hover:shadow-md ' +
        (state ? CHIP_BORDER[state] : 'border-border')
      }
    >
      <ToyThumbnail shape={toy.shape} fillColor={toy.color} className="h-35 border-b border-border">
        {state && duration != null && (
          <div key={duration} className="pill-flash absolute left-2.5 top-2.5 z-10 rounded-full">
            <Chip size="sm" className="border border-accent bg-surface shadow-sm">
              <Chip.Label>
                <span className="inline-flex items-center gap-1">
                  <span className="text-sm font-semibold tabular-nums">{formatDuration(duration, locale)}</span>
                  <button
                    type="button"
                    aria-label={tDuration('clearLabel')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearDuration();
                    }}
                    className="-my-1 -mr-1 grid h-6 w-6 place-items-center rounded-full text-muted transition-colors hover:text-foreground"
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </span>
              </Chip.Label>
            </Chip>
          </div>
        )}
        {state && (
          <div
            className={
              'absolute right-2.5 top-2.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border ' +
              CHIP_CHECK[state]
            }
          >
            <Check size={14} strokeWidth={3} />
          </div>
        )}
      </ToyThumbnail>
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-caption font-medium uppercase tracking-wider text-muted">{toy.brand}</div>
            <div className="truncate text-sm font-semibold text-foreground">{toy.name}</div>
          </div>
          {toy.size && (
            <Chip size="sm" color="accent" className="shrink-0">
              <Chip.Label>{toy.size}</Chip.Label>
            </Chip>
          )}
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-lg bg-surface-secondary p-1">
          {STATE_ORDER.map((s) => {
            const active = s === state;
            return (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePick(s);
                }}
                className={
                  'h-11 rounded-md text-xs font-medium transition-colors ' +
                  (active ? SEG_ACTIVE[s] : 'text-muted hover:bg-surface/60 hover:text-foreground')
                }
              >
                {t(s)}
              </button>
            );
          })}
        </div>

        {state && (
          <div className="mt-2.5">
            <div className="flex h-5 items-center">
              <span className="text-caption font-medium uppercase tracking-wider text-muted">{tDuration('label')}</span>
            </div>
            {wholeSessionMinutes != null && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDuration(wholeSessionMinutes);
                }}
                className="mt-1.5 h-8 w-full rounded-md bg-surface-secondary text-xs font-medium tabular-nums text-muted transition-colors hover:bg-surface/60 hover:text-foreground"
              >
                {tDuration(wholeSessionIsLive ? 'soFar' : 'wholeSession')} ·{' '}
                {formatDuration(wholeSessionMinutes, locale)}
              </button>
            )}
            <div className="mt-1.5 grid grid-cols-4 gap-1">
              {DURATION_INCREMENTS_MINUTES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddDuration(minutes);
                  }}
                  className="h-8 rounded-md bg-surface-secondary text-xs font-medium tabular-nums text-muted transition-colors hover:bg-surface/60 hover:text-foreground"
                >
                  +{formatDuration(minutes, locale)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
