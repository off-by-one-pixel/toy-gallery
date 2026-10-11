import { defineConfig } from 'orval';

export default defineConfig({
  toys: {
    input: '../api/schema.yml',
    output: {
      target: 'src/api/generated/sdk.ts',
      schemas: 'src/api/generated/schemas',
      client: 'fetch',
      mode: 'split',
      override: {
        mutator: { path: 'src/api/http.ts', name: 'customFetch' },
        fetch: { includeHttpResponseReturnType: false },
      },
      clean: true,
    },
  },
});
