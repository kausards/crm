'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Plus, Bell, Search } from 'lucide-react';
import { useAuth } from '@/app/providers';

interface NavbarProps {
  onOpenSidebar: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/orders/new': 'New Order',
  '/inventory': 'Products',
  '/customers': 'Customers',
  '/courier': 'Courier Tracker',
  '/accounts': 'Accounts',
  '/payroll': 'Payroll',
  '/due-loan': 'Due & Loan',
  '/settings': 'Settings',
  '/integrations': 'Website & Store',
};

export function Navbar({ onOpenSidebar }: NavbarProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const getPageTitle = (path: string): string => {
    for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
      if (path === prefix || path.startsWith(prefix + '/')) return title;
    }
    return 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-40 h-14 bg-[#0c0e14]/90 backdrop-blur-xl border-b border-white/[0.07] px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page title */}
        <h1 className="text-sm font-semibold text-slate-100">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search bar */}
        <div className="relative hidden md:flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="w-48 lg:w-64 bg-white/[0.04] text-sm text-slate-300 placeholder-slate-600 pl-9 pr-4 py-1.5 rounded-lg border border-white/[0.08] focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-all"
          />
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-[#0c0e14]" />
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-white/[0.08]" />

        {/* User chip */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
            {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-slate-300 truncate max-w-[110px]">
            {user?.business_name || user?.full_name?.split(' ')[0] || 'Store'}
          </span>
        </div>

        {/* CTA */}
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm shadow-violet-600/30 active:scale-[0.97] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Order</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>
    </header>
  );
}
