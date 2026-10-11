import type { KeyboardEvent } from 'react';

export const pressable = (onPress: () => void) => ({
  role: 'button',
  tabIndex: 0,
  onClick: onPress,
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    onPress();
  },
});
