/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        carbon: {
          // Gray 100 theme backgrounds
          bg:          '#161616',
          'layer-01':  '#262626',
          'layer-02':  '#393939',
          'layer-03':  '#525252',
          // Borders
          'border':    '#525252',
          'border-strong': '#6f6f6f',
          // Text
          'text-primary':   '#f4f4f4',
          'text-secondary': '#c6c6c6',
          'text-placeholder': '#6f6f6f',
          'text-disabled':  '#525252',
          // Interactive — IBM Blue
          'interactive':    '#4589ff',
          'interactive-hover': '#0f62fe',
          'brand':          '#0f62fe',
          'focus':          '#4589ff',
          // Support
          'success':    '#24a148',
          'success-bg': '#071908',
          'warning':    '#f1c21b',
          'warning-bg': '#1c1500',
          'error':      '#da1e28',
          'error-bg':   '#160205',
          'info':       '#4589ff',
          // Accents
          'xp-gold':    '#f1c21b',
          'quest':      '#08bdba',
          'quest-bg':   '#061a1a',
          'drift':      '#ff832b',
          'drift-bg':   '#1f0f00',
          'sabotage':   '#ee5396',
          'sabotage-bg':'#1f0010',
        },
      },
      fontFamily: {
        sans:  ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:  ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'xs':   ['12px', { lineHeight: '16px' }],
        'sm':   ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg':   ['20px', { lineHeight: '28px' }],
        'xl':   ['24px', { lineHeight: '32px' }],
        '2xl':  ['32px', { lineHeight: '40px' }],
        '3xl':  ['42px', { lineHeight: '50px' }],
      },
      spacing: {
        '1':  '4px',
        '2':  '8px',
        '3':  '12px',
        '4':  '16px',
        '6':  '24px',
        '8':  '32px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        'sm':  '4px',
        DEFAULT: '6px',
        'lg':  '8px',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'xp-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':      { transform: 'scale(1.12)' },
        },
        'badge-pop': {
          '0%':   { transform: 'scale(0.7)', opacity: '0' },
          '70%':  { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer:    'shimmer 1.4s linear infinite',
        'xp-pulse': 'xp-pulse 300ms ease-in-out',
        'badge-pop':'badge-pop 350ms ease-out forwards',
        'fade-up':  'fade-up 200ms ease-out',
      },
    },
  },
  plugins: [],
}
