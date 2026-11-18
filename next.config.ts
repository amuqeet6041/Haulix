import type { NextConfig } from "next";

/**
 * Headers for the private admin area and its API. The pages already read the
 * session, so Next renders them per request; these headers say so explicitly to
 * browsers and proxies, forbid framing (clickjacking), and stop the admin URLs
 * (which can contain lead ids and search text) leaking through the Referer
 * header. The public website is deliberately not affected.
 */
const privateAdminHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep Prisma and pg out of the bundler; they run only on the server.
  serverExternalPackages: ["pg"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      // "/admin/:path*" also matches "/admin" itself.
      { source: "/admin/:path*", headers: privateAdminHeaders },
      { source: "/api/admin/:path*", headers: privateAdminHeaders },
    ];
  },
};

export default nextConfig;
