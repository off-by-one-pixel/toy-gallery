'use client';

import type { WizardDialog } from '@/features/toys/editor/useToyEditorWizardNav';
import TemplateJsonDialog from '@/features/toys/template/TemplateJsonDialog';

type Props = Readonly<{
  dialog: WizardDialog | null;
  exportText: string;
  onClose: () => void;
  onImport: (text: string) => void;
}>;

/** Routes the URL `?dialog=` value to the right TemplateJsonDialog
 *  variant. Render nothing when no dialog is open. */
export default function JsonDialogs({ dialog, exportText, onClose, onImport }: Props) {
  if (dialog === 'export') {
    return <TemplateJsonDialog mode="export" initialText={exportText} onClose={onClose} />;
  }
  if (dialog === 'import') {
    return <TemplateJsonDialog mode="import" onClose={onClose} onImport={onImport} />;
  }
  return null;
}
