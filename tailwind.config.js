/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",  // app router
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}", // si usas pages router
    "./src/styles/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1d4ed8",  // ejemplo color azul
      },
    },
  },
  plugins: [],
};