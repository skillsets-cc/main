/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: {
          paper: '#FAFAFA', // Academic paper off-white
          main: '#FFFFFF',
        },
        text: {
          ink: '#1A1A1A', // Stark black
          secondary: '#555555',
          tertiary: '#777777',
        },
        accent: {
          primary: '#F97316', // Orange-500, single accent color
          highlight: '#FFF3C4', // Highlighter yellow, subtle
        },
        border: {
          ink: '#E5E7EB', // Structural gray
          strong: '#1A1A1A', // Strong border
        },
        status: {
          success: '#2e7d32',
          error: '#d32f2f',
          warning: '#ed6c02',
        },
      },
      fontFamily: {
        serif: ['"Crimson Pro"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
    },
  },
  plugins: [],
}

