import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  reloadOnOnline: false,
});

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

export default withSerwist(nextConfig);
