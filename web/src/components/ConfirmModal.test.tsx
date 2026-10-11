import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import en from '@/i18n/catalogs/en.json';
import ConfirmModal from '@/components/ConfirmModal';
import { withAppProviders } from '@/test/render';

const renderModal = (props: Partial<React.ComponentProps<typeof ConfirmModal>> = {}) => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    withAppProviders(
      <ConfirmModal
        title="Delete it?"
        body="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onClose={onClose}
        {...props}
      />,
    ),
  );
  return { onConfirm, onClose };
};

describe('ConfirmModal', () => {
  it('shows the title, body and confirm label', () => {
    renderModal();
    expect(screen.getByText('Delete it?')).toBeTruthy();
    expect(screen.getByText('This cannot be undone.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });

  it('confirms without closing on its own', () => {
    const { onConfirm, onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on cancel without confirming', () => {
    const { onConfirm, onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: en.common.cancel }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders its children between the heading and the buttons', () => {
    renderModal({ children: <input aria-label="Reason" /> });
    const reason = screen.getByRole('textbox', { name: 'Reason' });
    const follows = (first: Element, second: Element) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(screen.getByText('This cannot be undone.'), reason)).toBe(true);
    expect(follows(reason, screen.getByRole('button', { name: 'Delete' }))).toBe(true);
  });

  it('disables only the confirm button when confirming is not allowed', () => {
    const { onConfirm } = renderModal({ confirmDisabled: true });
    const confirm = screen.getByRole('button', { name: 'Delete' });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: en.common.cancel }).hasAttribute('disabled')).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons while busy', () => {
    renderModal({ busy: true });
    expect(screen.getByRole('button', { name: 'Delete' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: en.common.cancel }).hasAttribute('disabled')).toBe(true);
  });
});
