"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(true);

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-100 flex relative overflow-x-hidden">
      {/* Very subtle grid */}
      <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none z-0" />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isDesktopCollapsed}
        onToggleCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
      />

      {/* Main Content */}
      <div
        className={`relative z-10 flex-1 flex flex-col min-w-0 transition-all duration-300 ${isDesktopCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
