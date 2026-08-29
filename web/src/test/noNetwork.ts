const blockedFetch: typeof fetch = (input) =>
  Promise.reject(new Error(`Unmocked network request in test: ${String(input)}`));

globalThis.fetch = blockedFetch;

export {};
