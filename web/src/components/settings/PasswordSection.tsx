'use client';

import { useState } from 'react';

import { Alert, Button, Toast } from '@heroui/react';
import { useTranslations } from 'next-intl';

import { useAsyncAction } from '../../hooks/useAsyncAction';
import { changePassword } from '../../services/api';
import SectionCard from '../SectionCard';
import SectionHeading from '../SectionHeading';
import TextInput from '../TextInput';

export default function PasswordSection() {
  const t = useTranslations('settings.password');
  const cp = useTranslations('changePassword');
  const common = useTranslations('common');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAction = useAsyncAction(setError);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(cp('mismatch'));
      return;
    }
    await runAction(() => changePassword(currentPassword, newPassword), {
      busy: setSubmitting,
      onSuccess: () => {
        Toast.toast.success(cp('successToast'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
      },
    });
  };

  return (
    <SectionCard>
      <SectionHeading title={t('heading')} subtitle={t('subtitle')} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <Alert status="danger">
            <Alert.Description>{error}</Alert.Description>
          </Alert>
        )}
        <Field label={cp('currentLabel')} htmlFor="cp-current">
          <TextInput
            id="cp-current"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label={cp('newLabel')} htmlFor="cp-new">
          <TextInput
            id="cp-new"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label={cp('confirmLabel')} htmlFor="cp-confirm">
          <TextInput
            id="cp-confirm"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            required
          />
        </Field>
        <div className="mt-1 flex justify-end">
          <Button variant="primary" size="sm" type="submit" isDisabled={submitting}>
            {submitting ? common('saving') : common('save')}
          </Button>
        </div>
      </form>
    </SectionCard>
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
