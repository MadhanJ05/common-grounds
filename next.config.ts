import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen depends on who's signed in, so pages render per request (no Cache Components).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
