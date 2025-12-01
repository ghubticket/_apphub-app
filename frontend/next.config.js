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
      // NÃO incluir api.ghubtech.com.br aqui - todas as imagens devem passar pelo proxy /api/images
      // Permitir localhost apenas para desenvolvimento (mas imagens devem passar pelo proxy)
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '3443',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // Desabilitar otimização para imagens do proxy (já servidas pelo Next.js)
    unoptimized: false,
    // Desabilitar loader customizado - usar o padrão do Next.js
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

