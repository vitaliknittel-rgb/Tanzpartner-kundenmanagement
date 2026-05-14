/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:         '#0d1117',
        'navy-light': '#161b22',
        border:       'rgba(255,255,255,0.1)',
      },
    },
  },
  plugins: [],
}
