'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
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
  Edit2,
  Globe,
} from 'lucide-react';
import { fetchApi } from '@/lib/apiClient';
import { useAuth, useToast } from '@/app/providers';

// Shadcn imports
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Input } from '@/components/ui/shadcn/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/shadcn/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";

// Old UI components
import { Modal } from '@/components/ui/Modal';
import { Input as FormInput } from '@/components/ui/Input';

function SettingsContent() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const isOwner =
    !user?.role ||
    user?.role === 'owner' ||
    user?.role === 'super_admin' ||
    user?.role === 'admin' ||
    Boolean((user as any)?.is_super_admin);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [bizNameInput, setBizNameInput] = useState('');

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedResult, setInvitedResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const handleOpenProfileModal = () => {
    setFullNameInput(user?.full_name || '');
    setBizNameInput(user?.business_name || '');
    setProfileModalOpen(true);
  };

  const updateProfileMutation = useMutation({
    mutationFn: (body: { full_name?: string; business_name?: string }) =>
      fetchApi('/api/v1/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Profile & Business details updated!', 'success');
      setProfileModalOpen(false);
      refreshUser();
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
    },
  });

  useEffect(() => {
    if (paymentStatus === 'success') {
      toast('Payment successful! Your store subscription is now active.', 'success');
      refreshUser();
    } else if (paymentStatus === 'failed') {
      toast('Payment was cancelled or failed. Please try again.', 'error');
    }
  }, [paymentStatus, refreshUser, toast]);

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
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 pb-14 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your account, team, and billing settings.
          </p>
        </div>

        {isOwner && (
          <Button
            onClick={() => setInviteModalOpen(true)}
            className="self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
        )}
      </div>

      {/* Payment Alerts */}
      {paymentStatus === 'success' && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <strong className="font-semibold">Subscription Active:</strong> Your SSLCommerz transaction was confirmed.
          </div>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm">
          <X className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <strong className="font-semibold">Payment Cancelled:</strong> The transaction could not be processed.
          </div>
        </div>
      )}

      {/* Store Profile Bento */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <CardTitle>Store Profile</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenProfileModal}
          >
            <Edit2 className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            Edit Profile
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 border">
              <span className="text-muted-foreground font-medium block mb-1 text-xs">Business Name</span>
              <span className="font-semibold text-foreground text-base">
                {user?.business_name || 'Apex Retail Ltd'}
              </span>
              <span className="text-muted-foreground block text-[11px] mt-1 font-mono truncate">
                ID: {user?.tenant_id?.slice(0, 16)}...
              </span>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border">
              <span className="text-muted-foreground font-medium block mb-1 text-xs">Owner</span>
              <span className="font-semibold text-foreground text-base">
                {user?.full_name || 'Admin'}
              </span>
              <span className="text-muted-foreground block text-xs truncate mt-1">
                {user?.email}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border">
              <span className="text-muted-foreground font-medium block mb-1 text-xs">Active Plan</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px] font-bold uppercase tracking-widest">
                  {currentPlan}
                </Badge>
                <span className="text-emerald-600 dark:text-emerald-500 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <span className="text-muted-foreground block text-[11px] mt-1.5">Monthly SSLCommerz billing</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Website & Store Integration Card */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-muted border flex items-center justify-center text-muted-foreground shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold">
              Website & Store Connections
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect your external store platforms to receive orders directly.
            </p>
          </div>
        </div>

        <Link
          href="/integrations"
          className="shrink-0"
        >
          <Button variant="outline">
            Manage Integrations
            <ExternalLink className="w-4 h-4 ml-2 text-muted-foreground" />
          </Button>
        </Link>
      </Card>

      {/* Subscription Tiers */}
      <div>
        <div className="mb-5">
          <h3 className="font-semibold text-lg">
            Subscription Plans
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Instant automated upgrades via SSLCommerz (bKash, Nagad, Cards).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Starter Plan */}
          <Card className={`flex flex-col justify-between transition-all ${
            currentPlan === 'basic' ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : ''
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Starter Plan
                </span>
                {currentPlan === 'basic' && (
                  <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">Current Plan</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-2 mb-5">
                <span className="text-4xl font-bold">৳999</span>
                <span className="text-sm text-muted-foreground font-medium">/ month</span>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground mb-8 font-medium">
                <li className="flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-foreground">Single branch & outlet</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-foreground">Up to 500 monthly orders</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-foreground">Auto-dispatch (Steadfast)</span>
                </li>
                <li className="flex items-center gap-2.5 text-muted-foreground/60">
                  <X className="w-5 h-5 shrink-0" />
                  <span className="line-through">Multi-courier routing</span>
                </li>
              </ul>
            </CardContent>

            <div className="p-6 pt-0 mt-auto">
              <Button
                variant={currentPlan === 'basic' ? 'secondary' : 'outline'}
                className="w-full"
                disabled={checkoutMutation.isPending || currentPlan === 'basic'}
                onClick={() => checkoutMutation.mutate('basic')}
              >
                {currentPlan === 'basic' ? 'Active Plan' : 'Downgrade to Starter'}
              </Button>
            </div>
          </Card>

          {/* Pro Plan */}
          <Card className={`flex flex-col justify-between relative overflow-hidden bg-indigo-900 border-indigo-800 text-white ${
            currentPlan === 'pro' ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-background' : ''
          }`}>
            <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              Recommended
            </div>

            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 mt-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Enterprise Pro
                </span>
                {currentPlan === 'pro' && (
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">Active Subscription</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-2 mb-5">
                <span className="text-4xl font-bold">৳2,499</span>
                <span className="text-sm text-indigo-300 font-medium">/ month</span>
              </div>
              <ul className="space-y-3 text-sm text-indigo-100 mb-8 font-medium">
                <li className="flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Unlimited orders & catalog SKUs</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Multi-courier sync</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Fraud protection</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Daily backups & priority support</span>
                </li>
              </ul>
            </CardContent>

            <div className="p-6 pt-0 mt-auto">
              <Button
                onClick={() => checkoutMutation.mutate('pro')}
                disabled={checkoutMutation.isPending}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                {checkoutMutation.isPending
                  ? 'Connecting Gateway...'
                  : currentPlan === 'pro'
                  ? 'Renew / Extend Subscription'
                  : 'Upgrade to Enterprise Pro'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Team & Access Control */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border">
                <Users className="w-5 h-5" />
              </div>
              <CardTitle>Team Members & Access</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Role-based access control with isolated tenant boundaries.
            </CardDescription>
          </div>

          {isOwner && (
            <Button
              variant="outline"
              onClick={() => setInviteModalOpen(true)}
              className="shrink-0"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Staff
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
                        {(user?.full_name || 'A').slice(0, 1)}
                      </div>
                      <span>{user?.full_name || 'Admin'} (You)</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user?.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">
                      {user?.role || 'Owner'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">Full Super Admin & Billing Control</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 uppercase tracking-widest text-[10px]">Active</Badge>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted border text-muted-foreground font-bold flex items-center justify-center text-sm">
                        T
                      </div>
                      <span>Tariqul Islam</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">tariqul@apexretail.bd</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 uppercase tracking-widest text-[10px]">Staff</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">Order fulfillment & inventory edit</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 uppercase tracking-widest text-[10px]">Active</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
          <div className="space-y-5 mt-2">
            <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm space-y-3">
              <p className="font-semibold text-emerald-700 dark:text-emerald-500">Invitation Generated</p>
              <p className="text-emerald-600 dark:text-emerald-400/80 leading-relaxed">
                Share this temporary password with <strong className="text-foreground">{invitedResult.email}</strong>. They must change it upon first login.
              </p>
              <div className="p-3 bg-background rounded-lg border flex items-center justify-between shadow-sm mt-4">
                <span className="font-mono text-base font-bold">{invitedResult.tempPassword}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPassword}
                  className="text-emerald-600 border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 h-8"
                >
                  {copiedPass ? <CheckCheck className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedPass ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
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
          <form onSubmit={handleInviteSubmit} className="space-y-4 mt-2">
            <FormInput
              label="Full Name"
              placeholder="e.g. Shakib Al Hasan"
              value={inviteFullName}
              onChange={(e) => setInviteFullName(e.target.value)}
              required
            />

            <FormInput
              label="Email Address"
              type="email"
              placeholder="shakib@apexretail.bd"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setInviteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
              >
                Create Staff Account
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Profile & Business Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Edit Store Profile"
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfileMutation.mutate({
              full_name: fullNameInput,
              business_name: isOwner ? bizNameInput : undefined,
            });
          }}
          className="space-y-4 mt-2"
        >
          <FormInput
            label="Full Name (Account Owner)"
            placeholder="e.g. Md Kausar"
            value={fullNameInput}
            onChange={(e) => setFullNameInput(e.target.value)}
            required
          />

          {isOwner ? (
            <FormInput
              label="Business / Store Name"
              placeholder="e.g. Apex Retail Ltd"
              value={bizNameInput}
              onChange={(e) => setBizNameInput(e.target.value)}
              required
            />
          ) : (
            <div className="p-4 rounded-xl bg-muted/50 border text-sm">
              <span className="text-muted-foreground font-medium block mb-1 text-xs">Business Name</span>
              <span className="font-semibold">{user?.business_name}</span>
              <span className="block text-xs text-muted-foreground mt-2">
                Only account owners can change store branding.
              </span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-muted/50 border text-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Registered Email:</span>
              <span className="font-semibold">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Tenant ID:</span>
              <span className="font-mono text-muted-foreground text-xs truncate max-w-[200px]">
                {user?.tenant_id}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setProfileModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full p-8 text-sm text-muted-foreground">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
