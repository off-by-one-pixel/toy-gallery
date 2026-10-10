import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'build',
  transpilePackages: ['toy-editor'],
};

export default withNextIntl(nextConfig);
