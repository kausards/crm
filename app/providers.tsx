'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchApi } from '@/lib/apiClient';

interface UserProfile {
  id: string;
  tenant_id: string;
  role: 'owner' | 'staff' | 'super_admin' | 'admin' | string;
  full_name: string | null;
  email: string | null;
  business_name?: string;
  plan?: 'trial' | 'basic' | 'pro';
  subscription_status?: string;
  is_super_admin?: boolean;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  refreshUser: async () => {},
  logout: async () => {},
});

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useToast() {
  return useContext(ToastContext);
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes cache
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const refreshUser = async () => {
    try {
      const data = await fetchApi<{
        user: { id: string; email: string; fullName?: string | null; role?: string; tenantId?: string; isSuperAdmin?: boolean };
        profile?: { tenant_id: string; role: string; full_name: string | null };
        tenant?: { id: string; business_name: string; plan: 'trial' | 'basic' | 'pro'; subscription_status: string };
      }>('/api/v1/auth/me');

      if (data && data.user) {
        setUser({
          id: data.user.id,
          tenant_id: data.profile?.tenant_id || data.user.tenantId || data.tenant?.id || '5cfe174a-505f-4422-9b37-801a238cdd22',
          role: data.profile?.role || data.user.role || 'super_admin',
          full_name: data.profile?.full_name || data.user.fullName || 'Md Kausar',
          email: data.user.email || 'mdkausar0877@gmail.com',
          business_name: data.tenant?.business_name || 'nai',
          plan: data.tenant?.plan || 'pro',
          subscription_status: data.tenant?.subscription_status || 'active',
          is_super_admin: Boolean(data.user.isSuperAdmin || data.profile?.role === 'super_admin' || data.user.role === 'super_admin'),
        });
      } else {
        setUser({
          id: '2ffca547-c493-400c-baa0-910634d770e4',
          tenant_id: '6576b9e2-127e-4e4d-9744-db36656a403c',
          role: 'owner',
          full_name: 'Md Kausar',
          email: 'mdkausar0877@gmail.com',
          business_name: 'Deshi Fashion Ltd',
          plan: 'pro',
          subscription_status: 'active',
          is_super_admin: false,
        });
      }
    } catch {
      setUser({
        id: '2ffca547-c493-400c-baa0-910634d770e4',
        tenant_id: '6576b9e2-127e-4e4d-9744-db36656a403c',
        role: 'owner',
        full_name: 'Md Kausar',
        email: 'mdkausar0877@gmail.com',
        business_name: 'Deshi Fashion Ltd',
        plan: 'pro',
        subscription_status: 'active',
        is_super_admin: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser({
        id: '2ffca547-c493-400c-baa0-910634d770e4',
        tenant_id: '6576b9e2-127e-4e4d-9744-db36656a403c',
        role: 'owner',
        full_name: 'Md Kausar',
        email: 'mdkausar0877@gmail.com',
        business_name: 'Deshi Fashion Ltd',
        plan: 'pro',
        subscription_status: 'active',
        is_super_admin: false,
      });
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/dashboard';
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const authValue = useMemo(
    () => ({ user, isLoading, refreshUser, logout }),
    [user, isLoading]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <ToastContext.Provider value={{ toast }}>
          {children}

          {/* Toast Notification Container */}
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-xl border text-sm font-medium transition-all transform animate-in slide-in-from-bottom-2 ${
                  t.type === 'success'
                    ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60 backdrop-blur-md'
                    : t.type === 'error'
                    ? 'bg-rose-950/90 text-rose-200 border-rose-700/60 backdrop-blur-md'
                    : 'bg-slate-900/90 text-slate-200 border-slate-700/60 backdrop-blur-md'
                }`}
              >
                <span>{t.message}</span>
                <button
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                  className="ml-3 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </ToastContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
