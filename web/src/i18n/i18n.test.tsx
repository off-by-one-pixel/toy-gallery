// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { describe, expect, it } from 'vitest';

import en from '@/i18n/catalogs/en.json';

function Sample() {
  const t = useTranslations('attributes');
  return <h2>{t('heading')}</h2>;
}

function Plural() {
  const t = useTranslations('toy');
  return (
    <ul>
      <li>{t('items', { count: 1 })}</li>
      <li>{t('items', { count: 5 })}</li>
    </ul>
  );
}

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={en}>
    {ui}
  </NextIntlClientProvider>
);

describe('next-intl wiring', () => {
  it('resolves a translation through useTranslations', () => {
    render(wrap(<Sample />));
    expect(screen.getByText('Attributes')).toBeTruthy();
  });

  it('formats ICU plural messages', () => {
    render(wrap(<Plural />));
    expect(screen.getByText('1 item')).toBeTruthy();
    expect(screen.getByText('5 items')).toBeTruthy();
  });
});
