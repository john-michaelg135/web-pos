import type { NextConfig } from "next";

// Where /api-pos/* proxies to. Local dev defaults to the docker-mapped port;
// in production set API_POS_URL to the deployed api-pos base URL (no trailing slash).
const apiPosUrl = process.env.API_POS_URL || "http://localhost:5005";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api-pos/:path*",
        destination: `${apiPosUrl}/api-pos/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ["@svgr/webpack"],
    });

    return config;
  },
};

export default nextConfig;
