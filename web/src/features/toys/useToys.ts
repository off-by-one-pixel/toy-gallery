'use client';

import { useQueryClient } from '@tanstack/react-query';

import { createToy, deleteToy, fetchToys, patchToy } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import type { Toy, ToyPayload } from '@/api/types';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';

const NO_TOYS: Toy[] = [];

export type SaveToyArgs = Readonly<{ toyId: number | null; payload: ToyPayload }>;

export type UpdateToyArgs = Readonly<{ toyId: number; changes: Partial<ToyPayload> }>;

export type ToysOptions = Readonly<{ saveErrorSink?: (message: string) => void }>;

export interface Toys {
  toys: Toy[];
  isLoading: boolean;
  error: string | null;
  saveToy: (args: SaveToyArgs) => Promise<Toy | undefined>;
  isSavingToy: boolean;
  updateToy: (args: UpdateToyArgs) => Promise<Toy | undefined>;
  removeToy: (id: number) => Promise<unknown>;
  isRemovingToy: boolean;
}

export function useToys(options: ToysOptions = {}): Toys {
  const queryClient = useQueryClient();
  const { data, isPending, errorMessage } = useApiQuery({ key: queryKeys.toys.all, fn: fetchToys });
  const invalidateToys = () => void queryClient.invalidateQueries({ queryKey: queryKeys.toys.all });

  const save = useApiMutation({
    fn: ({ toyId, payload }: SaveToyArgs) => (toyId === null ? createToy(payload) : patchToy(toyId, payload)),
    invalidates: [queryKeys.toys.all],
    errorSink: options.saveErrorSink,
  });

  const update = useApiMutation({
    fn: ({ toyId, changes }: UpdateToyArgs) => patchToy(toyId, changes),
    onSuccess: (updated) =>
      queryClient.setQueryData<Toy[]>(queryKeys.toys.all, (toys) =>
        toys?.map((t) => (t.id === updated.id ? updated : t)),
      ),
  });

  const removal = useApiMutation({ fn: deleteToy, onSettled: invalidateToys });

  return {
    toys: data ?? NO_TOYS,
    isLoading: isPending,
    error: errorMessage,
    saveToy: save.run,
    isSavingToy: save.isPending,
    updateToy: update.run,
    removeToy: removal.run,
    isRemovingToy: removal.isPending,
  };
}
