'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Plus, Bell, Search } from 'lucide-react';
import { useAuth } from '@/app/providers';

interface NavbarProps {
  onOpenSidebar: () => void;
  title?: string;
}

export function Navbar({ onOpenSidebar }: NavbarProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path.startsWith('/orders/new')) return 'Create Order';
    if (path.startsWith('/orders')) return 'Orders';
    if (path.startsWith('/inventory')) return 'Inventory';
    if (path.startsWith('/customers')) return 'Customers';
    if (path.startsWith('/courier')) return 'Courier Tracker';
    if (path.startsWith('/accounts')) return 'P&L Accounts';
    if (path.startsWith('/payroll')) return 'Payroll';
    if (path.startsWith('/due-loan')) return 'Due & Loan';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-40 h-14 bg-[#070709]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Trigger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          aria-label="Open mobile sidebar navigation"
          className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="font-headline font-semibold text-slate-400 hidden sm:inline">
            NexusFlow
          </span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="font-headline font-semibold text-slate-100">
            {getPageTitle(pathname)}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-label font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Dhaka Hub · 18ms</span>
        </div>
      </div>

      {/* Right: Search, Notifications & Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search orders, phone, tracking..."
            className="w-56 lg:w-72 bg-white/[0.04] text-xs text-slate-200 placeholder-slate-500 pl-9 pr-10 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all font-body"
          />
          <kbd className="absolute right-2 px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-[10px] font-mono text-slate-400">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl transition-all"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-[#070709]" />
        </button>

        {/* User preview */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'M'}
          </div>
          <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
            {user?.business_name || 'Apex Retail'}
          </span>
        </div>

        {/* New Order CTA */}
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 rounded-xl shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Order</span>
        </Link>
      </div>
    </header>
  );
}
