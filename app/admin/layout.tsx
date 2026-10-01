import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Root Admin Console | Nexus Flow SaaS Platform',
  description: 'Master Super-Admin & Multi-Tenant Infrastructure Console for SaaS Owner & Developers',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#07050A] text-[#e8e0ec] flex flex-col font-inter selection:bg-brand-violet/40 selection:text-white">
      {/* Background glow effects */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[350px] bg-brand-violet/10 blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[350px] bg-brand-magenta/10 blur-[140px] pointer-events-none -z-10" />
      
      {/* Dedicated Root Admin View Container */}
      <div className="flex-1 flex flex-col w-full">
        {children}
      </div>
    </div>
  );
}
