import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Dish photos live in Vercel Blob, on a per-store subdomain. Next refuses
     * to optimise a remote host it has not been told about, which is the point:
     * without this an open image endpoint would resize anything on the internet
     * at our expense.
     *
     * Locally there is nothing to allow - the disk driver serves from /public,
     * which is same-origin.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],

    /**
     * A dish photo is decoration. AVIF encodes smaller than WebP but costs
     * noticeably more CPU per transformation, and transformations are metered;
     * WebP is the better trade here and every browser this app will meet
     * supports it.
     */
    formats: ["image/webp"],

    /**
     * Transformations are billed, so cache them for a long time. A recipe photo
     * is immutable in practice - replacing one writes a new blob with a new
     * URL - so there is nothing to go stale.
     */
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
};

export default nextConfig;
