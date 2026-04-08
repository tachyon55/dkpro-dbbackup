import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint runs in CI separately; skip during build to avoid plugin resolution issues
    ignoreDuringBuilds: true,
  },
  // output: 'export' 를 사용하지 않는다 — API Routes와 서버 컴포넌트가 비활성화되기 때문.
  // Vercel은 Next.js를 네이티브로 지원하므로 별도 플러그인 없이 표준 빌드를 처리한다.
};

export default nextConfig;
