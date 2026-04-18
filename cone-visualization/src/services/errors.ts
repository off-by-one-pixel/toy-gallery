import { APIError } from './api';

const FALLBACK = 'Something went wrong';

// Walk the response body depth-first and collect every string we hit.
// Handles DRF shapes like:
//   { detail: "..." }
//   [ "...", "..." ]
//   { shape: { sections: ["..."] } }          // nested serializer errors
//   { shape: { sections: [{ non_field_errors: ["..."] }] } }
// Preserves document order; preferring `detail` / `non_field_errors` first
// at each level so the most-specific message shows up before field errors.
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

/**
 * Turn anything thrown by the API layer (or a file/JSON handler) into a
 * short, user-facing message. Single source of truth for error copy.
 */
export const formatError = (err: unknown): string => {
  if (err instanceof SyntaxError) return 'File is not valid JSON';
  if (err instanceof APIError) {
    if (err.status === 0) return 'Network error — please try again';
    if (typeof err.data === 'string' && err.data) return err.data;
    const messages = collectMessages(err.data);
    if (messages.length) return messages.join('\n');
    return err.message || FALLBACK;
  }
  if (err instanceof Error && err.message) return err.message;
  return FALLBACK;
};
