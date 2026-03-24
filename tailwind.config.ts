import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--color-bg) / <alpha-value>)',
        foreground: 'hsl(var(--color-fg) / <alpha-value>)',
        surface: 'hsl(var(--color-surface) / <alpha-value>)',
        'surface-2': 'hsl(var(--color-surface-2) / <alpha-value>)',
        muted: 'hsl(var(--color-muted) / <alpha-value>)',
        border: 'hsl(var(--color-border) / <alpha-value>)',
        ring: 'hsl(var(--color-ring) / <alpha-value>)',
        brand: 'hsl(var(--color-brand) / <alpha-value>)',
        'brand-contrast': 'hsl(var(--color-brand-contrast) / <alpha-value>)',
        success: 'hsl(var(--color-success) / <alpha-value>)',
        warning: 'hsl(var(--color-warning) / <alpha-value>)',
        danger: 'hsl(var(--color-danger) / <alpha-value>)',
      },
      borderRadius: {
        app: 'var(--radius-app)',
        'app-lg': 'var(--radius-app-lg)',
      },
      boxShadow: {
        'app-1': 'var(--shadow-1)',
        'app-2': 'var(--shadow-2)',
      },
    },
  },
  plugins: [],
}
export default config
