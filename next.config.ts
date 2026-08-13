import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There is a stray lockfile in the home directory; without this Next infers
  // /Users/apple as the workspace root and warns on every start.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
