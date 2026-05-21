import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'build',
  transpilePackages: ['toy-editor'],
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
}
 
export default nextConfig