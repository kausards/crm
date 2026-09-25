'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Plus, Bell } from 'lucide-react';
import { useAuth } from '@/app/providers';

interface NavbarProps {
  onOpenSidebar: () => void;
  title?: string;
}

export function Navbar({ onOpenSidebar, title = 'Dashboard' }: NavbarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 border border-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/orders/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm border border-emerald-500/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Order</span>
        </Link>

        {/* Tenant Role Indicator */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">{user?.business_name || 'Store'}</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 capitalize">{user?.role || 'Owner'}</span>
        </div>

        {/* Notification Icon */}
        <div className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800 rounded-lg">
          <Bell className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
