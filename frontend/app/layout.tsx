import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BD E-Commerce SaaS | Inventory, Courier & Accounts',
  description: 'Multi-tenant Inventory, Courier & Deterministic Accounting SaaS for Bangladeshi E-Commerce Businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${sora.variable}`}>
      <body className="antialiased min-h-screen bg-[#0B0810] text-[#e8e0ec] font-inter selection:bg-brand-violet/30 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

