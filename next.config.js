// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  poweredByHeader: false,

  compress: true,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,

    // Next.js 14.0.0 ke image optimizer ke liye explicit hostname
    domains: ["ygisiztmuzwxpnvhwrmr.supabase.co"],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "ygisiztmuzwxpnvhwrmr.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async headers() {
    const productionAssetHeaders =
      process.env.NODE_ENV === "production"
        ? [
            {
              source: "/:all*(js|css)",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
            {
              source: "/:all*(png|jpg|jpeg|webp|avif|svg|ico)",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : [];

    return [
      ...productionAssetHeaders,
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
