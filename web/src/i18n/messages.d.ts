import type en from '@/i18n/catalogs/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof en;
  }
}
