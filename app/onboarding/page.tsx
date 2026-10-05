'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useToast } from '@/app/providers';
import { fetchApi } from '@/lib/apiClient';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState(user?.business_name || '');
  const [totalStockValue, setTotalStockValue] = useState<number>(1842500);
  const [totalReceivable, setTotalReceivable] = useState<number>(84500);
  const [totalPayable, setTotalPayable] = useState<number>(350000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await fetchApi('/api/v1/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          business_name: businessName || user?.business_name,
          total_stock_value: Number(totalStockValue) || 0,
          total_receivable: Number(totalReceivable) || 0,
          total_payable: Number(totalPayable) || 0,
        }),
      });

      await refreshUser();
      toast('Store baseline established! Welcome to your dashboard.', 'success');
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0810] text-[#F5F3F7] flex flex-col justify-between relative selection:bg-secondary/30 selection:text-white overflow-x-hidden">
      {/* Ambient Radial Mesh Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-r from-purple-600/20 via-pink-600/15 to-transparent blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 right-10 w-[420px] h-[300px] bg-purple-900/10 blur-[130px] rounded-full"></div>
      </div>

      {/* Top App Navigation / Header Bar */}
      <header className="w-full relative z-10 border-b border-white/[0.06] backdrop-blur-md bg-[#0B0810]/70 py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-[#15121A] rounded-[10px] flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold text-[17px] tracking-tight text-white">Nexus Flow</span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-medium">
                Enterprise Setup
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant tracking-normal">
              Multi-Channel Operating Matrix • {user?.business_name || 'Apex Retail Ltd'}
            </p>
          </div>
        </div>

        {/* Quick Help / Tenant Badge */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container border border-white/5 py-1.5 px-3 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span className="font-medium text-white/90">Zero-Trust Vault</span>
            <span className="text-white/20">|</span>
            <span className="text-white/60">SOC-2 Isolated</span>
          </div>
        </div>
      </header>

      {/* Main Wizard Content Shell */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 relative z-10 flex flex-col items-center">
        {/* Stepper Section Header */}
        <div className="text-center mb-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-on-surface-variant mb-3">
            <span className="text-secondary font-semibold font-mono">STEP 02 OF 03</span>
            <span className="text-white/20">•</span>
            <span>Initial Ledger Calibration</span>
          </div>
          <h1 className="font-headline font-extrabold text-2xl md:text-3xl text-white tracking-tight leading-snug">
            Configure{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Opening Balances
            </span>
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            Establish baseline balance figures so gross margins, working capital, and automated P&L reconciliations calculate accurately from day one.
          </p>
        </div>

        {/* Horizontal 3-Step Stepper */}
        <div className="w-full max-w-2xl mb-9">
          <div className="relative flex items-center justify-between">
            {/* Connecting Line Base */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-white/[0.07] z-0"></div>
            {/* Progress Completed Line (Step 1 to Step 2) */}
            <div className="absolute left-6 w-[50%] top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-tertiary via-primary to-secondary z-0"></div>

            {/* Step 1: Business Profile (COMPLETED) */}
            <div className="relative z-10 flex flex-col items-center group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-tertiary/15 border-2 border-tertiary text-tertiary flex items-center justify-center font-headline font-semibold text-sm shadow-[0_0_16px_rgba(34,197,94,0.3)]">
                <span className="material-symbols-outlined text-[20px]">check</span>
              </div>
              <div className="mt-2 text-center">
                <span className="block text-xs font-semibold text-white">Business Profile</span>
                <span className="block text-[10px] text-tertiary font-medium">Completed</span>
              </div>
            </div>

            {/* Step 2: Opening Balance (ACTIVE) */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary p-[2px] shadow-[0_0_24px_rgba(236,72,153,0.35)] ring-4 ring-primary/20">
                <div className="w-full h-full rounded-full bg-surface flex items-center justify-center text-white font-headline font-bold text-sm">
                  2
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="block text-xs font-bold text-white tracking-wide">Opening Balance</span>
                <span className="block text-[10px] text-secondary font-semibold uppercase tracking-wider">In Progress</span>
              </div>
            </div>

            {/* Step 3: Connect Courier (UPCOMING) */}
            <div className="relative z-10 flex flex-col items-center opacity-65">
              <div className="w-10 h-10 rounded-full bg-surface-container border border-white/10 text-on-surface-variant flex items-center justify-center font-headline font-medium text-sm">
                3
              </div>
              <div className="mt-2 text-center">
                <span className="block text-xs font-medium text-on-surface-variant">Connect Courier</span>
                <span className="block text-[10px] text-on-surface-variant/60">Steadfast • Pathao</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Card Surface (Step 2 - Opening Balance Form) */}
        <div className="w-full bg-surface-container-low border border-white/[0.09] shadow-2xl rounded-2xl p-6 sm:p-9 relative overflow-hidden backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-6 border-b border-white/[0.06]">
            <div>
              <h2 className="font-headline font-bold text-lg text-white flex items-center gap-2">
                <span>Financial Baseline Metrics</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-white/[0.05] text-white/70 border border-white/10">
                  BDT (৳) Currency
                </span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Input verified initial valuations from your existing physical inventory, pending retail dues, and lender records.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tertiary/10 border border-tertiary/20 text-tertiary text-xs font-medium shrink-0">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>One-time ledger setup</span>
            </div>
          </div>

          {error && (
            <div className="my-4 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            {/* Field 0: Business Name */}
            <div>
              <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5 mb-1.5">
                <span>Store / Business Name</span>
                <span className="text-secondary font-bold">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Retail Ltd"
                className="w-full h-11 px-4 rounded-xl bg-surface-container border border-white/[0.08] text-white text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            {/* Field 1: Starting Inventory Value */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                  <span>Starting Inventory Value</span>
                  <span className="text-secondary font-bold">*</span>
                </label>
                <span className="text-[11px] text-on-surface-variant">Warehouse & outlet purchase valuation</span>
              </div>
              <div className="rounded-xl flex items-center px-4 py-3 bg-surface-container border border-white/[0.08] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="font-headline font-bold text-lg text-white/80">৳</span>
                  <span className="w-px h-5 bg-white/10"></span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={totalStockValue || ''}
                  onChange={(e) => setTotalStockValue(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent border-0 px-3 text-white font-headline font-semibold text-lg focus:outline-none"
                />
                <div className="text-[11px] font-mono bg-white/[0.04] text-white/60 px-2 py-1 rounded border border-white/5 shrink-0">
                  Wholesale Cost
                </div>
              </div>
            </div>

            {/* Field 2 & 3: Total Dues & Total Loans */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                    <span>Customer Dues (Receivable)</span>
                  </label>
                  <span className="text-[11px] text-tertiary">Money owed to you</span>
                </div>
                <div className="rounded-xl flex items-center px-4 py-3 bg-surface-container border border-white/[0.08] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <span className="font-headline font-bold text-lg text-tertiary">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={totalReceivable || ''}
                    onChange={(e) => setTotalReceivable(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-transparent border-0 px-3 text-white font-headline font-semibold text-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                    <span>Supplier Loans (Payable)</span>
                  </label>
                  <span className="text-[11px] text-error">Money you owe</span>
                </div>
                <div className="rounded-xl flex items-center px-4 py-3 bg-surface-container border border-white/[0.08] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <span className="font-headline font-bold text-lg text-error">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={totalPayable || ''}
                    onChange={(e) => setTotalPayable(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-transparent border-0 px-3 text-white font-headline font-semibold text-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex items-center justify-between gap-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="text-xs text-on-surface-variant hover:text-white transition-colors"
              >
                Skip for now
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-white font-semibold text-xs shadow-lg shadow-primary-container/20 hover:brightness-110 active:scale-95 transition"
              >
                {loading ? 'Saving Baseline...' : 'Save Baseline & Open Dashboard →'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-6 text-center text-xs text-on-surface-variant/50 relative z-10 border-t border-white/[0.04]">
        Nexus Flow Enterprise B2B Engine v4.8.2 • Multi-Node Isolated
      </footer>
    </div>
  );
}
