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
