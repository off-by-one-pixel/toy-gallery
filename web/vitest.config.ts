import { defineConfig } from 'vitest/config';

export default defineConfig({
  // toy-editor (a `file:../toy-editor` workspace dep) ships its own
  // copy of React in toy-editor/node_modules/react. Without dedup,
  // vitest can resolve React twice — once for the hook under test, once
  // for @testing-library/react — and useRef sees a null dispatcher.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/services/generated/**'],
    },
  },
});
