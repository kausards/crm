'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  TrendingUp,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/app/providers';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function NavItem({
  href,
  icon: Icon,
  label,
  badge,
  active,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
        active
          ? 'bg-gradient-to-r from-violet-600/20 to-violet-600/5 text-violet-300 border-l-2 border-violet-500 shadow-sm font-semibold'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-violet-400' : 'text-slate-400'}`} />
        <span className="truncate">{label}</span>
      </div>
      {badge}
    </Link>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isOwner = user?.role === 'owner';

  const isAccountsActive =
    pathname.startsWith('/accounts') ||
    pathname.startsWith('/payroll') ||
    pathname.startsWith('/due-loan');

  const [accountsOpen, setAccountsOpen] = useState<boolean>(true);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Glass Sidebar Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-60 bg-[#070709]/90 backdrop-blur-2xl border-r border-white/10 shadow-2xl shadow-black flex flex-col justify-between p-4 transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-1">
            <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 shadow-lg shadow-violet-500/30 shrink-0">
                <Zap className="w-4 h-4 text-white fill-white" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-[#070709]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-headline font-bold text-sm text-slate-100 tracking-tight truncate">
                  {user?.business_name || 'NexusFlow CRM'}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-label font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
                    Dhaka Core
                  </span>
                </div>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05]"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-label font-bold uppercase tracking-widest text-slate-500">
              Core Engine
            </p>
            <NavItem
              href="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              active={pathname === '/dashboard' || pathname === '/'}
              onClick={onClose}
            />
            <NavItem
              href="/inventory"
              icon={Boxes}
              label="Products"
              active={pathname.startsWith('/inventory')}
              onClick={onClose}
            />
            <NavItem
              href="/orders"
              icon={ShoppingCart}
              label="Orders"
              active={pathname.startsWith('/orders')}
              onClick={onClose}
            />
            <NavItem
              href="/customers"
              icon={UserCheck}
              label="Customers"
              active={pathname.startsWith('/customers')}
              onClick={onClose}
            />

            {/* Accounts & Finance Collapsible */}
            {isOwner && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setAccountsOpen(!accountsOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isAccountsActive
                      ? 'text-violet-300 bg-white/[0.03]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span>Accounts & Finance</span>
                  </div>
                  {accountsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>

                {accountsOpen && (
                  <div className="ml-5 mt-1 space-y-0.5 border-l border-white/[0.08] pl-3">
                    {[
                      { href: '/accounts', label: 'P&L Overview & Bills' },
                      { href: '/payroll', label: 'Salary & Payroll' },
                      { href: '/due-loan', label: 'Due & Loan (খাতা)' },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`block px-2 py-1.5 rounded-lg text-[11px] font-label transition-colors ${
                          pathname === item.href || pathname.startsWith(item.href)
                            ? 'text-violet-400 bg-violet-600/10 font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Couriers */}
            <div className="pt-2">
              <NavItem
                href="/courier"
                icon={Truck}
                label="Courier Tracker"
                active={pathname.startsWith('/courier')}
                onClick={onClose}
                badge={
                  <span className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] text-emerald-400 border border-emerald-500/20 font-label">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live</span>
                  </span>
                }
              />
            </div>

            <NavItem
              href="/settings"
              icon={Settings}
              label="Settings"
              active={pathname.startsWith('/settings')}
              onClick={onClose}
            />
          </nav>
        </div>

        {/* User Card Bottom */}
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center font-headline font-bold text-xs text-white shrink-0">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user?.full_name || user?.email?.split('@')[0] || 'Merchant'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] font-label">
                  <span className="text-emerald-400 font-medium capitalize">
                    {user?.role || 'Owner'}
                  </span>
                  <span className="text-slate-500">· Dhaka</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
