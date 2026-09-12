import { queryKeys } from '@/api/queryKeys';
import {
  type Period,
  periodKey,
  periodRange,
  sessionFiltersKey,
  type SessionFilters,
} from '@/features/sessions/session';
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
  queryKeys.sessions.list(periodKey(state.period), sessionOrderingParam(state.sort), sessionFiltersKey(state.filters));
