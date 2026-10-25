import { fireEvent } from '@testing-library/react';

export const hoverWithMouse = (element: Element): void => {
  fireEvent.pointerMove(element, { pointerType: 'mouse' });
  fireEvent.pointerEnter(element, { pointerType: 'mouse' });
};
