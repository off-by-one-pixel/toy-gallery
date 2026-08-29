import { waitFor } from '@testing-library/react';

export const settle = <T>(assertion: () => T): Promise<T> => waitFor(assertion, { interval: 10 });
