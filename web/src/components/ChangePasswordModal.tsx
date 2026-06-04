'use client';

import { useState } from 'react';

import { Alert, Button, Modal, Toast, useOverlayState } from '@heroui/react';
import { useTranslations } from 'next-intl';

import { useAsyncAction } from '../hooks/useAsyncAction';
import { changePassword } from '../services/api';
import TextInput from './TextInput';

type Props = Readonly<{
  onClose: () => void;
}>;

export default function ChangePasswordModal({ onClose }: Props) {
  const t = useTranslations('changePassword');
  const common = useTranslations('common');
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

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t('mismatch'));
      return;
    }
    await runAction(() => changePassword(currentPassword, newPassword), {
      busy: setSubmitting,
      onSuccess: () => {
        Toast.toast.success(t('successToast'));
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
                <h2 className="text-base font-semibold tracking-tight text-neutral-900">{t('title')}</h2>
                <p className="mt-1 text-[13px] text-neutral-500">{t('subtitle')}</p>
              </header>

              {error && (
                <Alert status="danger">
                  <Alert.Description>{error}</Alert.Description>
                </Alert>
              )}

              <Field label={t('currentLabel')} htmlFor="cp-current">
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
              <Field label={t('newLabel')} htmlFor="cp-new">
                <TextInput
                  id="cp-new"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field label={t('confirmLabel')} htmlFor="cp-confirm">
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
                  {common('cancel')}
                </Button>
                <Button variant="primary" size="sm" type="submit" isDisabled={submitting}>
                  {submitting ? common('saving') : common('save')}
                </Button>
              </div>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

function Field({ label, htmlFor, children }: Readonly<{ label: string; htmlFor: string; children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-neutral-900">
        {label}
      </label>
      {children}
    </div>
  );
}
