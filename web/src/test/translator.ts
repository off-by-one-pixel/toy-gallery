import { createTranslator } from 'next-intl';

import en from '@/i18n/catalogs/en.json';

export const enTranslator = createTranslator({ locale: 'en', messages: en });
