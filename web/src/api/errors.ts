import type { MessageKeys, NestedKeyOf, useTranslations } from 'next-intl';

import { APIError } from '@/api/types';
import type en from '@/i18n/catalogs/en.json';

type ErrorMessages = (typeof en)['errors'];

export type ErrorKey = MessageKeys<ErrorMessages, NestedKeyOf<ErrorMessages>>;

export type ErrorTranslator = ReturnType<typeof useTranslations<'errors'>>;

export class TranslatableError extends Error {
  constructor(
    readonly key: ErrorKey,
    readonly values?: Record<string, string>,
  ) {
    super(key);
  }
}

const collectMessages = (data: unknown, into: string[] = []): string[] => {
  if (typeof data === 'string') {
    if (data) into.push(data);
    return into;
  }
  if (!data || typeof data !== 'object') return into;

  if (Array.isArray(data)) {
    for (const value of data) collectMessages(value, into);
    return into;
  }

  const record = data as Record<string, unknown>;
  if (typeof record.detail === 'string' && record.detail) into.push(record.detail);
  if (record.non_field_errors !== undefined) collectMessages(record.non_field_errors, into);
  for (const [key, value] of Object.entries(record)) {
    if (key === 'detail' || key === 'non_field_errors') continue;
    collectMessages(value, into);
  }
  return into;
};

export const formatError = (err: unknown, t: ErrorTranslator): string => {
  if (err instanceof TranslatableError) return t(err.key, err.values);
  if (err instanceof SyntaxError) return t('invalidJsonFile');
  if (err instanceof APIError) {
    if (err.status === 0) return t('network');
    if (typeof err.data === 'string' && err.data) return err.data;
    const messages = collectMessages(err.data);
    if (messages.length) return messages.join('\n');
    return t('server', { status: err.status });
  }
  return t('fallback');
};
