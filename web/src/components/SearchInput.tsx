'use client';

import { Search, X } from 'lucide-react';

import TextInput from './TextInput';

type Props = Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}>;

const SearchInput = ({ value, onChange, placeholder = 'Search toys…' }: Props) => (
  <TextInput
    type="search"
    size="sm"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    aria-label="Search toys"
    className="min-w-60"
    leading={<Search size={14} className="text-neutral-400" />}
    trailing={
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        tabIndex={value ? 0 : -1}
        aria-hidden={value ? undefined : true}
        className={`inline-flex h-4 w-4 items-center justify-center rounded text-neutral-400 transition-colors hover:text-neutral-700 ${value ? 'visible' : 'invisible'}`}
      >
        <X size={14} />
      </button>
    }
  />
);

export default SearchInput;
