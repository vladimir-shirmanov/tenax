module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surf: "#f4f4ef",
        ink: "#1d1f1a",
        ember: "#c2481a",
        pine: "#2d5a45"
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Manrope", "sans-serif"]
      }
    }
  },
  plugins: []
};
