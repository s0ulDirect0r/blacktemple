/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zp7hauqhmxup1nll.public.blob.vercel-storage.com',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          // Framing and plugin/base-tag hardening only; a full script CSP needs a nonce pass.
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
