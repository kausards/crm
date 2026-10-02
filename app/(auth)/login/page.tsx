'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Zap, TrendingUp, DollarSign, Truck, Star, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth, useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr || !data.user) {
        throw new Error(authErr?.message || 'Invalid email or password');
      }

      await refreshUser();
      toast('Login successful! Welcome back.', 'success');
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 font-body relative overflow-x-hidden flex flex-col justify-between selection:bg-brand-violet/30 selection:text-white">
      {/* Ambient Blurred Radial Glow Orbs */}
      <div className="fixed -top-24 -left-24 w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[140px] pointer-events-none z-0" />
      <div className="fixed -bottom-24 -right-12 w-[550px] h-[550px] rounded-full bg-pink-500/10 blur-[150px] pointer-events-none z-0" />
      <div className="fixed top-1/2 right-1/3 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none z-0" />

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
              CRM OS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-label text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dhaka Core v3.4 Active</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Brand Story & Live Bento Stats */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-7 pr-0 lg:pr-4">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md w-max shadow-sm">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
              <span className="text-xs font-headline font-medium tracking-wide text-slate-300">
                Bangladesh E-Commerce OS
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-pink-500/15 text-pink-400 rounded-md border border-pink-500/25 font-bold">
                Multi-Tenant
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-extrabold text-white tracking-tight leading-[1.15]">
                The Operating System for Modern Commerce in{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-pink-500">
                  Bangladesh
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl font-body">
                Automated multi-courier dispatch with Pathao, Steadfast & RedX, bKash & Nagad reconciliation, and zero-latency inventory tracking.
              </p>
            </div>

            {/* Live Bento Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="glass-card p-4 relative overflow-hidden group hover:border-violet-500/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-label uppercase tracking-wider text-slate-400 font-medium">Active Stores</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-xl font-headline font-bold text-white tracking-tight">2,400+</div>
                <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +38% MoM GMV
                </div>
              </div>

              <div className="glass-card p-4 relative overflow-hidden group hover:border-pink-500/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-label uppercase tracking-wider text-slate-400 font-medium">Monthly GMV</span>
                  <DollarSign className="w-3.5 h-3.5 text-pink-400" />
                </div>
                <div className="text-xl font-headline font-bold text-white tracking-tight">৳ 14.8 Cr+</div>
                <div className="text-[11px] text-slate-400 font-mono mt-1">bKash · Nagad · COD</div>
              </div>

              <div className="glass-card p-4 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-label uppercase tracking-wider text-slate-400 font-medium">Fulfillment</span>
                  <Truck className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-headline font-bold text-white tracking-tight">99.4%</div>
                <div className="text-[11px] text-cyan-400 font-label mt-1">Pathao · Steadfast · RedX</div>
              </div>
            </div>

            {/* Testimonial pill */}
            <div className="glass-card p-4 flex items-center gap-3.5 border-l-4 border-l-violet-500 max-w-xl">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-slate-200 font-headline font-bold text-xs shrink-0">
                AR
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-amber-400 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400" />
                  ))}
                  <span className="text-[10px] font-mono text-slate-400 ml-1.5">Banani, Dhaka</span>
                </div>
                <p className="text-xs text-slate-300 italic truncate">
                  &ldquo;Reduced our courier RTO return rates by 42% in 30 days.&rdquo;
                </p>
                <p className="text-[11px] text-slate-400 font-label">
                  — <span className="text-slate-200 font-medium">Adnan Rahman</span>, Lustre Lifestyle
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Glass Login Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="glass-card-elevated p-7 sm:p-9 relative overflow-hidden">
              {/* Subtle top accent gradient */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-pink-500" />
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-violet-500/20 blur-2xl pointer-events-none" />

              <div className="text-center mb-6">
                <h2 className="text-2xl font-headline font-bold text-white tracking-tight">Sign In</h2>
                <p className="text-xs text-slate-400 font-body mt-1">Access your store console & live pulse</p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-label font-medium uppercase tracking-wider text-slate-300">
                    Work Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="merchant@yourstore.com"
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
                      id="login-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <Button
                  id="login-submit-button"
                  type="submit"
                  variant="primary"
                  className="w-full mt-3 h-11 text-sm font-semibold gap-2"
                  isLoading={loading}
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-slate-400">
                New merchant on NexusFlow?{' '}
                <Link href="/signup" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
                  Create store account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-4 text-center text-[11px] text-slate-500 font-mono">
        Secured by 256-bit SSL · Bangladesh Bank Compliant Core · © 2026 NexusFlow Inc.
      </footer>
    </div>
  );
}
