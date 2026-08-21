'use client';

import { useState } from 'react';
import { Alert, Button, Modal, useOverlayState } from '@heroui/react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatError } from '@/services/errors';

type Props = Readonly<{
  mode: 'export' | 'import';
  initialText?: string;
  onClose: () => void;
  onImport?: (text: string) => void;
}>;

export default function TemplateJsonDialog({ mode, initialText = '', onClose, onImport }: Props) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const t = useTranslations('template');
  const common = useTranslations('common');

  const overlayState = useOverlayState({
    defaultOpen: true,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });

  const isExport = mode === 'export';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(t('clipboardError'));
    }
  };

  const handleLoad = () => {
    setError(null);
    try {
      onImport?.(text);
      overlayState.close();
    } catch (e) {
      setError(formatError(e));
    }
  };

  return (
    <Modal.Root state={overlayState}>
      <Modal.Backdrop>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog className="flex max-h-[80vh] flex-col overflow-hidden">
            <header className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                {isExport ? t('exportDialogTitle') : t('importDialogTitle')}
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                {isExport ? t('exportDialogDescription') : t('importDialogDescription')}
              </p>
            </header>

            {error && (
              <Alert status="danger" className="rounded-none">
                <Alert.Description>{error}</Alert.Description>
              </Alert>
            )}

            <div className="flex-1 min-h-0 p-4">
              <textarea
                className="h-full w-full resize-none rounded-lg border border-border bg-surface-secondary p-3 font-mono text-xs text-foreground outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/15"
                value={text}
                onChange={(e) => setText(e.target.value)}
                readOnly={isExport}
                placeholder={isExport ? undefined : t('importPlaceholder')}
                spellCheck={false}
              />
            </div>

            <footer className="flex items-center gap-2 border-t border-border px-4 py-3">
              <Button variant="outline" size="sm" onPress={() => overlayState.close()}>
                {isExport ? common('close') : common('cancel')}
              </Button>
              <div className="flex-1" />
              {isExport ? (
                <Button variant="primary" size="sm" onPress={handleCopy}>
                  {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
                  {copied ? t('dialogCopied') : t('dialogCopy')}
                </Button>
              ) : (
                <Button variant="primary" size="sm" isDisabled={!text.trim()} onPress={handleLoad}>
                  {t('dialogLoad')}
                </Button>
              )}
            </footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
