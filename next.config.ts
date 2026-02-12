import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true, // Útil para deploys iniciais com versões experimentais
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
