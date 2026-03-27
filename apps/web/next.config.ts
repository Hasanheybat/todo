import type { NextConfig } from 'next'
// @ts-ignore
import withPWAInit from 'next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // Dev-də Service Worker deaktiv
  register: true,
  skipWaiting: true,
})

const nextConfig: NextConfig = {
  transpilePackages: ['@workflow-pro/shared'],
}

export default withPWA(nextConfig)
