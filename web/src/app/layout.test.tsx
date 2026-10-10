import { createTranslator } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import en from '@/i18n/catalogs/en.json';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => createTranslator({ locale: 'en', messages: en }),
}));

import { generateMetadata } from '@/app/layout';

describe('root layout metadata', () => {
  it('takes the app title and description from the catalog', async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe(en.collection.appTitle);
    expect(metadata.description).toBe(en.login.tagline);
    expect(metadata.appleWebApp).toMatchObject({ title: en.collection.appTitle });
  });
});
