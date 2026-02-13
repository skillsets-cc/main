/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        surface: {
          paper: '#FAFAFA', // Academic paper off-white
          white: '#FFFFFF',
        },
        text: {
          ink: '#1A1A1A', // Stark black
          secondary: '#555555',
          tertiary: '#777777',
        },
        accent: {
          DEFAULT: '#F97316', // Single accent color (orange-500)
          light: '#FDBA74',   // Lighter accent (orange-300)
          highlight: '#FFF3C4', // Highlighter yellow for selection
        },
        border: {
          ink: '#E5E7EB', // Structural gray
          strong: '#1A1A1A', // Strong border
        },
        status: {
          success: '#22c55e', // green-500
          error: '#ef4444',   // red-500
          warning: '#f59e0b', // amber-500
        },
      },
      fontFamily: {
        serif: ['"Crimson Pro"', 'serif'],
        sans: ['"Crimson Pro"', 'serif'],
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
        sm: '2px', // Minimal radius
        md: '4px',
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#555555',
            '--tw-prose-headings': '#1A1A1A',
            '--tw-prose-links': '#F97316',
            '--tw-prose-code': '#1A1A1A',
            '--tw-prose-pre-bg': '#FAFAFA',
            '--tw-prose-pre-code': '#1A1A1A',
            '--tw-prose-bullets': '#777777',
            '--tw-prose-counters': '#777777',
            'color': '#555555',
            'fontSize': '1.125rem',
            'fontFamily': '"Crimson Pro", serif',
            'code': {
              backgroundColor: '#FAFAFA',
              border: '1px solid #E5E7EB',
              padding: '0.125rem 0.5rem',
              borderRadius: '0',
              fontWeight: '400',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.875em',
              color: '#1A1A1A',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            'pre': {
              backgroundColor: '#FAFAFA',
              border: '1px solid #E5E7EB',
              color: '#1A1A1A',
              padding: '1rem',
              borderRadius: '0',
              overflow: 'auto',
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
              color: '#F97316',
              textDecoration: 'underline',
              '&:hover': {
                color: '#EA580C',
              },
            },
            'h1, h2, h3, h4': {
              fontFamily: '"Crimson Pro", serif',
              fontWeight: '600',
            },
            'p': {
              color: '#555555',
            },
            'li': {
              color: '#555555',
            },
            'strong': {
              color: '#1A1A1A',
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

