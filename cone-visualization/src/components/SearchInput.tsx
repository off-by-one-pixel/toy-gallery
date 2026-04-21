'use client';

import { Search, X } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const SearchInput = ({ value, onChange, placeholder = 'Search toys…' }: Props) => (
  <label
    className="inline-flex min-w-60 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-neutral-400 transition-[border-color,box-shadow] duration-150 focus-within:border-blue-600 focus-within:ring-[3px] focus-within:ring-blue-600/15"
  >
    <Search size={14} />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full flex-1 border-0 bg-transparent text-neutral-900 outline-none placeholder:text-neutral-400 [&::-webkit-search-cancel-button]:appearance-none"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="inline-flex h-4 w-4 items-center justify-center rounded text-neutral-400 transition-colors hover:text-neutral-700"
      >
        <X size={14} />
      </button>
    )}
  </label>
);

export default SearchInput;
