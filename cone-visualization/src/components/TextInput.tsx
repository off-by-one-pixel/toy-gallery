'use client';

import { forwardRef, type ReactNode } from 'react';

type Size = 'sm' | 'md';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> & {
  value: string;
  onChange: (value: string) => void;
  size?: Size;
  /** Rendered inside the bordered container, before the input. */
  leading?: ReactNode;
  /** Rendered inside the bordered container, after the input. */
  trailing?: ReactNode;
};

const wrapperBase =
  'flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white text-neutral-900 ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'focus-within:border-blue-600 focus-within:ring-[3px] focus-within:ring-blue-600/15 ' +
  'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-neutral-50 has-[input:disabled]:text-neutral-500';

const wrapperSize: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-3.5 py-3 text-[15px]',
};

const inputBase =
  'min-w-0 flex-1 appearance-none border-0 bg-transparent text-inherit outline-none ' +
  'placeholder:text-neutral-400 disabled:cursor-not-allowed ' +
  '[&::-webkit-search-cancel-button]:appearance-none';

const TextInput = forwardRef<HTMLInputElement, Props>(function TextInput(
  { value, onChange, className, type = 'text', size = 'md', leading, trailing, ...rest },
  ref,
) {
  return (
    <div className={[wrapperBase, wrapperSize[size], className].filter(Boolean).join(' ')}>
      {leading}
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputBase}
        {...rest}
      />
      {trailing}
    </div>
  );
});

export default TextInput;
