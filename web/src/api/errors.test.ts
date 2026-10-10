import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { APIError } from '@/api/types';
import { formatError, TranslatableError } from '@/api/errors';
import en from '@/i18n/catalogs/en.json';

const t = createTranslator({ locale: 'en', messages: en, namespace: 'errors' });

const format = (err: unknown) => formatError(err, t);

const apiError = (status: number, data: unknown, message = 'API request failed') => new APIError(message, status, data);

describe('formatError', () => {
  it('returns a file-hint for SyntaxError', () => {
    expect(format(new SyntaxError('Unexpected token'))).toBe(en.errors.invalidJsonFile);
  });

  it('returns a network message for status-0 APIError', () => {
    expect(format(apiError(0, null))).toBe(en.errors.network);
  });

  it('uses string data verbatim when APIError.data is a string', () => {
    expect(format(apiError(500, 'boom'))).toBe('boom');
  });

  it('pulls the `detail` field from APIError.data', () => {
    expect(format(apiError(400, { detail: 'Bad input' }))).toBe('Bad input');
  });

  it('pulls the first `non_field_errors` entry', () => {
    expect(format(apiError(400, { non_field_errors: ['Missing foo'] }))).toBe('Missing foo');
  });

  it('walks a DRF top-level array', () => {
    expect(format(apiError(400, ['Unsupported version']))).toBe('Unsupported version');
  });

  it('walks nested DRF field errors', () => {
    const body = { shape: { sections: ['At least one section must have a circumference.'] } };
    expect(format(apiError(400, body))).toBe('At least one section must have a circumference.');
  });

  it('joins multiple nested messages with newlines, in document order', () => {
    const body = {
      shape: {
        sections: ['Section error'],
        top_section_shape: ['Bad top shape'],
      },
    };
    expect(format(apiError(400, body))).toBe('Section error\nBad top shape');
  });

  it('prefers detail/non_field_errors over other fields at each level', () => {
    const body = { email: ['bad email'], non_field_errors: ['Top-level problem'] };
    expect(format(apiError(400, body)).split('\n')[0]).toBe('Top-level problem');
  });

  it.each([{ something: 42 }, null])('names the status when the response carries no message (%j)', (data) => {
    expect(format(apiError(500, data, 'Internal error'))).toBe('Server error (500)');
  });

  it('translates a TranslatableError with its values', () => {
    expect(format(new TranslatableError('templateJson.notJson', { detail: 'Unexpected token' }))).toBe(
      'Not valid JSON: Unexpected token',
    );
    expect(format(new TranslatableError('templateJson.noSections'))).toBe(en.errors.templateJson.noSections);
  });

  it.each([new Error('nope'), new Error(''), null, 42, 'oops'])(
    'falls back to the generic message for anything else (%s)',
    (err) => {
      expect(format(err)).toBe(en.errors.fallback);
    },
  );
});
