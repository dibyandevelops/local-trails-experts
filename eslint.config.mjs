import { createRequire } from 'node:module';

// Next.js v16 ships its ESLint config as a flat-config array.
// We consume it directly so we don't hit eslintrc/compat edge-cases.
const require = createRequire(import.meta.url);

const nextConfig = require('eslint-config-next/core-web-vitals');

export default [
  ...nextConfig,
  {
    // Next 16's config enables some newer rules that are noisy for our current codebase.
    // We can revisit and tighten these once we've refactored the relevant effects.
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
    },
  },
];
