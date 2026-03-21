/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        text: {
          ink: '#EDEDED', // Off-white for max readability
          secondary: '#A0A0A0', // Muted text
          tertiary: '#737373', // Subtle text
        },
        accent: {
          DEFAULT: '#f97316', // Orange 500
          light: '#fb923c',   // Orange 400
          highlight: '#ea580c', // Orange 600
        },
        border: {
          ink: '#222222', // Subtle borders
          strong: '#333333', // Strong border
        },
        status: {
          success: '#22c55e',
          error: '#ef4444',
          warning: '#f59e0b',
        },
      },
      fontFamily: {
        serif: ['"Outfit"', 'sans-serif'],
        sans: ['"Outfit"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        md: '4px',
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#A0A0A0',
            '--tw-prose-headings': '#EDEDED',
            '--tw-prose-links': '#f97316',
            '--tw-prose-code': '#EDEDED',
            '--tw-prose-pre-bg': 'rgba(0, 0, 0, 0.8)',
            '--tw-prose-pre-code': '#EDEDED',
            '--tw-prose-bullets': '#737373',
            '--tw-prose-counters': '#737373',
            'color': '#A0A0A0',
            'fontSize': '1.125rem',
            'fontFamily': '"Outfit", sans-serif',
            'code': {
              backgroundColor: '#000',
              border: '1px solid rgba(249, 115, 22, 0.2)',
              padding: '0.125rem 0.5rem',
              borderRadius: '2px',
              fontWeight: '400',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.875em',
              color: '#EDEDED',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            'pre': {
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(249, 115, 22, 0.2)',
              color: '#EDEDED',
              padding: '1rem',
              borderRadius: '2px',
              boxShadow: '8px 0 32px rgba(0,0,0,0.9), 2px 0 15px rgba(249,115,22,0.05)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.875rem',
            },
            'pre code': {
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0',
              color: 'inherit',
              fontSize: 'inherit',
            },
            'a': {
              color: '#f97316',
              textDecoration: 'underline',
              '&:hover': {
                color: '#fb923c',
              },
            },
            'h1, h2, h3, h4': {
              fontFamily: '"Outfit", sans-serif',
              fontWeight: '600',
            },
            'p': {
              color: '#A0A0A0',
            },
            'li': {
              color: '#A0A0A0',
            },
            'strong': {
              color: '#EDEDED',
              fontWeight: '600',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

