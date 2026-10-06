import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono, Hind_Siliguri } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  variable: '--font-bengali',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'NexusFlow CRM',
  description: 'Smart CRM & Inventory Management for E-Commerce Brands',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${hindSiliguri.variable}`}>
      <body className={`antialiased min-h-screen bg-[#F7F8FA] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 ${plusJakartaSans.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
