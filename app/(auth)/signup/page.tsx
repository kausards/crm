'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, User, Mail, Lock, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth, useToast } from '@/app/providers';
import { fetchApi } from '@/lib/apiClient';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await fetchApi('/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          businessName,
          fullName,
          email,
          password,
        }),
      });

      await refreshUser();
      toast('Store account created! Welcome to NexusFlow.', 'success');
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 font-body relative overflow-x-hidden flex flex-col justify-between selection:bg-brand-violet/30 selection:text-white">
      {/* Ambient Radial Glows */}
      <div className="fixed -top-24 -left-24 w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[140px] pointer-events-none z-0" />
      <div className="fixed -bottom-24 -right-12 w-[550px] h-[550px] rounded-full bg-pink-500/10 blur-[150px] pointer-events-none z-0" />

      {/* Grid Pattern */}
      <div className="fixed inset-0 bg-grid-pattern opacity-60 pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 w-full px-6 lg:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-600 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <div className="w-full h-full bg-[#070709] rounded-[10px] flex items-center justify-center">
              <Zap className="w-4 h-4 text-violet-400 fill-violet-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-headline font-bold text-lg text-slate-100 tracking-tight">NexusFlow</span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Registration
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-label text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Instant Provisioning</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Feature highlights */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-headline font-extrabold text-white tracking-tight leading-tight">
                Scale your store with precision automation.
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-body">
                Automated order routing, courier tracking, and double-entry P&L accounting built specifically for Bangladeshi merchants.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { title: 'Pathao, Steadfast & RedX', desc: 'Auto consignment booking and live delivery updates' },
                { title: 'Deterministic P&L Ledger', desc: 'Real profit calculations including product COGS, staff and returns' },
                { title: 'বাকির খাতা (Credit Management)', desc: 'Zero manual bookkeeping for customer dues and supplier loans' },
              ].map((feat, idx) => (
                <div key={idx} className="glass-card p-4 flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-headline font-semibold text-slate-200">{feat.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 font-body">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Signup Glass Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="glass-card-elevated p-7 sm:p-9 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-pink-500" />
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-violet-500/20 blur-2xl pointer-events-none" />

              <div className="text-center mb-6">
                <h2 className="text-2xl font-headline font-bold text-white tracking-tight">Create Store Account</h2>
                <p className="text-xs text-slate-400 font-body mt-1">Get your merchant portal live in seconds</p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-label font-medium uppercase tracking-wider text-slate-300">
                    Business / Store Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Store className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Dhaka Attire Ltd"
                      className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-label font-medium uppercase tracking-wider text-slate-300">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Kausar Ahmed"
                      className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-label font-medium uppercase tracking-wider text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@dhakaattire.com"
                      className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-label font-medium uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-4 h-11 text-sm font-semibold gap-2"
                  isLoading={loading}
                >
                  <span>Launch Store</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-white/10 text-center text-xs text-slate-400">
                Already registered?{' '}
                <Link href="/login" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full px-6 py-4 text-center text-[11px] text-slate-500 font-mono">
        Secured by NexusFlow Cloud · Multi-Tenant Architecture
      </footer>
    </div>
  );
}
