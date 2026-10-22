import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The hero photograph is served from the project own Cloudinary account.
  // Scoped to that one delivery path rather than the whole host: a wildcard
  // on res.cloudinary.com would let any Cloudinary account be proxied and
  // optimised through this site.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/zb7a4nip/image/upload/**",
      },
    ],
  },
  partialPrefetching: true,
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
