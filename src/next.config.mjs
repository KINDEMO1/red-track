/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even with TypeScript errors
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    // Add any other domains you need for images
  },
};

export default nextConfig;
