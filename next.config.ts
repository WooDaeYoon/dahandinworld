import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://api.dahandin.com/openapi/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
