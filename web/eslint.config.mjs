import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';
import pluginQuery from '@tanstack/eslint-plugin-query';

const config = [
  { ignores: ['src/api/generated/**', 'build/**', 'node_modules/**'] },
  ...coreWebVitals,
  ...typescript,
  ...pluginQuery.configs['flat/recommended'],
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx'],
    rules: {
      'react/jsx-no-literals': ['error', { allowedStrings: ['·', '×', '—', '+', '*'] }],
    },
  },
  {
    files: ['src/api/*.ts'],
    ignores: ['src/api/*.test.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/api/generated', '@/api/generated/*'],
              message: 'Use the domain API in @/api, not the generated SDK.',
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default config;
