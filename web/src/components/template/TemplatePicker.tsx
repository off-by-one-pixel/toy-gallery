'use client';

import { TOY_TEMPLATES } from '../../services/toyTemplates';
import BlankCard from './BlankCard';
import TemplateCard from './TemplateCard';

type Props = Readonly<{
  onSelect: (id: string) => void;
  onSkip: () => void;
}>;

export default function TemplatePicker({ onSelect, onSkip }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BlankCard onClick={onSkip} />
        {TOY_TEMPLATES.map((template) => (
          <TemplateCard key={template.id} template={template} onSelect={() => onSelect(template.id)} />
        ))}
      </div>
    </div>
  );
}
