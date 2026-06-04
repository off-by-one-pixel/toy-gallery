'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import TextInput from './TextInput';

type Props = Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}>;

const SearchInput = ({ value, onChange, placeholder }: Props) => {
  const t = useTranslations('search');
  return (
    <TextInput
      type="search"
      size="sm"
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? t('placeholder')}
      aria-label={t('ariaLabel')}
      className="min-w-60"
      leading={<Search size={14} className="text-neutral-400" />}
      trailing={
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('clear')}
          tabIndex={value ? 0 : -1}
          aria-hidden={value ? undefined : true}
          className={`inline-flex h-4 w-4 items-center justify-center rounded text-neutral-400 transition-colors hover:text-neutral-700 ${value ? 'visible' : 'invisible'}`}
        >
          <X size={14} />
        </button>
      }
    />
  );
};

export default SearchInput;
