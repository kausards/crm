'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex relative overflow-x-hidden">
      {/* Ambient Radial Glow Orbs */}
      <div className="fixed -top-24 -right-24 w-[550px] h-[550px] rounded-full bg-violet-600/[0.12] blur-[130px] pointer-events-none z-0" />
      <div className="fixed -bottom-24 -left-24 w-[550px] h-[550px] rounded-full bg-pink-600/[0.08] blur-[140px] pointer-events-none z-0" />
      
      {/* Subtle Background Grid Pattern */}
      <div className="fixed inset-0 bg-grid-pattern opacity-50 pointer-events-none z-0" />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 lg:pl-60">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
