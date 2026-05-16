'use client';

import { useState } from 'react';
import { Alert, Button, Modal, useOverlayState } from '@heroui/react';
import { Check, Copy } from 'lucide-react';

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
      setError('Could not access clipboard — select the text and copy manually.');
    }
  };

  const handleLoad = () => {
    setError(null);
    try {
      onImport?.(text);
      overlayState.close();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Modal.Root state={overlayState}>
      <Modal.Backdrop>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog className="flex max-h-[80vh] flex-col overflow-hidden">
            <header className="border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-900">
                {isExport ? 'Export toy as template JSON' : 'Import template JSON'}
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                {isExport
                  ? 'Copy this JSON into src/data/toyTemplates.json. Fill in id, name, and description before committing.'
                  : 'Paste a ToyTemplate entry and load it into the editor. The current toy is replaced.'}
              </p>
            </header>

            {error && (
              <Alert status="danger" className="rounded-none">
                <Alert.Description>{error}</Alert.Description>
              </Alert>
            )}

            <div className="flex-1 min-h-0 p-4">
              <textarea
                className="h-full w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs text-neutral-900 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15"
                value={text}
                onChange={(e) => setText(e.target.value)}
                readOnly={isExport}
                placeholder={isExport ? undefined : '{ "id": "...", "shape": { ... } }'}
                spellCheck={false}
              />
            </div>

            <footer className="flex items-center gap-2 border-t border-neutral-200 px-4 py-3">
              <Button variant="outline" size="sm" onPress={() => overlayState.close()}>
                {isExport ? 'Close' : 'Cancel'}
              </Button>
              <div className="flex-1" />
              {isExport ? (
                <Button variant="primary" size="sm" onPress={handleCopy}>
                  {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              ) : (
                <Button variant="primary" size="sm" isDisabled={!text.trim()} onPress={handleLoad}>
                  Load
                </Button>
              )}
            </footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
