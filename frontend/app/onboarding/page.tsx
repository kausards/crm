'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useToast } from '@/app/providers';
import { fetchApi } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState(user?.business_name || '');
  const [totalStockValue, setTotalStockValue] = useState<number>(0);
  const [totalReceivable, setTotalReceivable] = useState<number>(0);
  const [totalPayable, setTotalPayable] = useState<number>(0);
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
    <div className="min-h-screen bg-[#0B0810] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow Halos */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-violet/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-brand-magenta/15 blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-violet/20 border border-brand-violet/40 text-purple-200 text-xs font-semibold mb-3 shadow-glow-violet">
          Step 2 of 2: Baseline Accounting
        </div>
        <h1 className="font-sora text-3xl font-bold tracking-tight text-white">
          Configure Opening Balances
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter your current inventory value and ledger balances for accurate profit/loss calculation. You can leave these as 0 if starting fresh.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-[#15121A]/90 border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-glow-card backdrop-blur-2xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="onboarding-business-name"
              label="Store / Business Name"
              value={businessName}
              placeholder="e.g. Trendy Outfit BD"
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="onboarding-stock-value"
                type="number"
                min="0"
                step="1"
                label="Opening Stock Value (৳)"
                helperText="Total wholesale cost of existing inventory"
                value={totalStockValue || ''}
                placeholder="0"
                onChange={(e) => setTotalStockValue(Number(e.target.value))}
              />

              <Input
                id="onboarding-receivable"
                type="number"
                min="0"
                step="1"
                label="Total Receivable / Customer Dues (৳)"
                helperText="Money customers or dealers currently owe you"
                value={totalReceivable || ''}
                placeholder="0"
                onChange={(e) => setTotalReceivable(Number(e.target.value))}
              />
            </div>

            <Input
              id="onboarding-payable"
              type="number"
              min="0"
              step="1"
              label="Total Payable / Supplier Loans (৳)"
              helperText="Money you currently owe suppliers or external lenders"
              value={totalPayable || ''}
              placeholder="0"
              onChange={(e) => setTotalPayable(Number(e.target.value))}
            />

            <div className="pt-2 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Skip for now
              </button>

              <Button
                id="onboarding-submit-button"
                type="submit"
                variant="primary"
                size="md"
                isLoading={loading}
              >
                Save & Open Dashboard →
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

