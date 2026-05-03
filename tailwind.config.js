/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#EAB308",   // yellow-500
        primaryDark: "#CA8A04",
        textMain: "#111827",
        textSub: "#6B7280",
        borderLight: "#E5E7EB",
        bgLight: "#F9FAFB",
      },
      borderRadius: {
        xl2: "14px",
      },
    },
  },
  plugins: [],
};
