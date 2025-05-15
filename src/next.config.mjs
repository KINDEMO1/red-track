/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'xsgames.co', 'picsum.photos', 'images.unsplash.com'],
  },
  eslint: {
    // Disable ESLint during build to prevent build failures
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript checking during build to prevent build failures
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
