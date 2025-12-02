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
      {
        protocol: 'https',
        hostname: 'media.r2.com.vc',
      },
      // Cloudflare R2 (Object Storage)
      {
        protocol: 'https',
        hostname: 'pub-f4689139a6714f29870cf3f8f2eb9775.r2.dev',
      },
      // Permitir imagens diretamente da API (compatibilidade com dados antigos)
      {
        protocol: 'https',
        hostname: 'api.ghubtech.com.br',
        pathname: '/uploads/**',
      },
      // Permitir localhost para desenvolvimento
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '3443',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // Habilitar otimização de imagens
    unoptimized: false,
    // Usar o loader padrão do Next.js
    loader: 'default',
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Desabilitar trace para evitar problemas com OneDrive
  experimental: {
    instrumentationHook: false,
  },
  
  // Ignorar warnings de lint no build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

