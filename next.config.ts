import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/export-hwpx": ["./practice.hwpx"],
  },
};

export default nextConfig;
