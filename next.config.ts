import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/walk-art.ts lists public/walk/ at request time to find which walk
  // destinations have a picture. public/ is not in the serverless bundle by
  // default, so without this every destination would fall back to a signpost.
  outputFileTracingIncludes: {
    "/dashboard": ["./public/walk/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
