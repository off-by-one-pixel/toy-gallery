import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'build',
  transpilePackages: ['cone-editor'],
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
}
 
export default nextConfig