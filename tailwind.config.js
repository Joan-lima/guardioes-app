/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        gold:      "#DBC083",
        "gold-dark": "#C9A84C",
        dark:      "#0A0B10",
        "dark-card": "#1E202E",
        "dark-border": "#ffffff0d",
      },
      fontFamily: {
        title: ["Cinzel_700Bold"],
        body:  ["Raleway_400Regular"],
        "body-bold": ["Raleway_700Bold"],
      },
    },
  },
  plugins: [],
};
