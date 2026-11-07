/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['tiktok-live-connector', 'protobufjs'],
  },
  async headers() {
    return [
      {
        source: '/downloads/ReadTik.apk',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/vnd.android.package-archive',
          },
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="ReadTik.apk"',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.tiktokcdn.com',
      },
      {
        protocol: 'https',
        hostname: '**.byteoversea.com',
      },
      {
        protocol: 'https',
        hostname: '**.ibyteimg.com',
      },
    ],
  },
};

export default nextConfig;
