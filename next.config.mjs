/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['tiktok-live-connector', 'protobufjs'],
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
