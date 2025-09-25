import type { NextConfig } from "next";

// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      // replace <your-ref> with your Supabase project ref (e.g. abcdefghijklmnop)
      { protocol: "https", hostname: "tyuzstwfnrumjcdlkssm.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
