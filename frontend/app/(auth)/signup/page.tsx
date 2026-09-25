'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useToast } from '@/app/providers';
import { fetchApi } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
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
      toast('Store account created! Let’s complete initial setup.', 'success');
      router.push('/onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center text-emerald-400 text-2xl mb-4">
          ⚡
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Create Store Account
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Start your 14-day free trial • No credit card required
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="signup-business-name"
              label="Store / Business Name"
              placeholder="e.g. Dhaka Trends"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />

            <Input
              id="signup-full-name"
              label="Owner Full Name"
              placeholder="e.g. Tanvir Ahmed"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              id="signup-email"
              type="email"
              label="Email Address"
              placeholder="owner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="signup-password"
              type="password"
              label="Password (min 8 chars)"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />

            <Button
              id="signup-submit-button"
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={loading}
            >
              Create Account & Start Trial
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
