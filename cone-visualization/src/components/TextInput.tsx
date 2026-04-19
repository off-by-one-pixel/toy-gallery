'use client';

import { forwardRef } from 'react';

type Size = 'sm' | 'md';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> & {
  value: string;
  onChange: (value: string) => void;
  size?: Size;
};

const baseClass =
  'w-full appearance-none rounded-xl border border-neutral-200 bg-white text-neutral-900 ' +
  'placeholder:text-neutral-400 transition-[border-color,box-shadow] duration-150 ' +
  'focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 ' +
  'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500';

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-3.5 py-3 text-[15px]',
};

const TextInput = forwardRef<HTMLInputElement, Props>(function TextInput(
  { value, onChange, className, type = 'text', size = 'md', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[baseClass, sizeClass[size], className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
});

export default TextInput;
