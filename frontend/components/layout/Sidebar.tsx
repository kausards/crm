'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  PackagePlus,
  Boxes,
  Truck,
  TrendingUp,
  Users,
  BookOpen,
  Settings,
  LogOut,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/app/providers';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isOwner = user?.role === 'owner';

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Products & Stock', href: '/inventory', icon: Boxes },
    { label: 'Orders Pipeline', href: '/orders', icon: ShoppingCart },
    { label: 'POS / Quick Order', href: '/orders/new', icon: PackagePlus },
    { label: 'Courier Logistics', href: '/courier', icon: Truck, badge: 'Live' },
    // Owner-only financial & management views
    ...(isOwner
      ? [
          { label: 'Accounts & P&L', href: '/accounts', icon: TrendingUp },
          { label: 'Salary & Payroll', href: '/payroll', icon: Users },
          { label: 'Customer Due & Loan', href: '/due-loan', icon: BookOpen },
        ]
      : []),
    { label: 'Staff & Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#0B0810]/95 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.08] bg-[#100D15]/60">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-violet to-brand-magenta p-0.5 shadow-glow-violet flex items-center justify-center">
                <div className="w-full h-full bg-[#0B0810] rounded-[10px] flex items-center justify-center text-purple-300 font-bold text-sm">
                  ⚡
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-sora font-bold text-sm tracking-tight text-white truncate max-w-[140px]">
                  {user?.business_name || 'Nexus Flow'}
                </span>
                <span className="text-[10px] font-semibold text-brand-magenta tracking-wider uppercase">
                  {user?.plan || 'PRO'} CLOUD
                </span>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Workspace Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard' || pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-violet/20 text-purple-200 border border-brand-violet/30 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)] font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-violet' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Engine status indicator & User Card */}
        <div className="p-3 border-t border-white/[0.08] bg-[#0E0A14] space-y-2">
          <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Engine Online</span>
                <span className="text-[10px] text-slate-500">Steadfast • Pathao Live</span>
              </div>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-brand-violet" />
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-[#15121A] border border-white/[0.08]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-violet to-brand-magenta flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate max-w-[110px]">
                  {user?.full_name || user?.email?.split('@')[0] || 'Merchant'}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-brand-magenta" />
                  <span className="capitalize">{user?.role || 'Staff'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

