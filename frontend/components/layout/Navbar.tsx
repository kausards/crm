'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Plus, Bell, Search, Store } from 'lucide-react';
import { useAuth } from '@/app/providers';

interface NavbarProps {
  onOpenSidebar: () => void;
  title?: string;
}

export function Navbar({ onOpenSidebar, title = 'Dashboard' }: NavbarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0B0810]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] border border-white/10"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-sora text-base sm:text-lg font-bold text-white tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Global Quick Search (⌘K) */}
      <div className="hidden md:flex items-center relative flex-1 max-w-md mx-4">
        <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search orders, SKUs, customers... (⌘K)"
          className="w-full h-10 pl-9 pr-12 rounded-xl bg-[#15121A] border border-white/[0.08] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-violet focus:border-brand-violet/50 transition-all"
        />
        <kbd className="absolute right-3 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white/[0.05] rounded border border-white/10">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-3">
        {/* Branch / Store Indicator */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-[#15121A] border border-white/[0.08] rounded-xl text-xs text-slate-300">
          <Store className="w-3.5 h-3.5 text-brand-violet" />
          <span className="font-medium text-white truncate max-w-[130px]">
            {user?.business_name || 'Main Branch'}
          </span>
        </div>

        {/* New Order Gradient CTA */}
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white bg-gradient-to-r from-brand-violet to-brand-magenta hover:brightness-110 rounded-xl shadow-glow-violet border border-white/10 transition-all active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Order</span>
        </Link>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="View notifications"
          className="relative p-2.5 text-slate-400 hover:text-white bg-[#15121A] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-magenta" />
        </button>
      </div>
    </header>
  );
}

