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
  Users,
  Zap,
  Globe,
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
      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
        active
          ? 'bg-violet-600/15 text-violet-300 font-semibold'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${
            active ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'
          }`}
        />
        <span className="truncate">{label}</span>
      </div>
      {badge}
    </Link>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isSuperOrOwner =
    !user?.role ||
    user?.role === 'owner' ||
    user?.role === 'super_admin' ||
    user?.role === 'admin' ||
    Boolean((user as any)?.is_super_admin);
  const canAccessFinance = isSuperOrOwner || user?.role !== 'staff';

  const isAccountsActive =
    pathname.startsWith('/accounts') ||
    pathname.startsWith('/payroll') ||
    pathname.startsWith('/due-loan');

  const [accountsOpen, setAccountsOpen] = useState<boolean>(true);

  const userInitial = user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U';
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const displayRole = user?.role ? user.role.replace('_', ' ') : 'Owner';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-60 bg-[#0f1117] border-r border-white/[0.07] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
                <div className="relative w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-600/30">
                  <Zap className="w-4 h-4 text-white fill-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-100 truncate leading-tight">
                    {user?.business_name || 'NexusFlow CRM'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">Dashboard</p>
                </div>
              </Link>
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/[0.05] transition-colors"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
            {/* Main */}
            <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
              Main
            </p>
            <NavItem
              href="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              active={pathname === '/dashboard' || pathname === '/'}
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
              href="/inventory"
              icon={Boxes}
              label="Products"
              active={pathname.startsWith('/inventory')}
              onClick={onClose}
            />
            <NavItem
              href="/customers"
              icon={Users}
              label="Customers"
              active={pathname.startsWith('/customers')}
              onClick={onClose}
            />

            {/* Finance */}
            {canAccessFinance && (
              <div className="pt-4">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                  Finance
                </p>
                <button
                  type="button"
                  onClick={() => setAccountsOpen(!accountsOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isAccountsActive
                      ? 'text-violet-300 bg-violet-600/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className={`w-4 h-4 shrink-0 ${isAccountsActive ? 'text-violet-400' : 'text-slate-500'}`} />
                    <span>Accounts</span>
                  </div>
                  {accountsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>

                {accountsOpen && (
                  <div className="ml-7 mt-1 space-y-0.5 border-l border-white/[0.07] pl-3">
                    {[
                      { href: '/accounts', label: 'P&L Overview' },
                      { href: '/payroll', label: 'Payroll' },
                      { href: '/due-loan', label: 'Due & Loan' },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`block px-2 py-2 rounded-lg text-sm transition-colors ${
                          pathname === item.href || pathname.startsWith(item.href)
                            ? 'text-violet-400 font-semibold bg-violet-600/10'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* More */}
            <div className="pt-4">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                More
              </p>
              <NavItem
                href="/courier"
                icon={Truck}
                label="Courier Tracker"
                active={pathname.startsWith('/courier')}
                onClick={onClose}
                badge={
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                }
              />
              <NavItem
                href="/integrations"
                icon={Globe}
                label="Website & Store"
                active={pathname.startsWith('/integrations')}
                onClick={onClose}
              />
              <NavItem
                href="/settings"
                icon={Settings}
                label="Settings"
                active={pathname.startsWith('/settings')}
                onClick={onClose}
              />
            </div>
          </nav>

          {/* User Footer */}
          <div className="px-3 py-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                  {userInitial.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 capitalize">{displayRole}</p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
