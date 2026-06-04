/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#06141f",
          900: "#0a1f30",
          800: "#0e2a40",
          700: "#163a5a",
          600: "#1f4d75",
        },
        gold: {
          100: "#FDF3DC",
          300: "#F5C05A",
          400: "#EFB13F",
          DEFAULT: "#E8A020",
          600: "#C8861A",
        },
        cream: "#F6F3EC",
        parchment: "#FBFAF5",
        mint: "#15803D",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Hanken Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,31,48,0.04), 0 12px 40px -12px rgba(10,31,48,0.18)",
        glow: "0 0 0 1px rgba(232,160,32,0.4), 0 8px 30px -8px rgba(232,160,32,0.45)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-22px) scale(1.04)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "70%, 100%": { transform: "scale(1.6)", opacity: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(220%)" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.8s ease both",
        float: "float 9s ease-in-out infinite",
        "float-slow": "float 13s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        spin: "spin 0.6s linear infinite",
      },
    },
  },
  plugins: [],
};
