import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';
import pluginQuery from '@tanstack/eslint-plugin-query';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const topLevelRouteSegments = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => (/^\(.+\)$/.test(entry.name) ? topLevelRouteSegments(join(dir, entry.name)) : [entry.name]))
    .filter((name) => /^[a-z0-9][\w-]*$/i.test(name));

const appRouteSegments = [...new Set(topLevelRouteSegments(join(import.meta.dirname, 'web/src/app')))];
const appRoutePath = String.raw`^\x2F(${appRouteSegments.join('|')})(?:[\x2F?#]|$)`;
const appRoutePathMessage = 'Build app paths with `routes` from @/routes instead of a path literal.';

const config = [
  { ignores: ['**/build/**', '**/dist/**', '**/node_modules/**', '**/coverage/**', 'web/src/api/generated/**'] },
  ...coreWebVitals,
  ...typescript,
  ...pluginQuery.configs['flat/recommended'],
  {
    settings: { next: { rootDir: 'web/' } },
  },
  {
    files: ['web/src/**/*.tsx'],
    ignores: ['web/src/**/*.test.tsx'],
    rules: {
      'react/jsx-no-literals': ['error', { allowedStrings: ['·', '×', '—', '+', '*'] }],
    },
  },
  {
    files: ['web/src/api/*.ts'],
    ignores: ['web/src/api/*.test.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
  {
    files: ['web/src/**/*.{ts,tsx}'],
    ignores: ['web/src/api/**'],
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
    files: ['web/src/**/*.{ts,tsx}'],
    ignores: ['web/src/routes.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=/${appRoutePath}/]`, message: appRoutePathMessage },
        { selector: `TemplateElement[value.raw=/${appRoutePath}/]`, message: appRoutePathMessage },
      ],
    },
  },
  {
    rules: {
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
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
