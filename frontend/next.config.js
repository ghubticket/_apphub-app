/** @type {import('next').NextConfig} */
const nextConfig = {
  // SASS configuration
  sassOptions: {
    includePaths: ['./styles'],
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Desabilitar trace para evitar problemas com OneDrive
  experimental: {
    instrumentationHook: false,
  },
};

module.exports = nextConfig;

