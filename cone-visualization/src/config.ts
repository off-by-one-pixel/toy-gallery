// `NEXT_PUBLIC_API_URL` resolution at runtime:
//   - unset / undefined → `http://localhost:8000` (default for `make fe` against `make be`)
//   - explicit URL      → that URL
//   - empty string ("") → same origin as the page, used by the all-in-one
//                         Docker image where Django serves both the API and
//                         this static export from one host
//
// Wrapped in a getter so `process.env.*` static-replacement at build time
// composes correctly with the runtime `window.location.origin` lookup.
function resolveBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl === '') {
    return globalThis.window !== undefined ? globalThis.window.location.origin : '';
  }
  return envUrl || 'http://localhost:8000';
}

export const API_CONFIG = {
  get baseUrl(): string {
    return resolveBaseUrl();
  },
};

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
export const APP_COMMIT_SHA = (process.env.NEXT_PUBLIC_APP_COMMIT_SHA ?? '').slice(0, 7);
