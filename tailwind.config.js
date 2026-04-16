/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: {
          void: "#0A0A0B",
          black: "#0F0F11",
          deep: "#111114",
          surface: "#16161A",
          card: "#1A1A1F",
          border: "#222228",
          muted: "#2C2C35",
          dim: "#4A4A5A",
          mid: "#6B6B7A",
          ash: "#9090A0",
          paper: "#C8C0B5",
          light: "#DDD8D0",
          white: "#E8E0D5",
        },
        crimson: {
          dim: "#5C0E1A",
          mid: "#8B1A28",
          base: "#C41E3A",
          bright: "#E8233F",
          glow: "#FF2D4A",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-in": "slideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        shimmer: "shimmer 2s infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-red": "pulseRed 2s infinite",
        grain: "grain 0.5s steps(1) infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: {
          from: { opacity: 0, transform: "translateX(-16px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseRed: {
          "0%,100%": { opacity: 1 },
          "50%": { opacity: 0.4 },
        },
        grain: {
          "0%,100%": { transform: "translate(0,0)" },
          "10%": { transform: "translate(-2%,-3%)" },
          "20%": { transform: "translate(3%,2%)" },
          "30%": { transform: "translate(-1%,4%)" },
          "40%": { transform: "translate(2%,-1%)" },
          "50%": { transform: "translate(-3%,2%)" },
          "60%": { transform: "translate(1%,-3%)" },
          "70%": { transform: "translate(-2%,1%)" },
          "80%": { transform: "translate(3%,-2%)" },
          "90%": { transform: "translate(-1%,3%)" },
        },
      },
    },
  },
  plugins: [],
};
