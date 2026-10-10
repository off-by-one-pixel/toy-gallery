import type { MessageKeys, NamespaceKeys, NestedKeyOf, NestedValueOf, useTranslations } from 'next-intl';

import type en from '@/i18n/catalogs/en.json';

type Messages = typeof en;

type Namespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;

export type Translator<N extends Namespace = never> = ReturnType<typeof useTranslations<N>>;

export type MessageKey<N extends Namespace> = MessageKeys<
  NestedValueOf<Messages, N>,
  NestedKeyOf<NestedValueOf<Messages, N>>
>;
