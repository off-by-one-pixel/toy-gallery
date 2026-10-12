import type { Involvement, Session } from '@/api/types';
import type { SessionPayload } from '@/features/sessions/useSessions';
import { datetimeLocalValue } from '@/lib/dates';

export type ToySelection = Readonly<{ involvement: Involvement; durationMinutes: number | null }>;

export type ToySelections = ReadonlyMap<number, ToySelection>;

export type SessionDraft = Readonly<{ startedAt: string; endedAt: string; selections: ToySelections }>;

export type SessionSaveKind = 'full' | 'startOnly';

export const selectionsFromSession = (session: Session | null): ToySelections =>
  new Map<number, ToySelection>(
    session?.entries.map((e) => [e.toy, { involvement: e.involvement, durationMinutes: e.durationMinutes ?? null }]),
  );

export const withInvolvement = (
  selections: ToySelections,
  toyId: number,
  involvement: Involvement | null,
): ToySelections => {
  const updated = new Map(selections);
  if (involvement) updated.set(toyId, { involvement, durationMinutes: selections.get(toyId)?.durationMinutes ?? null });
  else updated.delete(toyId);
  return updated;
};

export const withDuration = (
  selections: ToySelections,
  toyId: number,
  durationMinutes: number | null,
): ToySelections => {
  const current = selections.get(toyId);
  return current ? new Map(selections).set(toyId, { ...current, durationMinutes }) : selections;
};

export const isLiveOpen = (session: Session | null, endedAt: string): boolean =>
  session?.isLive === true && endedAt === '';

export const sessionSaveKind = (
  session: Session | null,
  { startedAt, endedAt, selections }: SessionDraft,
): SessionSaveKind | null => {
  if (selections.size > 0) return 'full';
  const startChanged = session !== null && startedAt !== datetimeLocalValue(new Date(session.startedAt));
  return isLiveOpen(session, endedAt) && startChanged ? 'startOnly' : null;
};

export const sessionPayload = ({ startedAt, endedAt, selections }: SessionDraft): SessionPayload => ({
  startedAt: new Date(startedAt).toISOString(),
  endedAt: endedAt ? new Date(endedAt).toISOString() : null,
  entries: [...selections].map(([toy, selection]) => ({ toy, ...selection })),
});
