import { describe, expect, it } from 'vitest';

import { APIError } from './types';
import { formatError } from './errors';

const apiError = (status: number, data: unknown, message = 'API request failed') => new APIError(message, status, data);

describe('formatError', () => {
  it('returns a file-hint for SyntaxError', () => {
    expect(formatError(new SyntaxError('Unexpected token'))).toBe('File is not valid JSON');
  });

  it('returns a network message for status-0 APIError', () => {
    expect(formatError(apiError(0, null))).toBe('Network error — please try again');
  });

  it('uses string data verbatim when APIError.data is a string', () => {
    expect(formatError(apiError(500, 'boom'))).toBe('boom');
  });

  it('pulls the `detail` field from APIError.data', () => {
    expect(formatError(apiError(400, { detail: 'Bad input' }))).toBe('Bad input');
  });

  it('pulls the first `non_field_errors` entry', () => {
    expect(formatError(apiError(400, { non_field_errors: ['Missing foo'] }))).toBe('Missing foo');
  });

  it('walks a DRF top-level array', () => {
    expect(formatError(apiError(400, ['Unsupported version']))).toBe('Unsupported version');
  });

  it('walks nested DRF field errors', () => {
    // Shape that a nested ToyShapeSerializer validation produces.
    const body = { shape: { sections: ['At least one section must have a circumference.'] } };
    expect(formatError(apiError(400, body))).toBe('At least one section must have a circumference.');
  });

  it('joins multiple nested messages with newlines, in document order', () => {
    const body = {
      shape: {
        sections: ['Section error'],
        top_section_shape: ['Bad top shape'],
      },
    };
    expect(formatError(apiError(400, body))).toBe('Section error\nBad top shape');
  });

  it('prefers detail/non_field_errors over other fields at each level', () => {
    const body = { email: ['bad email'], non_field_errors: ['Top-level problem'] };
    // non_field_errors should come first.
    expect(formatError(apiError(400, body)).split('\n')[0]).toBe('Top-level problem');
  });

  it('falls back to APIError.message when data has no strings', () => {
    expect(formatError(apiError(500, { something: 42 }, 'Internal error'))).toBe('Internal error');
  });

  it('falls back to generic message when APIError has no useful text', () => {
    expect(formatError(apiError(500, null, ''))).toBe('Something went wrong');
  });

  it('uses err.message for plain Error', () => {
    expect(formatError(new Error('nope'))).toBe('nope');
  });

  it('falls back to generic for unknown thrown values', () => {
    expect(formatError(null)).toBe('Something went wrong');
    expect(formatError(42)).toBe('Something went wrong');
    expect(formatError('oops')).toBe('Something went wrong');
  });

  it('falls back to generic for an Error with empty message', () => {
    expect(formatError(new Error(''))).toBe('Something went wrong');
  });
});
