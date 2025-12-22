import type { Metadata, Viewport } from 'next';
import { Quicksand, Jost } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AuthProvider } from '@/context/AuthContext';
import { GlobalErrorProvider } from '@/context/GlobalErrorContext';
import LayoutShell from '@/components/layout/LayoutShell';
import SessionExpirationModal from '@/components/SessionExpirationModal';
import GlobalErrorModal from '@/components/shared/GlobalErrorModal';
import TestGlobalErrorLoader from '@/components/dev/TestGlobalErrorLoader';
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
    title: 'O app pro seu rolê!',
    description: 'Aqui não tem distração de outros eventos, o app É SEU, ÚNICO, exclusivo! Ingresso é só o tcha.',
    tags: [
        'vicente',
        'plataforma de eventos',
        'sistema de ingressos',
        'venda de ingressos online',
        'gestão de eventos',
        'dashboard de eventos',
        'leitor QR code',
        'cupons promocionais',
        'split pagamento Mercado Pago',
        'emails automáticos',
        'PDF de ingressos',
        'SEO para eventos',
        'eventos exclusivos',
        'sem concorrência',
        'site exclusivo de eventos',
        'PIX para eventos',
        'cartão de crédito eventos',
        'segurança de dados',
        'automação de eventos',
        'CRM de eventos',
        'relatórios de eventos',
        'validação de ingressos',
        'distribuição VIPs',
    ],
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
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Vicente',
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#f5f1e8' },
        { media: '(prefers-color-scheme: dark)', color: '#1a1a1d' },
    ],
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
                    <GlobalErrorProvider>
                        <LayoutShell>{children}</LayoutShell>
                        <SessionExpirationModal />
                        <GlobalErrorModal />
                        <TestGlobalErrorLoader />
                    </GlobalErrorProvider>
                </AuthProvider>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}

