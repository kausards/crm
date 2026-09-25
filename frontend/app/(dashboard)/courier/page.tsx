'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, ShieldCheck, Key, Copy, Check, ExternalLink } from 'lucide-react';
import { fetchApi, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface CourierCredRow {
  id: string;
  provider: 'steadfast' | 'pathao' | 'redx';
  is_active: boolean;
  created_at: string;
}

export default function CourierPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'steadfast' | 'pathao' | 'redx'>('steadfast');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Fetch active courier connections
  const { data: creds, isLoading } = useQuery<CourierCredRow[]>({
    queryKey: ['courier-creds'],
    queryFn: () => fetchApi('/api/v1/courier/credentials'),
  });

  // Save credentials mutation
  const saveMutation = useMutation({
    mutationFn: (body: unknown) =>
      fetchApi('/api/v1/courier/credentials', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast(`${selectedProvider.toUpperCase()} API credentials encrypted and connected!`, 'success');
      setConfigureModalOpen(false);
      setApiKey('');
      setApiSecret('');
      queryClient.invalidateQueries({ queryKey: ['courier-creds'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to save credentials', 'error');
    },
  });

  const connectedMap = new Map((creds || []).map((c) => [c.provider, c]));

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  const copyWebhookUrl = (provider: string) => {
    const url = `${appOrigin}/api/v1/courier/webhook/${provider}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(provider);
    toast(`Copied ${provider} webhook URL to clipboard!`, 'info');
    setTimeout(() => setCopiedUrl(null), 3000);
  };

  const handleOpenConfig = (provider: 'steadfast' | 'pathao' | 'redx') => {
    setSelectedProvider(provider);
    setApiKey('');
    setApiSecret('');
    setConfigureModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      provider: selectedProvider,
      api_key: apiKey,
      api_secret: apiSecret || undefined,
    });
  };

  const courierConfigs = [
    {
      id: 'steadfast' as const,
      name: 'Steadfast Courier',
      badge: 'Most Popular in BD',
      desc: 'Automated consignment dispatch, status sync, and phone number return-risk fraud check.',
      secretRequired: true,
      secretLabel: 'Secret Key',
    },
    {
      id: 'pathao' as const,
      name: 'Pathao Courier',
      badge: 'Same-day / Express',
      desc: 'Direct integration with Pathao merchant API for automated parcel dispatch across Bangladesh.',
      secretRequired: true,
      secretLabel: 'Client Secret',
    },
    {
      id: 'redx' as const,
      name: 'RedX Logistics',
      badge: 'Wide Coverage',
      desc: 'Parcel tracking and automatic order status updates via RedX logistics API.',
      secretRequired: false,
      secretLabel: 'API Secret (Optional)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Courier Integrations & Tracking
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Connect your courier API keys securely with AES-256-GCM encryption at rest.
        </p>
      </div>

      {/* Courier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courierConfigs.map((c) => {
          const isConnected = connectedMap.has(c.id);
          const cred = connectedMap.get(c.id);

          return (
            <div
              key={c.id}
              className={`bg-slate-900/90 border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all ${
                isConnected
                  ? 'border-emerald-500/40 bg-gradient-to-b from-slate-900 to-emerald-950/20'
                  : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200">
                    <Truck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {c.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">{c.name}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {c.desc}
                </p>

                {isConnected && (
                  <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Connected & Encrypted (Added {formatDate(cred?.created_at)})
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                <Button
                  variant={isConnected ? 'secondary' : 'primary'}
                  size="sm"
                  className="w-full"
                  onClick={() => handleOpenConfig(c.id)}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isConnected ? 'Update API Credentials' : 'Connect API'}</span>
                </Button>

                {/* Webhook copy */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>IPN Webhook URL:</span>
                    <button
                      onClick={() => copyWebhookUrl(c.id)}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      {copiedUrl === c.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    {`${appOrigin}/api/v1/courier/webhook/${c.id}`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Guarantee Banner */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-3 text-xs text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <strong className="text-white">Encrypted-At-Rest Guarantee:</strong> Courier API Keys and Secrets are encrypted with military-grade AES-256-GCM using unique per-tenant initialization vectors (IV) and authentication tags. Plaintext keys are never stored or logged in plain text.
        </div>
      </div>

      {/* Configuration Modal */}
      <Modal
        isOpen={configureModalOpen}
        onClose={() => setConfigureModalOpen(false)}
        title={`Configure ${selectedProvider.toUpperCase()} Credentials`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Enter your API credentials from your {selectedProvider} merchant dashboard:
          </p>

          <Input
            id="courier-api-key"
            label="API Key / Token"
            placeholder="e.g. stf_live_xxxx or auth_token"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />

          <Input
            id="courier-secret-key"
            label="API Secret / Client Secret"
            placeholder="e.g. secret_key_xxxx"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfigureModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saveMutation.isPending}
            >
              Encrypt & Save Credentials
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
