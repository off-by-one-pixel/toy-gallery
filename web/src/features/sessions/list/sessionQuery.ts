import { queryKeys } from '@/api/queryKeys';
import { type Period, periodRange, type SessionFilters } from '@/features/sessions/session';
import { sessionOrderingParam, type SessionSort } from '@/features/sessions/sessionSort';

export type SessionListQueryState = Readonly<{
  period: Period;
  sort: SessionSort;
  filters: SessionFilters;
}>;

export const sessionListQuery = (state: SessionListQueryState, page: number) => ({
  page,
  ...periodRange(state.period),
  ordering: sessionOrderingParam(state.sort),
  filters: state.filters,
});

export const sessionListKey = (state: SessionListQueryState) =>
  queryKeys.sessions.list(state.period, sessionOrderingParam(state.sort), state.filters);
