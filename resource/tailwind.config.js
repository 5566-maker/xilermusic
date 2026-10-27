/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Geist Sans"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Noto Sans CJK SC"',
          '"Noto Sans SC"',
          '"Microsoft YaHei"',
          'sans-serif'
        ],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.32, 0.72, 0.24, 1)'
      },
      colors: {
        primary: {
          DEFAULT: '#fa243c',
          light: '#fc3c44',
          dark: '#d70015'
        },
        secondary: {
          DEFAULT: '#6c757d',
          light: '#8c959e',
          dark: '#495057'
        },
        dark: {
          DEFAULT: '#000',
          100: '#181818',
          200: '#1f1f1f',
          300: '#272727',
          400: '#313131'
        },
        light: {
          DEFAULT: '#fff',
          100: '#f5f5f5',
          200: '#ebebeb',
          300: '#e0e0e0'
        }
      }
    }
  },
  plugins: []
};
