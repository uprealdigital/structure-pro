import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        has: [
          { type: "query", key: "zip" },
          { type: "query", key: "lng" },
        ],
        destination: "/cpq?zip=:zip&lng=:lng",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "query", key: "zip" }],
        destination: "/cpq?zip=:zip",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "query", key: "lng" }],
        destination: "/cpq?lng=:lng",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
