import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const nextConfig: NextConfig = {
 async rewrites() {
    return [
      {
        source: "/api/ml/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
      {
        source: "/api/py/:path*",
        destination: isProd
          ? "https://proxypanel-3oll.onrender.com/api/:path*"
          : "http://localhost:8000/api/:path*",
      },
    ];
  },
};


export default nextConfig;
