/** @type {import('next').NextConfig} */
const nextConfig = {
  // SASS configuration
  sassOptions: {
    includePaths: ['./styles'],
  },
  
  // Image optimization
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;

