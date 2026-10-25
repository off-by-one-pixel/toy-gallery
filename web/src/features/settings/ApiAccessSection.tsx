'use client';

import { type ReactNode, useState } from 'react';

import { Button, Toast, buttonVariants } from '@heroui/react';
import { BookOpen, Check, Copy, ExternalLink, KeyRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { createAppToken, fetchAppTokenStatus, revokeAppToken } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { API_CONFIG } from '@/config';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';
import ConfirmModal from '@/components/ConfirmModal';
import DisabledReason from '@/components/DisabledReason';
import SectionCard from '@/features/settings/SectionCard';
import SectionHeading from '@/components/SectionHeading';
import SettingsRow from '@/features/settings/SettingsRow';

type ConfirmAction = 'regenerate' | 'revoke';

const CREATED_DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

const renderCode = (chunks: ReactNode) => <code className="font-mono text-foreground">{chunks}</code>;

export default function ApiAccessSection() {
  const t = useTranslations('settings.apiAccess');
  const locale = useLocale();
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const { data: status, errorMessage } = useApiQuery({ key: queryKeys.appToken.status, fn: fetchAppTokenStatus });

  const generate = useApiMutation({
    fn: createAppToken,
    invalidates: [queryKeys.appToken.status],
    onSuccess: ({ key }) => {
      setConfirm(null);
      setNewKey(key);
    },
  });
  const revoke = useApiMutation({
    fn: revokeAppToken,
    success: () => t('revokedToast'),
    invalidates: [queryKeys.appToken.status],
    onSuccess: () => {
      setConfirm(null);
      setNewKey(null);
    },
  });
  const busy = generate.isPending || revoke.isPending;
  const createdLabel = status?.created
    ? new Date(status.created).toLocaleDateString(locale, CREATED_DATE_FORMAT)
    : null;

  const tokenDescription = (): string => {
    if (!status) return t('tokenUnknown');
    return createdLabel ? t('tokenCreated', { date: createdLabel }) : t('tokenMissing');
  };

  const blockedReason = (): string | null => {
    if (busy) return t('blocked.busy');
    if (status) return null;
    return errorMessage ? t('blocked.statusFailed', { error: errorMessage }) : t('blocked.loading');
  };
  const blocked = blockedReason();

  const handleGenerate = () => void generate.run();
  const handleRevoke = () => void revoke.run();

  return (
    <SectionCard>
      <SectionHeading title={t('heading')} subtitle={t('subtitle')} />
      <ul className="flex flex-col divide-y divide-border">
        <SettingsRow
          icon={<KeyRound size={16} strokeWidth={1.8} className="text-muted" />}
          label={t('tokenLabel')}
          description={tokenDescription()}
          action={
            createdLabel ? (
              <div className="flex gap-2">
                <DisabledReason reason={blocked}>
                  <Button
                    variant="outline"
                    size="sm"
                    isDisabled={blocked !== null}
                    onPress={() => setConfirm('regenerate')}
                  >
                    {t('regenerateButton')}
                  </Button>
                </DisabledReason>
                <DisabledReason reason={blocked}>
                  <Button
                    variant="danger-soft"
                    size="sm"
                    isDisabled={blocked !== null}
                    onPress={() => setConfirm('revoke')}
                  >
                    {t('revokeButton')}
                  </Button>
                </DisabledReason>
              </div>
            ) : (
              <DisabledReason reason={blocked}>
                <Button variant="outline" size="sm" isDisabled={blocked !== null} onPress={handleGenerate}>
                  {t('generateButton')}
                </Button>
              </DisabledReason>
            )
          }
        />
        {newKey && <NewTokenRow tokenKey={newKey} />}
        <SettingsRow
          icon={<BookOpen size={16} strokeWidth={1.8} className="text-muted" />}
          label={t('docsLabel')}
          description={t('docsDescription')}
          action={
            <a
              href={`${API_CONFIG.baseUrl}/api/docs/`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t('docsButton')}
              <ExternalLink size={12} strokeWidth={2} />
            </a>
          }
        />
      </ul>

      {confirm && (
        <ConfirmModal
          onClose={() => setConfirm(null)}
          title={t(`${confirm}Confirm.title`)}
          body={t(`${confirm}Confirm.body`)}
          confirmLabel={t(`${confirm}Confirm.action`)}
          confirmVariant={confirm === 'revoke' ? 'danger' : 'primary'}
          busy={busy}
          onConfirm={confirm === 'revoke' ? handleRevoke : handleGenerate}
        />
      )}
    </SectionCard>
  );
}

function NewTokenRow({ tokenKey }: Readonly<{ tokenKey: string }>) {
  const t = useTranslations('settings.apiAccess');
  const common = useTranslations('common');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tokenKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      Toast.toast.danger(t('copyFailed'));
    }
  };

  return (
    <li className="flex flex-col gap-2 py-3">
      <p className="text-meta text-muted">{t('newTokenHint')}</p>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary py-1.5 pr-1.5 pl-3">
        <code className="flex-1 font-mono text-xs break-all text-foreground">{tokenKey}</code>
        <Button variant="ghost" size="sm" onPress={() => void handleCopy()}>
          {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
          {common('copy')}
        </Button>
      </div>
      <p className="text-meta text-muted">{t.rich('usageHint', { code: renderCode })}</p>
    </li>
  );
}
