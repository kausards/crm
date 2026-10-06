'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Plus, Bell, Search, Globe, Languages } from 'lucide-react';
import { useAuth } from '@/app/providers';
import { useTranslation } from '@/lib/i18n';

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
  '/accounts': 'Finance',
  '/payroll': 'Payroll',
  '/due-loan': 'Due & Loan',
  '/settings': 'Settings',
  '/integrations': 'Website & Store',
};

export function Navbar({ onOpenSidebar }: NavbarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { toggleLanguage, t, language } = useTranslation();

  const getPageTitle = (path: string): string => {
    for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
      if (path === prefix || path.startsWith(prefix + '/')) return t(title);
    }
    return t('Dashboard');
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 shadow-sm">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page title */}
        <h1 className="text-lg font-bold text-slate-900 tracking-tight hidden sm:block">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search bar */}
        <div className="relative hidden md:flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder={t('Search...')}
            className="w-48 lg:w-72 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
          />
        </div>

        {/* Language/Live toggle - mimicking the Figma header */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-emerald-700">{t('Live')}</span>
        </div>

        {/* Font Toggle */}
        <button
          onClick={toggleLanguage}
          aria-label="Toggle Font Language"
          className="relative p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer border border-transparent flex items-center gap-2"
          title={language === 'bn' ? "Switch to English" : "Switch to Bengali"}
        >
          <Languages className="w-5 h-5" />
          <span className="text-xs font-bold uppercase hidden sm:block">
            {language === 'bn' ? 'BN' : 'EN'}
          </span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors cursor-pointer border border-transparent hover:border-slate-200"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* User chip */}
        <div className="flex items-center gap-3 pl-2 sm:pl-4 sm:border-l border-slate-200">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-semibold text-slate-900 truncate max-w-[120px]">
              {user?.business_name || user?.full_name?.split(' ')[0] || 'Store'}
            </span>
            <span className="text-[11px] font-medium text-slate-500">ID: {user?.id?.substring(0, 8) || '1234567'}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 border border-indigo-200">
            {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
