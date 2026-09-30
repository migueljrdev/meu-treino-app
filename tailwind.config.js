/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{html,js}",             /* Arquivos na raiz */
    "./src/**/*.{html,js}"       /* Qualquer arquivo HTML ou JS dentro da pasta src */
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: '#121214',
        darker: '#09090A',
        card: '#202024',
        brand: '#8257E5',
        brandHover: '#996DFF'
      }
    }
  },
  plugins: [],
}