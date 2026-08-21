import { getRequestConfig } from 'next-intl/server';

import en from '@/i18n/catalogs/en.json';
import { DEFAULT_LOCALE } from '@/i18n/routing';

export default getRequestConfig(() => ({
  locale: DEFAULT_LOCALE,
  messages: en,
}));
