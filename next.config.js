/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [60, 75, 90],
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: 'locoxperts',
  project: 'typescript-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // automaticVercelMonitors: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
