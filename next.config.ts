// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true, // was experimental.typedRoutes
  // no assetPrefix / basePath
};

export default nextConfig;
