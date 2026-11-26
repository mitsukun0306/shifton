import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // 共通パッケージは TypeScript のまま参照するため、Next.js 側でトランスパイルする
  transpilePackages: ["@shifton/core", "@shifton/api"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
