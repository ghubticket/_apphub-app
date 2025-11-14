import type { Metadata } from 'next';
import { Quicksand, Jost } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import LayoutShell from '@/components/layout/LayoutShell';
import SessionExpirationModal from '@/components/SessionExpirationModal';
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

export const metadata: Metadata = {
  title: 'EventHub - Ingressos para Eventos',
  description: 'Compre ingressos para os melhores eventos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${quicksand.variable} ${jost.variable}`}>
      <body>
        <AuthProvider>
          <LayoutShell>{children}</LayoutShell>
          <SessionExpirationModal />
        </AuthProvider>
      </body>
    </html>
  );
}

