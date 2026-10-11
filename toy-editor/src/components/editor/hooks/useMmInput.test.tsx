import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TEST_LABELS } from '../../../../test/labels';
import { EditorConfigContext } from '../../editorConfig';
import { useMmInput } from './useMmInput';

const CM = { id: 'cm', factor: 10, decimals: 1 };

const wrapper = ({ children }: { children: ReactNode }) => (
  <EditorConfigContext.Provider value={{ unit: CM, labels: TEST_LABELS, palette: [] }}>
    {children}
  </EditorConfigContext.Provider>
);

const typed = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;

const renderInput = (mm: number | null) => {
  const onChange = vi.fn();
  const hook = renderHook(({ value }) => useMmInput(value, onChange), { wrapper, initialProps: { value: mm } });
  return { hook, onChange, type: (text: string) => act(() => hook.result.current.onChange(typed(text))) };
};

describe('useMmInput', () => {
  it('shows the value in the editor unit, or nothing when there is none', () => {
    expect(renderInput(125).hook.result.current.value).toBe('12.5');
    expect(renderInput(null).hook.result.current.value).toBe('');
  });

  it('reports typed values in mm while keeping the text as typed', () => {
    const { hook, onChange, type } = renderInput(125);
    type('3.');
    expect(onChange).toHaveBeenLastCalledWith(30);
    expect(hook.result.current.value).toBe('3.');
  });

  it('ignores text that is not a number', () => {
    const { hook, onChange, type } = renderInput(125);
    type('abc');
    expect(onChange).not.toHaveBeenCalled();
    expect(hook.result.current.value).toBe('abc');
  });

  it('reports null when the field is cleared', () => {
    const { onChange, type } = renderInput(125);
    type('');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('shows the formatted value again on blur', () => {
    const { hook, type } = renderInput(125);
    type('3.');
    hook.rerender({ value: 30 });
    act(() => hook.result.current.onBlur());
    expect(hook.result.current.value).toBe('3.0');
  });
});
