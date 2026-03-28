import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint runs in CI separately; skip during build to avoid plugin resolution issues
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
