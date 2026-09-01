import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone, a self-contained server used by the Docker image.
  output: "standalone",
};

export default nextConfig;
