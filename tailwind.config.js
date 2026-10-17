/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FAF7F2',
          100: '#F6F0E8',
          200: '#EFE5DA',
        },
        blush: {
          50: '#FBF4F2',
          100: '#F7EAE7',
          DEFAULT: '#F3E3E0',
          300: '#E8C9C4',
          500: '#D9A6A0',
        },
        burgundy: {
          50: '#F7EDEF',
          300: '#B76A7D',
          400: '#A0566A',
          DEFAULT: '#6E2638',
          600: '#5F1F30',
          700: '#561C2B',
          800: '#43141F',
          900: '#2E0D15',
        },
        gold: {
          200: '#E8DCC6',
          300: '#D9C29A',
          DEFAULT: '#B8945B',
          600: '#A07D46',
          700: '#8A6A3A',
        },
        ink: {
          DEFAULT: '#2B1E22',
          soft: '#5A4A4E',
          mute: '#8A787C',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['Montserrat', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(110, 38, 56, 0.18)',
        lift: '0 20px 45px -16px rgba(110, 38, 56, 0.38)',
        card: '0 1px 2px rgba(43, 30, 34, 0.04), 0 12px 32px -18px rgba(110, 38, 56, 0.22)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slow-zoom': {
          '0%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 1s cubic-bezier(.2,.65,.3,1) both',
        'slow-zoom': 'slow-zoom 2.4s cubic-bezier(.2,.65,.3,1) both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
