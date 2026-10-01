'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Crown,
  Search,
  Building2,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Package,
  ShoppingCart,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  KeyRound,
  LogOut,
  RefreshCw,
  Download,
  Activity,
  Layers,
  Server,
  DollarSign,
  ChevronRight,
  Sliders,
  Check,
} from 'lucide-react';
import { useToast } from '@/app/providers';
import { fetchApi, formatDate } from '@/lib/apiClient';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface TenantOwner {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface TenantItem {
  id: string;
  business_name: string;
  owner_id: string;
  plan: 'trial' | 'basic' | 'pro';
  subscription_status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  owner: TenantOwner | null;
  staff_count: number;
}

interface TenantDetailResponse {
  tenant: {
    id: string;
    business_name: string;
    owner_id: string;
    plan: 'trial' | 'basic' | 'pro';
    subscription_status: 'active' | 'expired' | 'cancelled';
    created_at: string;
  };
  profiles: Array<{
    id: string;
    role: string;
    full_name: string | null;
    email: string | null;
    created_at: string;
  }>;
  stats: {
    total_orders: number;
    total_products: number;
    total_employees: number;
  };
}

interface GlobalStatsResponse {
  stats: {
    totalTenants: number;
    activeTenants: number;
    proTenants: number;
    basicTenants: number;
    trialTenants: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    totalGmv: number;
    estimatedMrr: number;
  };
  recentTenants: Array<{
    id: string;
    business_name: string;
    plan: string;
    subscription_status: string;
    created_at: string;
    owner: { email: string | null; full_name: string | null } | null;
  }>;
}

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Navigation tab: 'tenants' | 'analytics' | 'plans' | 'system'
  const [activeTab, setActiveTab] = useState<'tenants' | 'analytics' | 'plans' | 'system'>('tenants');

  // Master auth gate state
  const [authMethod, setAuthMethod] = useState<'key' | 'credentials'>('key');
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Check current admin session
  const {
    data: adminSession,
    isLoading: isCheckingAuth,
    refetch: refetchAuth,
  } = useQuery({
    queryKey: ['admin-auth-me'],
    queryFn: async () => {
      try {
        return await fetchApi<{
          isSuperAdmin: boolean;
          user: { id: string; email: string; fullName: string; role: string };
        }>('/api/v1/admin/auth/me');
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const isSuperAdmin = Boolean(adminSession?.isSuperAdmin);

  // Filters & Pagination for tenants
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [inspectTenantId, setInspectTenantId] = useState<string | null>(null);
  const [editTenant, setEditTenant] = useState<TenantItem | null>(null);
  const [editPlan, setEditPlan] = useState<'trial' | 'basic' | 'pro'>('trial');
  const [editStatus, setEditStatus] = useState<'active' | 'expired' | 'cancelled'>('active');

  // Global platform statistics
  const { data: globalStatsData, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-global-stats'],
    queryFn: async () => {
      return await fetchApi<GlobalStatsResponse>('/api/v1/admin/stats');
    },
    enabled: isSuperAdmin,
  });

  // Fetch tenants
  const {
    data: tenantsData,
    isLoading: isLoadingTenants,
    refetch: refetchTenants,
  } = useQuery({
    queryKey: ['admin-tenants', search, planFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (planFilter) params.set('plan', planFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '25');

      return await fetchApi<{
        items: TenantItem[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/v1/admin/tenants?${params.toString()}`);
    },
    enabled: isSuperAdmin,
  });

  // Fetch inspect details for a tenant
  const { data: tenantDetail, isLoading: isInspecting } = useQuery({
    queryKey: ['admin-tenant-detail', inspectTenantId],
    queryFn: async () => {
      if (!inspectTenantId) return null;
      return await fetchApi<TenantDetailResponse>(`/api/v1/admin/tenants/${inspectTenantId}`);
    },
    enabled: Boolean(inspectTenantId && isSuperAdmin),
  });

  // Mutation: verify master access
  const handleVerifyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const payload =
        authMethod === 'key'
          ? { masterKey: masterKeyInput }
          : { email: adminEmail, password: adminPassword };

      await fetchApi('/api/v1/admin/auth/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast('Developer Master Access Granted ✅', 'success');
      await refetchAuth();
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-global-stats'] });
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Master access verification failed', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Mutation: logout admin
  const handleAdminLogout = async () => {
    try {
      await fetchApi('/api/v1/admin/auth/logout', { method: 'POST' });
      toast('Signed out from Master Console', 'info');
      await refetchAuth();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Mutation: update tenant plan / status
  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; plan: string; subscription_status: string }) => {
      return await fetchApi(`/api/v1/admin/tenants/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          plan: payload.plan,
          subscription_status: payload.subscription_status,
        }),
      });
    },
    onSuccess: () => {
      toast('Tenant plan and subscription status updated successfully', 'success');
      setEditTenant(null);
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-global-stats'] });
    },
    onError: (err: Error) => {
      toast(err.message || 'Failed to update tenant', 'error');
    },
  });

  // Export tenants to CSV
  const handleExportCsv = () => {
    const items = tenantsData?.items || [];
    if (items.length === 0) {
      toast('No tenant records available to export', 'error');
      return;
    }

    const headers = ['Business Name', 'Tenant ID', 'Owner Name', 'Owner Email', 'Plan', 'Status', 'Staff Count', 'Created At'];
    const rows = items.map((t) => [
      `"${t.business_name.replace(/"/g, '""')}"`,
      `"${t.id}"`,
      `"${(t.owner?.full_name || '').replace(/"/g, '""')}"`,
      `"${t.owner?.email || ''}"`,
      t.plan,
      t.subscription_status,
      t.staff_count,
      t.created_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexusflow_tenants_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Client store database exported to CSV successfully', 'success');
  };

  // Loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-violet to-brand-magenta p-0.5 animate-spin mb-4">
          <div className="w-full h-full bg-[#07050A] rounded-[14px]" />
        </div>
        <p className="text-sm font-medium text-slate-300">Initializing Nexus Flow SaaS Root Console...</p>
        <span className="text-xs text-slate-500 mt-1">Verifying cryptographic developer credentials</span>
      </div>
    );
  }

  // State A: Master Developer Gate if not authenticated
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        {/* Glow ambient halos */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-brand-violet/20 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-brand-magenta/15 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-violet via-purple-500 to-brand-magenta p-0.5 shadow-[0_0_35px_-5px_rgba(139,92,246,0.6)] items-center justify-center mb-4">
              <div className="w-full h-full bg-[#0B0810] rounded-[14px] flex items-center justify-center text-white">
                <Crown className="w-8 h-8 text-purple-300 animate-pulse" />
              </div>
            </div>
            <h1 className="font-sora text-2xl sm:text-3xl font-bold tracking-tight text-white">
              SaaS Master Root Console
            </h1>
            <p className="mt-2 text-xs text-slate-400 max-w-sm mx-auto">
              Dedicated Infrastructure & Multi-Tenant Management Portal for SaaS Owner & Developer
            </p>
          </div>

          <div className="bg-[#120E18]/90 border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
            {/* Toggle auth method */}
            <div className="flex rounded-xl bg-black/40 p-1 mb-6 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setAuthMethod('key')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMethod === 'key'
                    ? 'bg-brand-violet text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔑 Master Key
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('credentials')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMethod === 'credentials'
                    ? 'bg-brand-violet text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👤 Developer Login
              </button>
            </div>

            <form onSubmit={handleVerifyAccess} className="space-y-4">
              {authMethod === 'key' ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Platform Master Secret Passcode
                    </label>
                    <button
                      type="button"
                      onClick={() => setMasterKeyInput('crm_developer_root_2026')}
                      className="text-[10px] text-brand-magenta hover:underline"
                    >
                      Fill Default Key
                    </button>
                  </div>
                  <Input
                    id="admin-master-key"
                    type="password"
                    placeholder="Enter root passcode..."
                    value={masterKeyInput}
                    onChange={(e) => setMasterKeyInput(e.target.value)}
                    required
                    className="bg-[#0A0710] border-white/[0.12] focus:border-brand-violet"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-brand-violet" />
                    Default configured in .env.local: <code className="text-purple-300">crm_developer_root_2026</code>
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Super Admin Email
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminEmail('mdkausar0877@gmail.com');
                          setAdminPassword('Kausar821');
                        }}
                        className="text-[10px] text-brand-magenta hover:underline"
                      >
                        Fill Super Admin
                      </button>
                    </div>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@nexusflow.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                      className="bg-[#0A0710] border-white/[0.12]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Password
                    </label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      className="bg-[#0A0710] border-white/[0.12]"
                    />
                  </div>
                </>
              )}

              <Button
                id="admin-unlock-button"
                type="submit"
                variant="primary"
                className="w-full mt-4 bg-gradient-to-r from-brand-violet to-brand-magenta hover:opacity-95 text-white font-semibold py-2.5 shadow-[0_0_25px_-4px_rgba(139,92,246,0.5)]"
                isLoading={isVerifying}
              >
                Unlock Root Admin Console
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <span>Merchant or Store Staff?</span>
              <Link
                href="/login"
                className="text-brand-magenta hover:text-pink-300 font-semibold flex items-center gap-1"
              >
                Merchant Store Login <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State B: Full Standalone Master Admin Console
  const tenants = tenantsData?.items || [];
  const pagination = tenantsData?.pagination || { total: 0, totalPages: 1, page: 1, limit: 25 };
  const stats = globalStatsData?.stats || {
    totalTenants: pagination.total || tenants.length,
    activeTenants: tenants.filter((t) => t.subscription_status === 'active').length,
    proTenants: tenants.filter((t) => t.plan === 'pro').length,
    basicTenants: tenants.filter((t) => t.plan === 'basic').length,
    trialTenants: tenants.filter((t) => t.plan === 'trial').length,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalGmv: 0,
    estimatedMrr: 0,
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* 1. Master Console Top Navigation Bar */}
      <header className="h-16 bg-[#0E0A14]/90 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-violet via-purple-600 to-brand-magenta p-0.5 shadow-[0_0_20px_-3px_rgba(139,92,246,0.5)] flex items-center justify-center">
            <div className="w-full h-full bg-[#07050A] rounded-[10px] flex items-center justify-center text-purple-300">
              <Crown className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sora font-extrabold text-sm sm:text-base text-white tracking-wide">
                NEXUS FLOW
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-violet/20 text-brand-violet border border-brand-violet/30 uppercase tracking-widest">
                Root Console
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Multi-Tenant Cloud Control • 10 to 100+ Client Stores Fleet
            </p>
          </div>
        </div>

        {/* Status Indicators & Master Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">All Micro-Engines Live</span>
          </div>

          <Link
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-slate-200 transition-colors"
            title="Open merchant CRM dashboard in new tab"
          >
            <span>Visit Storefront</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
            title="Sign out from Root Console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock Console</span>
          </button>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Registered Client Stores"
            value={stats.totalTenants}
            subtitle={`${stats.activeTenants} currently active stores`}
            icon={<Building2 className="w-5 h-5 text-brand-violet" />}
          />
          <StatCard
            title="Projected SaaS MRR"
            value={`৳${stats.estimatedMrr.toLocaleString()}`}
            subtitle="Monthly recurring revenue"
            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          />
          <StatCard
            title="Total System Orders"
            value={stats.totalOrders}
            subtitle="Processed across all stores"
            icon={<ShoppingCart className="w-5 h-5 text-brand-magenta" />}
          />
          <StatCard
            title="Platform GMV (Sales)"
            value={`৳${stats.totalGmv.toLocaleString()}`}
            subtitle="Gross merchandise value"
            icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
          />
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex border-b border-white/[0.08] space-x-2 sm:space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'tenants'
                ? 'border-brand-violet text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-brand-violet" />
            Client Stores & Tenants
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-violet/20 text-brand-violet font-bold">
              {stats.totalTenants}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-brand-violet text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            Global SaaS Analytics
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'plans'
                ? 'border-brand-violet text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-brand-magenta" />
            Pricing Tiers & Rules
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'system'
                ? 'border-brand-violet text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4 text-cyan-400" />
            System Diagnostics
          </button>
        </div>

        {/* TAB 1: CLIENT STORES & TENANTS MANAGEMENT */}
        {activeTab === 'tenants' && (
          <div className="space-y-4">
            {/* Action Bar & Search */}
            <div className="p-4 rounded-2xl bg-[#120E18] border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search store name, owner, or email..."
                  className="pl-9 bg-[#0B0810] border-white/[0.08]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <Select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { label: 'All Plans', value: '' },
                    { label: 'Pro Plan', value: 'pro' },
                    { label: 'Basic Plan', value: 'basic' },
                    { label: 'Trial', value: 'trial' },
                  ]}
                  className="w-32 bg-[#0B0810] border-white/[0.08]"
                />

                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { label: 'All Statuses', value: '' },
                    { label: 'Active', value: 'active' },
                    { label: 'Expired', value: 'expired' },
                    { label: 'Cancelled', value: 'cancelled' },
                  ]}
                  className="w-36 bg-[#0B0810] border-white/[0.08]"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 border-white/[0.1] text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchTenants()}
                  className="flex items-center gap-1 border-white/[0.1] text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Tenants Data Table */}
            <div className="bg-[#120E18] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0C0812] text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-white/[0.08]">
                    <tr>
                      <th className="py-3.5 px-4">Business Store</th>
                      <th className="py-3.5 px-4">Merchant Owner</th>
                      <th className="py-3.5 px-4">Plan Tier</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Staff Count</th>
                      <th className="py-3.5 px-4">Created Date</th>
                      <th className="py-3.5 px-4 text-right">Root Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-slate-300">
                    {isLoadingTenants ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading client store data...
                        </td>
                      </tr>
                    ) : tenants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No client stores found matching query.
                        </td>
                      </tr>
                    ) : (
                      tenants.map((tenant) => {
                        const isPro = tenant.plan === 'pro';
                        const isBasic = tenant.plan === 'basic';
                        const isActive = tenant.subscription_status === 'active';

                        return (
                          <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-brand-violet/20 border border-brand-violet/30 flex items-center justify-center font-bold text-white text-xs">
                                  {tenant.business_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-white text-xs">
                                    {tenant.business_name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {tenant.id.slice(0, 16)}...
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div>
                                <div className="font-medium text-slate-200">
                                  {tenant.owner?.full_name || 'Store Owner'}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {tenant.owner?.email || 'No email attached'}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isPro
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : isBasic
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                                }`}
                              >
                                {tenant.plan}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                                  }`}
                                />
                                <span className="capitalize">{tenant.subscription_status}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-slate-300">
                              {tenant.staff_count} members
                            </td>

                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                              {formatDate(tenant.created_at)}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => setInspectTenantId(tenant.id)}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-purple-300 border border-white/[0.08] text-[11px] font-semibold transition-colors"
                                  title="View store dossier, orders, and staff"
                                >
                                  Dossier
                                </button>
                                <button
                                  onClick={() => {
                                    setEditTenant(tenant);
                                    setEditPlan(tenant.plan);
                                    setEditStatus(tenant.subscription_status);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-brand-violet/20 hover:bg-brand-violet/30 text-white border border-brand-violet/40 text-[11px] font-semibold transition-colors"
                                  title="Change subscription plan or account status"
                                >
                                  Modify
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {pagination.totalPages > 1 && (
                <div className="p-3 border-t border-white/[0.08] bg-[#0C0812] flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Showing {tenants.length} of {pagination.total} registered stores
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="font-mono text-white">
                      {page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GLOBAL SAAS ANALYTICS & OVERVIEW */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plan Distribution Breakdown */}
              <div className="p-6 rounded-2xl bg-[#120E18] border border-white/[0.08] space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-magenta" />
                  Subscription Tier Distribution
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">PRO Cloud Stores</span>
                      <span className="text-purple-300 font-bold">{stats.proTenants} stores</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-violet to-brand-magenta"
                        style={{
                          width: `${(stats.proTenants / Math.max(1, stats.totalTenants)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Basic Cloud Stores</span>
                      <span className="text-blue-300 font-bold">{stats.basicTenants} stores</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${(stats.basicTenants / Math.max(1, stats.totalTenants)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Trial Accounts</span>
                      <span className="text-amber-300 font-bold">{stats.trialTenants} stores</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{
                          width: `${(stats.trialTenants / Math.max(1, stats.totalTenants)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] text-[11px] text-slate-400">
                  Total Active Retention Rate:{' '}
                  <span className="text-emerald-400 font-semibold">
                    {Math.round((stats.activeTenants / Math.max(1, stats.totalTenants)) * 100)}%
                  </span>
                </div>
              </div>

              {/* Total Customers & Products */}
              <div className="p-6 rounded-2xl bg-[#120E18] border border-white/[0.08] space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-violet" />
                  E-Commerce Scale Metrics
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-xs text-slate-400">Total Products Catalogs</span>
                    <span className="text-sm font-bold text-white font-mono">{stats.totalProducts}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-xs text-slate-400">End Buyers (Customers)</span>
                    <span className="text-sm font-bold text-white font-mono">{stats.totalCustomers}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-xs text-slate-400">Avg Orders Per Store</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {Math.round(stats.totalOrders / Math.max(1, stats.totalTenants))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Revenue Projection Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1A1224] to-[#120E18] border border-brand-violet/30 shadow-[0_0_30px_-5px_rgba(139,92,246,0.2)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                      SaaS MRR Projection
                    </span>
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    ৳{stats.estimatedMrr.toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Based on ৳3,500/mo for PRO & ৳1,500/mo for Basic
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs">
                  <span className="text-slate-400">Annual Run Rate (ARR):</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    ৳{(stats.estimatedMrr * 12).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Registrations Timeline */}
            <div className="p-6 rounded-2xl bg-[#120E18] border border-white/[0.08]">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Recent Merchant Store Registrations
              </h3>
              <div className="divide-y divide-white/[0.06]">
                {(globalStatsData?.recentTenants || []).map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-xs font-bold text-white">
                        {t.business_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">{t.business_name}</div>
                        <div className="text-[10px] text-slate-400">
                          {t.owner?.full_name || 'Owner'} • {t.owner?.email || 'Email'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.05] text-slate-300">
                        {t.plan.toUpperCase()}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">{formatDate(t.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PRICING TIERS & LIMIT RULES */}
        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Trial Tier */}
            <div className="p-6 rounded-3xl bg-[#120E18] border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                    TRIAL TIER
                  </span>
                  <span className="text-xs text-slate-400">14 Days Free</span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">৳0 / month</div>
                <p className="text-xs text-slate-400 mb-6">
                  Default plan automatically granted to newly registered stores for evaluation.
                </p>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Up to 100 Orders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Single Admin User (1 staff)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Basic Inventory & Orders Pipeline
                  </li>
                  <li className="flex items-center gap-2 text-slate-500">
                    <XCircle className="w-4 h-4 text-slate-600" />
                    No Steadfast/Pathao Courier Sync
                  </li>
                  <li className="flex items-center gap-2 text-slate-500">
                    <XCircle className="w-4 h-4 text-slate-600" />
                    No P&L Accounting Engine
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-white/[0.08] text-center text-xs text-slate-400 font-mono">
                Active Stores: {stats.trialTenants}
              </div>
            </div>

            {/* Basic Tier */}
            <div className="p-6 rounded-3xl bg-[#120E18] border border-blue-500/30 shadow-[0_0_25px_-5px_rgba(59,130,246,0.2)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    BASIC CLOUD
                  </span>
                  <span className="text-xs text-blue-400 font-semibold">Standard</span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">৳1,500 / month</div>
                <p className="text-xs text-slate-400 mb-6">
                  For growing e-commerce businesses scaling up their operational logistics.
                </p>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Up to 1,000 Orders / Month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Up to 5 Staff Members
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Steadfast Courier API Integration
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    POS / Quick Orders Desk
                  </li>
                  <li className="flex items-center gap-2 text-slate-500">
                    <XCircle className="w-4 h-4 text-slate-600" />
                    No Multi-Courier Auto Routing
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-white/[0.08] text-center text-xs text-blue-300 font-mono">
                Active Stores: {stats.basicTenants}
              </div>
            </div>

            {/* Pro Tier */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1C1228] to-[#120E18] border border-brand-violet shadow-[0_0_35px_-5px_rgba(139,92,246,0.3)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-violet text-white">
                    PRO CLOUD ⚡
                  </span>
                  <span className="text-xs text-brand-magenta font-bold">UNLIMITED</span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">৳3,500 / month</div>
                <p className="text-xs text-slate-400 mb-6">
                  Enterprise grade suite with unlimited orders, full deterministic accounting & courier automation.
                </p>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Unlimited Monthly Orders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Unlimited Staff & Roles
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Steadfast + Pathao Auto-Routing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Deterministic P&L, Due & Payroll
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Real-time Return Risk Engine
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-white/[0.08] text-center text-xs text-purple-300 font-mono">
                Active Stores: {stats.proTenants}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM DIAGNOSTICS & ENGINE STATUS */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Infrastructure Status */}
              <div className="p-6 rounded-2xl bg-[#120E18] border border-white/[0.08] space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  SaaS Core Micro-Services
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-semibold text-white">PostgreSQL DB Cluster</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-mono">Connected (Supabase Cloud)</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-semibold text-white">Steadfast Courier Webhook</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-mono">Listening on /api/v1/courier</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-semibold text-white">Pathao Courier Webhook</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-mono">Listening on /api/v1/courier</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-semibold text-white">AES-256 Courier Key Encryption</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-mono">ENCRYPTION_KEY Configured</span>
                  </div>
                </div>
              </div>

              {/* Developer Configuration */}
              <div className="p-6 rounded-2xl bg-[#120E18] border border-white/[0.08] space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-violet" />
                  Master Developer Profile & Root Access
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-slate-500 block mb-0.5">Super Admin Email</span>
                    <span className="text-white font-mono">{adminSession?.user?.email || 'kausar.test@crmdemo.com'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-slate-500 block mb-0.5">Super Admin User UUID</span>
                    <span className="text-white font-mono">{adminSession?.user?.id || '2047f979-e11f-4992-b302-74f80447fcb7'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-slate-500 block mb-0.5">Master Developer Secret Key</span>
                    <span className="text-emerald-400 font-mono">crm_developer_root_2026 (Active)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. MODAL: INSPECT TENANT DOSSIER */}
      {inspectTenantId && (
        <Modal
          isOpen={Boolean(inspectTenantId)}
          onClose={() => setInspectTenantId(null)}
          title="Tenant Client Store Dossier"
        >
          {isInspecting ? (
            <div className="py-12 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading complete store profile...
            </div>
          ) : tenantDetail ? (
            <div className="space-y-5">
              {/* Store Summary */}
              <div className="p-4 rounded-xl bg-[#0E0A14] border border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {tenantDetail.tenant.business_name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      ID: {tenantDetail.tenant.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-brand-violet/20 text-brand-violet border border-brand-violet/30">
                      {tenantDetail.tenant.plan}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {tenantDetail.tenant.subscription_status}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Registered On: <span className="text-white">{formatDate(tenantDetail.tenant.created_at)}</span>
                </div>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-lg font-bold text-white">{tenantDetail.stats.total_orders}</div>
                  <div className="text-[10px] text-slate-400">Total Orders Placed</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-lg font-bold text-white">{tenantDetail.stats.total_products}</div>
                  <div className="text-[10px] text-slate-400">Products in Stock</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-lg font-bold text-white">{tenantDetail.stats.total_employees}</div>
                  <div className="text-[10px] text-slate-400">Payroll Staff</div>
                </div>
              </div>

              {/* Profiles & Members */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                  Registered Staff & Accounts ({tenantDetail.profiles.length})
                </h4>
                <div className="divide-y divide-white/[0.06] max-h-48 overflow-y-auto rounded-xl bg-[#0E0A14] border border-white/[0.08]">
                  {tenantDetail.profiles.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">{p.full_name || 'No Name'}</div>
                        <div className="text-[10px] text-slate-400">{p.email}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/[0.05] text-slate-300">
                        {p.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-white/[0.08]">
                <Button variant="outline" onClick={() => setInspectTenantId(null)}>
                  Close Dossier
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-rose-400">Unable to load tenant dossier.</div>
          )}
        </Modal>
      )}

      {/* 4. MODAL: EDIT TENANT PLAN & SUBSCRIPTION STATUS */}
      {editTenant && (
        <Modal
          isOpen={Boolean(editTenant)}
          onClose={() => setEditTenant(null)}
          title={`Modify Subscription: ${editTenant.business_name}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Subscription Plan Tier
              </label>
              <Select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value as 'trial' | 'basic' | 'pro')}
                options={[
                  { label: 'PRO Cloud (Unlimited)', value: 'pro' },
                  { label: 'Basic Cloud (1,000 Orders)', value: 'basic' },
                  { label: 'Trial (Evaluation)', value: 'trial' },
                ]}
                className="w-full bg-[#0E0A14] border-white/[0.12]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Subscription Status
              </label>
              <Select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(e.target.value as 'active' | 'expired' | 'cancelled')
                }
                options={[
                  { label: 'Active (Store fully unlocked)', value: 'active' },
                  { label: 'Expired (Grace period / Renewal pending)', value: 'expired' },
                  { label: 'Cancelled / Suspended', value: 'cancelled' },
                ]}
                className="w-full bg-[#0E0A14] border-white/[0.12]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <Button variant="outline" onClick={() => setEditTenant(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    id: editTenant.id,
                    plan: editPlan,
                    subscription_status: editStatus,
                  })
                }
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
