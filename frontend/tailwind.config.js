/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base canvas — soft blue-white, never pure flat white
        void: "#F5F7FF",
        surface: {
          DEFAULT: "rgba(255,255,255,0.72)", // glass card
          solid: "#FFFFFF",
          2: "#F8F9FF",
          3: "#F0F2FC",
        },
        stroke: {
          DEFAULT: "rgba(99,102,241,0.12)",
          soft: "rgba(99,102,241,0.08)",
          strong: "rgba(99,102,241,0.22)",
        },
        ink: {
          DEFAULT: "#1B1E31",
          muted: "#5B6180",
          faint: "#9096B4",
        },
        // Primary brand ramp: blue -> indigo -> violet
        accent: {
          50: "#EEF1FF",
          100: "#E0E4FF",
          200: "#C3C9FF",
          300: "#9CA4FF",
          400: "#7C7FF5",
          500: "#6D5EF0",
          600: "#5B45E0",
          700: "#4934BE",
          800: "#3A2A97",
          900: "#2C2073",
        },
        brand: {
          50: "#EEF1FF",
          100: "#E0E4FF",
          200: "#C3C9FF",
          300: "#9CA4FF",
          400: "#7C7FF5",
          500: "#6D5EF0",
          600: "#5B45E0",
          700: "#4934BE",
          800: "#3A2A97",
          900: "#2C2073",
        },
        sky: {
          400: "#38BDF8",
          500: "#0EA5E9",
        },
        growth: {
          DEFAULT: "#12B76A",
          soft: "#E7F8EF",
        },
        warn: "#F59E0B",
        "warn-soft": "#FEF3E2",
        danger: "#F04438",
        "danger-soft": "#FDECEC",
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "ui-sans-serif", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["\"JetBrains Mono\"", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.6) inset, 0 12px 32px -14px rgba(76,66,196,0.18), 0 2px 8px -2px rgba(30,32,60,0.06)",
        "card-hover": "0 1px 0 0 rgba(255,255,255,0.7) inset, 0 20px 44px -16px rgba(76,66,196,0.26), 0 4px 12px -2px rgba(30,32,60,0.08)",
        glow: "0 0 0 1px rgba(109,94,240,0.45), 0 8px 24px -6px rgba(109,94,240,0.45)",
        "glow-sky": "0 0 0 1px rgba(14,165,233,0.35), 0 8px 24px -8px rgba(14,165,233,0.4)",
        soft: "0 2px 10px -4px rgba(30,32,60,0.08)",
        nav: "0 1px 0 0 rgba(255,255,255,0.7) inset, 4px 0 24px -12px rgba(76,66,196,0.15)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(60% 45% at 15% 0%, rgba(109,94,240,0.14) 0%, rgba(245,247,255,0) 60%), radial-gradient(50% 40% at 100% 0%, rgba(56,189,248,0.12) 0%, rgba(245,247,255,0) 60%)",
        "brand-gradient": "linear-gradient(135deg, #4F7CFF 0%, #6D5EF0 55%, #9B5CF6 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, #EEF1FF 0%, #F1EEFE 100%)",
        "glass-sheen": "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 100%)",
      },
      keyframes: {
        "ascent-draw": {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "ascent-draw": "ascent-draw 2.2s ease-out forwards",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 5s ease-in-out infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
