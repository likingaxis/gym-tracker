import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd()
  },
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.30",
    "26.131.1.183"
  ]
};

export default nextConfig;
