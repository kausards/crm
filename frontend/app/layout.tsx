import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

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
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#070b14] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
