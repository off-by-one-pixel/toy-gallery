import type en from './catalogs/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof en;
  }
}
