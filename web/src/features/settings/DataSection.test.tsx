import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  importFromFile: vi.fn(),
  deleteCollection: vi.fn(),
}));

import { deleteCollection, importFromFile } from '@/api';
import en from '@/i18n/catalogs/en.json';
import DataSection from '@/features/settings/DataSection';
import { createTestQueryClient } from '@/test/QueryWrapper';
import { withAppProviders } from '@/test/render';

const renderSection = () => {
  const client = createTestQueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const { container } = render(withAppProviders(<DataSection />, { client }));
  return { container, invalidate };
};

describe('DataSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates every query after an import', async () => {
    vi.mocked(importFromFile).mockResolvedValue({ toysCreated: 2, sessionsCreated: 3 });
    const { container, invalidate } = renderSection();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    fireEvent.change(input!, { target: { files: [new File(['{}'], 'export.json')] } });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith());
    expect(importFromFile).toHaveBeenCalledTimes(1);
  });

  it('invalidates every query after deleting the collection', async () => {
    vi.mocked(deleteCollection).mockResolvedValue({ toysDeleted: 2, sessionsDeleted: 3 });
    const { invalidate } = renderSection();
    fireEvent.click(screen.getByRole('button', { name: en.settings.data.deleteButton }));
    fireEvent.click(await screen.findByRole('button', { name: en.settings.data.deleteConfirm.action }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith());
    expect(deleteCollection).toHaveBeenCalledTimes(1);
  });

  it('leaves the cache alone when deleting the collection fails', async () => {
    vi.mocked(deleteCollection).mockRejectedValue(new Error('boom'));
    const { invalidate } = renderSection();
    fireEvent.click(screen.getByRole('button', { name: en.settings.data.deleteButton }));
    fireEvent.click(await screen.findByRole('button', { name: en.settings.data.deleteConfirm.action }));
    await waitFor(() => expect(deleteCollection).toHaveBeenCalledTimes(1));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
