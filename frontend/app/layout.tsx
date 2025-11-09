import type { Metadata } from 'next';
import { Quicksand } from 'next/font/google';
import './globals.scss';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-quicksand',
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
    <html lang="pt-BR" className={quicksand.variable}>
      <body>{children}</body>
    </html>
  );
}

