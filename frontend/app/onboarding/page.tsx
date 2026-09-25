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
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
          Step 2 of 2: Baseline Accounting
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Configure Opening Balances
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter your current inventory value and ledger balances for accurate profit/loss calculation. You can leave these as 0 if starting fresh.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium">
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
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Skip for now
              </button>

              <Button
                id="onboarding-submit-button"
                type="submit"
                variant="primary"
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
