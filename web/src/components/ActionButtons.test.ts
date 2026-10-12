import { Pencil, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { editDeleteActions } from '@/components/ActionButtons';

describe('editDeleteActions', () => {
  it('builds an outline edit action and a danger delete action wired to the callbacks', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const [edit, remove] = editDeleteActions((key) => `label:${key}`, onEdit, onDelete);

    expect(edit).toMatchObject({ key: 'edit', label: 'label:edit', icon: Pencil, variant: 'outline' });
    expect(remove).toMatchObject({ key: 'delete', label: 'label:delete', icon: Trash2, variant: 'danger-soft' });

    edit.onPress();
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    remove.onPress();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
