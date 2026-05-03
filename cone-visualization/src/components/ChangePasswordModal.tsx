'use client';

import { useState } from 'react';

import { Alert, Button, Modal, Toast, useOverlayState } from '@heroui/react';

import { useAsyncAction } from '../hooks/useAsyncAction';
import { changePassword } from '../services/api';
import TextInput from './TextInput';

type Props = {
  onClose: () => void;
};

export default function ChangePasswordModal({ onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAction = useAsyncAction(setError);

  const overlayState = useOverlayState({
    defaultOpen: true,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    await runAction(() => changePassword(currentPassword, newPassword), {
      busy: setSubmitting,
      onSuccess: () => {
        Toast.toast.success('Password changed');
        overlayState.close();
      },
    });
  };

  return (
    <Modal.Root state={overlayState}>
      <Modal.Backdrop>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
              <header>
                <h2 className="text-base font-semibold tracking-tight text-neutral-900">Change password</h2>
                <p className="mt-1 text-[13px] text-neutral-500">
                  Enter your current password and pick a new one.
                </p>
              </header>

              {error && (
                <Alert status="danger">
                  <Alert.Description>{error}</Alert.Description>
                </Alert>
              )}

              <Field label="Current password" htmlFor="cp-current">
                <TextInput
                  id="cp-current"
                  type="password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                  required
                  autoFocus
                />
              </Field>
              <Field label="New password" htmlFor="cp-new">
                <TextInput
                  id="cp-new"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field label="Confirm new password" htmlFor="cp-confirm">
                <TextInput
                  id="cp-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  required
                />
              </Field>

              <div className="mt-1 flex justify-end gap-2">
                <Button variant="outline" size="sm" isDisabled={submitting} onPress={() => overlayState.close()}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isDisabled={submitting}>
                  {submitting ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-neutral-900">
        {label}
      </label>
      {children}
    </div>
  );
}
