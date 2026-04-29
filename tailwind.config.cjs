/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './app.js'
  ],
  theme: {
    extend: {
      colors: {
        terminal: '#4ade80',
        terminalDim: '#166534',
        panel: '#071106',
        panel2: '#0c160a'
      },
      fontFamily: {
        code: ['Space Grotesk', 'sans-serif']
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ]
};
