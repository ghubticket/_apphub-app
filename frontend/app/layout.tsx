import type { Metadata } from 'next';
import { Quicksand, Jost } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import LayoutShell from '@/components/layout/LayoutShell';
import SessionExpirationModal from '@/components/SessionExpirationModal';
import StructuredData from '@/components/seo/StructuredData';
import { generateMetadata as generateSEOMetadata, generateOrganizationStructuredData } from '@/lib/seo';
import './globals.scss';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-quicksand',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-muzicon',
});

const baseMetadata = generateSEOMetadata({
  title: 'Ingressos para Eventos',
  description: 'Compre ingressos para os melhores eventos com Toka. Eventos exclusivos, pagamento seguro via PIX e cartão, entrega imediata do ingresso por email.',
  tags: ['ingressos', 'eventos', 'toka', 'comprar ingressos', 'ingressos online', 'eventos rio de janeiro'],
});

export const metadata: Metadata = {
  ...baseMetadata,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#1a1a1d' },
    ],
  },
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f1e8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1d' },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Toka',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationData = generateOrganizationStructuredData();
  
  return (
    <html lang="pt-BR" className={`${quicksand.variable} ${jost.variable}`}>
      <head>
        <StructuredData data={organizationData} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#1a1a1d" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body>
        <AuthProvider>
          <LayoutShell>{children}</LayoutShell>
          <SessionExpirationModal />
        </AuthProvider>
      </body>
    </html>
  );
}

