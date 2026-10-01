'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Store,
  UserPlus,
  ShieldCheck,
  CreditCard,
  Check,
  X,
  Copy,
  CheckCheck,
  Sparkles,
  Users,
  KeyRound,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useAuth, useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

function SettingsContent() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === 'owner';

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedResult, setInvitedResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  useEffect(() => {
    if (paymentStatus === 'success') {
      toast('Payment successful! Your store subscription is now active.', 'success');
      refreshUser();
    } else if (paymentStatus === 'failed') {
      toast('Payment was cancelled or failed. Please try again.', 'error');
    }
  }, [paymentStatus]);

  // Billing Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: (plan: 'basic' | 'pro') =>
      fetchApi<{ paymentUrl: string }>('/api/v1/billing/initiate', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }),
    onSuccess: (data) => {
      if (data?.paymentUrl) {
        toast('Redirecting to SSLCommerz secure checkout...', 'info');
        window.location.href = data.paymentUrl;
      }
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to initiate checkout', 'error');
    },
  });

  // Invite Staff Mutation
  const inviteMutation = useMutation({
    mutationFn: (body: unknown) =>
      fetchApi<{ staff: { email: string; tempPassword: string } }>('/api/v1/auth/invite', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      toast('Team member invited successfully', 'success');
      setInvitedResult({
        email: data.staff.email,
        tempPassword: data.staff.tempPassword,
      });
      setInviteFullName('');
      setInviteEmail('');
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to invite staff', 'error');
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({
      fullName: inviteFullName,
      email: inviteEmail,
      role: 'staff',
    });
  };

  const copyPassword = () => {
    if (!invitedResult) return;
    navigator.clipboard.writeText(invitedResult.tempPassword);
    setCopiedPass(true);
    toast('Temporary password copied to clipboard', 'info');
    setTimeout(() => setCopiedPass(false), 2500);
  };

  const currentPlan = user?.plan || 'pro';

  return (
    <div className="flex flex-col w-full gap-7 max-w-[1400px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-violet animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-semibold">
              Organization & Access
            </span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Settings & Team
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage organization profile, team members, and your cloud subscription.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="btn-gradient-glow flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white"
            type="button"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {/* Payment Alerts */}
      {paymentStatus === 'success' && (
        <div className="p-4 glass-card border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <strong className="text-white font-semibold">Subscription Active:</strong> Your SSLCommerz transaction was confirmed.
          </div>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="p-4 glass-card border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
          <X className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <strong className="text-white font-semibold">Payment Cancelled:</strong> The transaction could not be processed.
          </div>
        </div>
      )}

      {/* Store Profile Bento */}
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center text-purple-300">
              <Store className="w-4 h-4" />
            </div>
            <h3 className="font-headline text-sm font-semibold text-white tracking-wide">
              Store Profile
            </h3>
          </div>
          <span className="badge-cyan text-[10px] font-semibold">
            Multi-Tenant Isolated
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
            <span className="text-slate-400 block mb-1 text-[11px]">Business Name</span>
            <span className="font-headline font-bold text-white text-base">
              {user?.business_name || 'Apex Retail Ltd'}
            </span>
            <span className="text-slate-500 block text-[10px] mt-1 font-mono truncate">
              ID: {user?.tenant_id?.slice(0, 16)}...
            </span>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
            <span className="text-slate-400 block mb-1 text-[11px]">Primary Account</span>
            <span className="font-headline font-bold text-white text-base">
              {user?.full_name || 'Admin'}
            </span>
            <span className="text-slate-400 block text-[11px] truncate mt-1 font-mono">
              {user?.email}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
            <span className="text-slate-400 block mb-1 text-[11px]">Active Plan</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge-purple text-[10px] font-bold uppercase">
                {currentPlan.toUpperCase()}
              </span>
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <span className="text-slate-500 block text-[10px] mt-1">Monthly SSLCommerz billing</span>
          </div>
        </div>
      </div>

      {/* Subscription Tiers */}
      <div>
        <div className="mb-4">
          <h3 className="font-headline text-base font-bold text-white tracking-tight">
            Subscription Plans
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Instant automated upgrade via SSLCommerz (bKash, Nagad, Cards)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Starter Plan */}
          <div
            className={`glass-card p-6 rounded-2xl flex flex-col justify-between relative transition-all ${
              currentPlan === 'basic' ? 'border-brand-violet/50 shadow-[0_0_24px_rgba(139,92,246,0.15)]' : ''
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Starter Plan
                </span>
                {currentPlan === 'basic' && (
                  <span className="badge-purple text-[10px] font-bold">Current Plan</span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="font-headline text-3xl font-bold text-white">৳999</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Single branch & outlet</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Up to 500 monthly orders</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Steadfast auto-dispatch gateway</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <X className="w-4 h-4 shrink-0" />
                  <span>Multi-courier routing</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => checkoutMutation.mutate('basic')}
              disabled={checkoutMutation.isPending || currentPlan === 'basic'}
              className="btn-glass w-full py-2.5 text-xs font-semibold text-slate-300 disabled:opacity-50"
              type="button"
            >
              {currentPlan === 'basic' ? 'Active Plan' : 'Downgrade to Starter'}
            </button>
          </div>

          {/* Pro Plan */}
          <div
            className={`glass-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden border-brand-violet/40 shadow-[0_0_30px_rgba(139,92,246,0.12)]`}
          >
            <div className="absolute top-0 right-0 bg-gradient-to-l from-brand-magenta to-brand-violet text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              Recommended
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                  Enterprise Pro
                </span>
                {currentPlan === 'pro' && (
                  <span className="badge-green text-[10px] font-bold">Active Subscription</span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="font-headline text-3xl font-bold text-white">৳2,499</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Unlimited orders & catalog SKUs</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Multi-Carrier Auto Sync (Steadfast + Pathao + RedX)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Fraud Shield with phone return blacklist</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Daily automated DB snapshots & priority support</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => checkoutMutation.mutate('pro')}
              disabled={checkoutMutation.isPending}
              className="btn-gradient-glow w-full py-2.5 text-xs font-semibold text-white"
              type="button"
            >
              {checkoutMutation.isPending
                ? 'Connecting Gateway...'
                : currentPlan === 'pro'
                ? 'Renew / Extend Subscription'
                : 'Upgrade to Enterprise Pro'}
            </button>
          </div>
        </div>
      </div>

      {/* Team & Access Control */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-300">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-headline text-sm font-semibold text-white tracking-wide">
                Team Members & Access
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Role-based access control with isolated tenant boundaries.
            </p>
          </div>

          {isOwner && (
            <button
              onClick={() => setInviteModalOpen(true)}
              className="btn-glass flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300"
              type="button"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Staff</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-slate-400 uppercase font-mono text-[10px] tracking-wider bg-white/[0.01]">
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Permissions Scope</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-violet to-brand-magenta text-white font-bold flex items-center justify-center text-xs">
                    {(user?.full_name || 'A').slice(0, 1)}
                  </div>
                  <span>{user?.full_name || 'Admin'} (You)</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400">{user?.email}</td>
                <td className="py-3.5 px-4">
                  <span className="badge-purple text-[10px] font-bold uppercase">
                    {user?.role || 'Owner'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-400">Full Super Admin & Billing Control</td>
                <td className="py-3.5 px-4 text-right">
                  <span className="badge-green text-[10px] font-semibold">Active</span>
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-300 font-bold flex items-center justify-center text-xs">
                    T
                  </div>
                  <span>Tariqul Islam</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400">tariqul@apexretail.bd</td>
                <td className="py-3.5 px-4">
                  <span className="badge-blue text-[10px] font-bold uppercase">Staff</span>
                </td>
                <td className="py-3.5 px-4 text-slate-400">Order fulfillment & inventory edit</td>
                <td className="py-3.5 px-4 text-right">
                  <span className="badge-green text-[10px] font-semibold">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setInvitedResult(null);
        }}
        title="Invite Team Member"
        maxWidth="md"
      >
        {invitedResult ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
              <p className="font-semibold text-emerald-400">Invitation Generated</p>
              <p className="text-slate-300">
                Share this temporary password with <strong>{invitedResult.email}</strong>. They must change it upon first login.
              </p>
              <div className="p-3 bg-black/60 rounded-xl border border-white/[0.08] flex items-center justify-between">
                <span className="font-mono text-sm text-white font-bold">{invitedResult.tempPassword}</span>
                <button
                  onClick={copyPassword}
                  className="px-3 py-1 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-xs font-semibold text-purple-300 hover:text-white transition flex items-center gap-1.5"
                  type="button"
                >
                  {copiedPass ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPass ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              type="button"
              onClick={() => {
                setInviteModalOpen(false);
                setInvitedResult(null);
              }}
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Shakib Al Hasan"
              value={inviteFullName}
              onChange={(e) => setInviteFullName(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="shakib@apexretail.bd"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setInviteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={inviteMutation.isPending}
              >
                Create Staff Account
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
