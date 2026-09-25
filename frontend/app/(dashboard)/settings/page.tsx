'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Settings, Shield, CreditCard, UserPlus, CheckCircle, XCircle, Copy, Check } from 'lucide-react';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useAuth, useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
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
      toast('Staff member invited successfully!', 'success');
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
    toast('Temporary password copied!', 'info');
    setTimeout(() => setCopiedPass(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Settings & Subscription
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Manage store profile, team members, and billing plans
        </p>
      </div>

      {/* Payment Success / Failed Alerts */}
      {paymentStatus === 'success' && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center gap-3 text-emerald-200 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <strong className="text-white">Payment Confirmed:</strong> Your SSLCommerz transaction was verified and your Pro plan is activated.
          </div>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl flex items-center gap-3 text-rose-200 text-sm">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <strong className="text-white">Payment Cancelled or Failed:</strong> The transaction could not be completed. You can re-try below.
          </div>
        </div>
      )}

      {/* Store Profile Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Store Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Store / Business Name</span>
            <span className="font-bold text-white text-sm">{user?.business_name}</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Owner Account</span>
            <span className="font-bold text-white text-sm">{user?.full_name}</span>
            <span className="text-slate-400 block text-[11px] truncate">{user?.email}</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Current Subscription</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {user?.plan || 'PRO'} PLAN
              </span>
              <span className="text-emerald-400 text-xs">● Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            SaaS Subscription Plans (SSLCommerz Gateway)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Accepts bKash, Nagad, Rocket, DBBL Nexus, and all major Bangladeshi bank debit/credit cards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Plan */}
          <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-white text-base">Basic Plan</h4>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Starter
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                ৳ 999 <span className="text-xs text-slate-400 font-normal">/ month</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li>✓ Up to 500 orders / month</li>
                <li>✓ Steadfast courier dispatch</li>
                <li>✓ Basic Inventory tracking</li>
                <li>✓ Single user access</li>
              </ul>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-6"
              isLoading={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate('basic')}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Select Basic (৳999)</span>
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="p-5 bg-gradient-to-b from-slate-900 to-emerald-950/30 border border-emerald-500/40 rounded-2xl flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-white text-base">Pro Plan</h4>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Recommended
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                ৳ 2,499 <span className="text-xs text-slate-400 font-normal">/ month</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li>✓ Unlimited orders & products</li>
                <li>✓ Steadfast + Pathao + RedX Couriers</li>
                <li>✓ Fraud / High Return screening</li>
                <li>✓ Deterministic Profit & Loss engine</li>
                <li>✓ Staff management & attendance payroll</li>
                <li>✓ Monthly Excel report export</li>
              </ul>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="w-full mt-6"
              isLoading={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate('pro')}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Subscribe Pro with SSLCommerz (৳2,499)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Team & Staff Management (Owner only) */}
      {isOwner && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Store Staff & Permissions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Staff members can create orders and update stock, but cannot view P&L, salaries, or courier API keys.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setInvitedResult(null);
                setInviteModalOpen(true);
              }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Staff Member</span>
            </Button>
          </div>
        </div>
      )}

      {/* Invite Staff Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Staff Member"
        maxWidth="md"
      >
        {invitedResult ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs space-y-2">
              <span className="font-bold text-emerald-300 block text-sm">
                Staff Account Created!
              </span>
              <p className="text-slate-300">
                Share these temporary login credentials with your staff member:
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div>Email: <strong className="text-white">{invitedResult.email}</strong></div>
                <div className="flex items-center justify-between">
                  <span>Password: <strong className="text-emerald-400 font-mono">{invitedResult.tempPassword}</strong></span>
                  <button
                    onClick={copyPassword}
                    className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1"
                  >
                    {copiedPass ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPass ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => setInviteModalOpen(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <Input
              label="Staff Full Name"
              placeholder="e.g. Mehedi Hasan"
              value={inviteFullName}
              onChange={(e) => setInviteFullName(e.target.value)}
              required
            />

            <Input
              type="email"
              label="Staff Email Address"
              placeholder="staff@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={inviteMutation.isPending}
              >
                Send Invite & Generate Password
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
    <Suspense fallback={<div className="py-20 text-center text-xs text-slate-500">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
