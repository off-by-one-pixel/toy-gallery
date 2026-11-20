'use client';

import { useMemo } from 'react';
import { Alert, Chip, Spinner } from '@heroui/react';
import { useTranslations } from 'next-intl';

import { fetchChallenges } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import type { Challenge, Toy } from '@/api/types';
import { useSetTopBarSubtitle } from '@/components/TopBarProvider';
import {
  CHALLENGE_DISPLAY,
  type ChallengeDisplayContext,
  type ChallengeTarget,
} from '@/features/challenges/challenges';
import ToyThumbnail from '@/features/toys/ToyThumbnail';
import { useToyPropertyContext } from '@/features/toys/useToyPropertyContext';
import { useToys } from '@/features/toys/useToys';
import { useApiQuery } from '@/hooks/useApi';
import { useNow } from '@/hooks/useNow';

type Row = Readonly<{ challenge: Challenge; toy: Toy }>;

export default function ChallengeList() {
  const t = useTranslations('challenge');
  const { data, isPending, errorMessage } = useApiQuery({ key: queryKeys.toys.challenges, fn: fetchChallenges });
  const { toys, isLoading: toysLoading, error: toysError } = useToys();
  const propertyCtx = useToyPropertyContext();
  const now = useNow(60_000);
  const ctx: ChallengeDisplayContext = { ...propertyCtx, now };

  const rows = useMemo<Row[]>(() => {
    const toysById = new Map(toys.map((toy) => [toy.id, toy]));
    return (data ?? []).flatMap((challenge) => {
      const toy = toysById.get(challenge.toy);
      return toy ? [{ challenge, toy }] : [];
    });
  }, [data, toys]);

  const isLoading = isPending || toysLoading;
  const error = errorMessage ?? toysError;
  useSetTopBarSubtitle(isLoading ? null : t('items', { count: rows.length }));

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      );
    }
    if (rows.length === 0) {
      return error ? null : (
        <div className="rounded-xl border border-dashed border-border-secondary bg-surface py-12 text-center text-sm text-muted">
          {t('empty')}
        </div>
      );
    }
    return (
      <ul aria-label={t('listLabel')} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {rows.map(({ challenge, toy }) => (
          <ChallengeRow key={`${challenge.kind}-${toy.id}`} challenge={challenge} toy={toy} ctx={ctx} />
        ))}
      </ul>
    );
  };

  return (
    <main className="mx-auto max-w-300 px-4 py-6 sm:px-6">
      {error && (
        <Alert status="danger" className="mb-4">
          <Alert.Description>{error}</Alert.Description>
        </Alert>
      )}
      {renderBody()}
    </main>
  );
}

const KIND_TONES: Record<Challenge['kind'], string> = {
  'new-toy': 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  girth: 'bg-violet-500/15 text-violet-800 dark:text-violet-300',
  depth: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  'old-toy': 'bg-orange-500/15 text-orange-800 dark:text-orange-300',
  time: 'bg-rose-500/15 text-rose-800 dark:text-rose-300',
};

function ChallengeRow({ challenge, toy, ctx }: Row & Readonly<{ ctx: ChallengeDisplayContext }>) {
  const display = CHALLENGE_DISPLAY[challenge.kind];
  return (
    <li className="flex items-stretch border-b border-border last:border-b-0">
      <TargetBlock target={display.target(challenge, ctx)} tone={KIND_TONES[challenge.kind]} />
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:gap-3.5 sm:px-5">
        <ToyThumbnail
          shape={toy.shape}
          fillColor={toy.color}
          borderWidth={1}
          insetTop={4}
          insetBottom={4}
          insetX={4}
          className="h-15 w-12 shrink-0 rounded-md border border-border"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-caption uppercase tracking-[0.06em] text-muted">{toy.brand}</div>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground sm:text-base">{toy.name}</span>
            {toy.size && (
              <Chip size="sm" color="accent" className="shrink-0">
                <Chip.Label>{toy.size}</Chip.Label>
              </Chip>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {display.chips(challenge, ctx).map((chip) => (
              <Chip key={chip} size="sm">
                <Chip.Label>{chip}</Chip.Label>
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}

const TARGET_VALUE = 'text-2xl font-bold leading-tight tracking-tight tabular-nums';

function TargetBlock({ target, tone }: Readonly<{ target: ChallengeTarget; tone: string }>) {
  return (
    <div className={`flex w-28 shrink-0 flex-col justify-center gap-0.5 px-3 py-3 sm:w-36 sm:px-4 ${tone}`}>
      <span className="text-caption font-semibold uppercase tracking-[0.08em] opacity-80">{target.label}</span>
      {target.value ? (
        <span className={TARGET_VALUE}>
          {target.value.text}
          {target.value.suffix && <span className="ml-1 text-xs font-semibold">{target.value.suffix}</span>}
        </span>
      ) : (
        <span aria-hidden className={TARGET_VALUE}>
          {' '}
        </span>
      )}
    </div>
  );
}
