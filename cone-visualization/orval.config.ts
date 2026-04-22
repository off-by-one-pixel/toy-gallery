import { defineConfig } from 'orval';

export default defineConfig({
  toys: {
    input: '../toy_gallery_be/schema.yml',
    output: {
      target: 'src/services/generated/sdk.ts',
      schemas: 'src/services/generated/schemas',
      client: 'fetch',
      mode: 'split',
      override: {
        mutator: { path: 'src/services/http.ts', name: 'customFetch' },
      },
      clean: true,
    },
  },
});
