import { queryKeys } from '@/api/queryKeys';
import { type FilterKey, filterStartDate, sessionFiltersKey, type SessionFilters } from '@/features/sessions/session';
import { sessionOrderingParam, type SessionSort } from '@/features/sessions/sessionSort';

export type SessionListQueryState = Readonly<{
  filter: FilterKey;
  sort: SessionSort | null;
  filters: SessionFilters;
}>;

export const sessionListQuery = (state: SessionListQueryState, page: number) => ({
  page,
  start: filterStartDate(state.filter),
  ordering: sessionOrderingParam(state.sort),
  filters: state.filters,
});

export const sessionListKey = (state: SessionListQueryState) =>
  queryKeys.sessions.list(state.filter, sessionOrderingParam(state.sort), sessionFiltersKey(state.filters));
