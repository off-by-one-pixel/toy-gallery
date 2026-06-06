import { getRequestConfig } from 'next-intl/server';

import en from './catalogs/en.json';
import { DEFAULT_LOCALE } from './routing';

export default getRequestConfig(() => ({
  locale: DEFAULT_LOCALE,
  messages: en,
}));
