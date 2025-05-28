module.exports = {
  content: ["./src/**/*.{html,ts}", "./node_modules/primeng/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: {
          600: "#2563EB",
          500: "#3B82F6",
          400: "#60A5FA",
        },
        secondary: "#64748B",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
      },
    },
  },
  plugins: [],
};
