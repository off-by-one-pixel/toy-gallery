import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';
import pluginQuery from '@tanstack/eslint-plugin-query';

const config = [
  { ignores: ['src/api/generated/**', 'build/**', 'node_modules/**'] },
  ...coreWebVitals,
  ...typescript,
  ...pluginQuery.configs['flat/recommended'],
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
