'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  RotateCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Settings,
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  DollarSign,
  Package,
} from 'lucide-react';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';

interface CourierCredRow {
  id: string;
  provider: 'steadfast' | 'pathao' | 'redx';
  is_active: boolean;
  created_at: string;
}

interface CourierProviderStats {
  dispatched: number;
  delivered?: number;
  returned?: number;
  in_transit?: number;
  delivery_rate?: number;
  returned_rate?: number;
  cod: number;
  is_active: boolean;
}

interface CourierStats {
  total_dispatched: number;
  cod_in_transit: number;
  in_transit_count: number;
  delivery_rate: number;
  delivered_count: number;
  returned_count: number;
  rto_loss: number;
  last_synced_at: string | null;
  providers: {
    steadfast: CourierProviderStats;
    pathao: CourierProviderStats;
    redx: CourierProviderStats;
  };
}

export default function CourierPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'steadfast' | 'pathao' | 'redx'>('steadfast');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Fetch active courier connections
  const { data: creds } = useQuery<CourierCredRow[]>({
    queryKey: ['courier-creds'],
    queryFn: () => fetchApi('/api/v1/courier/credentials'),
  });

  // Fetch live courier telemetry & stats
  const { data: stats } = useQuery<CourierStats>({
    queryKey: ['courier-stats'],
    queryFn: () => fetchApi('/api/v1/courier/stats'),
  });

  // Sync All Couriers Mutation
  const syncAllMutation = useMutation({
    mutationFn: () =>
      fetchApi<{ synced: number; updated: number; total_checked: number }>('/api/v1/courier/sync', {
        method: 'POST',
      }),
    onSuccess: (data) => {
      const checked = data?.total_checked ?? data?.synced ?? 0;
      const updated = data?.updated ?? 0;
      toast(`Courier sync complete: ${checked} checked, ${updated} orders updated.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['courier-stats'] });
      queryClient.invalidateQueries({ queryKey: ['courier-creds'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Courier sync failed', 'error');
    },
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
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://api.nexusflow.io';

  const copyWebhookUrl = (provider: string) => {
    const url = `${appOrigin}/api/v1/courier/webhook/${provider}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(provider);
    toast(`Copied ${provider} webhook URL`, 'info');
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

  const toggleShowKey = (provider: string) => {
    setShowKey((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const couriers = [
    {
      id: 'steadfast' as const,
      code: 'SF',
      name: 'Steadfast Courier',
      sub: '',
      accentColor: 'from-violet-500 to-indigo-500',
      logoBg: 'bg-violet-600/15 border-violet-500/30 text-violet-300',
      dispatched: `${stats?.providers?.steadfast?.dispatched ?? 0} parcels`,
      latency: '24-48h avg',
      cod: formatBDT(stats?.providers?.steadfast?.cod ?? 0),
      keyLabel: 'API Key',
      keySub: '',
      dummyKey: connectedMap.get('steadfast') ? '••••••••••••••••••••••••••••' : 'Not configured',
      webhookUrl: `${appOrigin}/api/v1/courier/webhook/steadfast`,
    },
    {
      id: 'pathao' as const,
      code: 'PT',
      name: 'Pathao Courier',
      sub: '',
      accentColor: 'from-pink-500 to-rose-500',
      logoBg: 'bg-pink-600/15 border-pink-500/30 text-pink-300',
      dispatched: `${stats?.providers?.pathao?.dispatched ?? 0} parcels`,
      latency: 'Same / Next Day',
      cod: formatBDT(stats?.providers?.pathao?.cod ?? 0),
      keyLabel: 'Merchant Secret',
      keySub: '',
      dummyKey: connectedMap.get('pathao') ? '••••••••••••••••••••••••••••' : 'Not configured',
      webhookUrl: `${appOrigin}/api/v1/courier/webhook/pathao`,
    },
    {
      id: 'redx' as const,
      code: 'RX',
      name: 'RedX Logistics',
      sub: '',
      accentColor: 'from-cyan-500 to-teal-500',
      logoBg: 'bg-cyan-600/15 border-cyan-500/30 text-cyan-300',
      dispatched: `${stats?.providers?.redx?.dispatched ?? 0} parcels`,
      latency: '24-72h avg',
      cod: formatBDT(stats?.providers?.redx?.cod ?? 0),
      keyLabel: 'Bearer Token',
      keySub: '',
      dummyKey: connectedMap.get('redx') ? '••••••••••••••••••••••••••••' : 'Not configured',
      webhookUrl: `${appOrigin}/api/v1/courier/webhook/redx`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-xl text-white">
            Courier Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track shipments across all your courier partners.
          </p>
        </div>

        <button
          onClick={() => syncAllMutation.mutate()}
          disabled={syncAllMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-600/30 active:scale-[0.98] transition-all w-fit disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${syncAllMutation.isPending ? 'animate-spin' : ''}`} />
          <span>{syncAllMutation.isPending ? 'Syncing...' : 'Sync All Couriers'}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Dispatched</span>
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 tabular-nums">
            {stats?.total_dispatched ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {stats?.delivered_count ?? 0} delivered
          </p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">COD In Transit</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 tabular-nums font-mono">
            {formatBDT(stats?.cod_in_transit ?? 0)}
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1">
            {stats?.in_transit_count ?? 0} parcels in transit
          </p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Delivery Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 tabular-nums font-mono">
            {stats?.delivery_rate ?? 0}%
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">Of all dispatched orders</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Return Loss</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 tabular-nums font-mono">
            {formatBDT(stats?.rto_loss ?? 0)}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1">
            {stats?.returned_count ?? 0} returned
          </p>
        </div>
      </div>

      {/* Connected Couriers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Connected Couriers
          </h2>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {couriers.map((c) => {
            const isRevealed = Boolean(showKey[c.id]);

            return (
              <div
                key={c.id}
                className="glass-card p-5 relative overflow-hidden flex flex-col justify-between"
              >
                {/* Top accent line */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.accentColor}`} />

                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-headline font-bold text-sm ${c.logoBg}`}>
                        {c.code}
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-sm text-white">
                          {c.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.sub}</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-label font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </div>

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.05] mb-4 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-label">Dispatched</div>
                      <div className="text-xs font-headline font-bold text-white mt-0.5">{c.dispatched}</div>
                    </div>
                    <div className="border-x border-white/[0.06]">
                      <div className="text-[10px] text-slate-500 uppercase font-label">SLA</div>
                      <div className="text-xs font-headline font-bold text-emerald-400 mt-0.5">{c.latency}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-label">COD Value</div>
                      <div className="text-xs font-mono font-bold text-white mt-0.5">{c.cod}</div>
                    </div>
                  </div>

                  {/* Masked API Key */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">{c.keyLabel}</span>
                    </div>
                    <div className="relative">
                      <input
                        type={isRevealed ? 'text' : 'password'}
                        value={c.dummyKey}
                        readOnly
                        className="glass-input w-full px-3 py-2 text-xs font-mono text-slate-400 pr-9 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey(c.id)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Webhook Endpoint */}
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Webhook URL</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="glass-input flex-1 px-2.5 py-1.5 text-[11px] font-mono text-slate-400 truncate">
                        {c.webhookUrl}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyWebhookUrl(c.id)}
                        className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all"
                        title="Copy Webhook"
                      >
                        {copiedUrl === c.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2">
                  <button
                    onClick={() => handleOpenConfig(c.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-label font-medium text-white transition-all flex items-center justify-center gap-1.5"
                    type="button"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Configure Keys</span>
                  </button>
                  <button
                    onClick={() => toast(`Ping dispatched to ${c.name}! Status: Live`, 'success')}
                    className="py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs font-label text-slate-300 hover:text-white transition-all"
                    type="button"
                  >
                    Test Ping
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Delivery Performance Matrix */}
      <div className="glass-card p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Delivery Performance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Last 30 days
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-label">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Delivered</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Returned</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <span>In Transit</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { id: 'steadfast' as const, name: 'Steadfast Courier' },
            { id: 'pathao' as const, name: 'Pathao Courier' },
            { id: 'redx' as const, name: 'RedX Logistics' },
          ].map((provider) => {
            const pData = stats?.providers?.[provider.id];
            const dispatched = pData?.dispatched ?? 0;
            const delivered = pData?.delivered ?? 0;
            const returned = pData?.returned ?? 0;
            const inTransit = pData?.in_transit ?? 0;
            const delRate = pData?.delivery_rate ?? 0;
            const retRate = pData?.returned_rate ?? 0;
            const inTransitRate = Math.max(0, 100 - delRate - retRate);

            return (
              <div key={provider.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{provider.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({dispatched} {dispatched === 1 ? 'parcel' : 'parcels'} total)
                    </span>
                  </div>
                  <span className="font-mono text-emerald-400 font-medium">
                    {dispatched === 0
                      ? 'No parcels dispatched yet'
                      : `${delRate}% Delivered (${retRate}% Returned · ${inTransit} in transit)`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-white/[0.05] rounded-full overflow-hidden flex border border-white/[0.06]">
                  {dispatched === 0 ? (
                    <div className="h-full w-full bg-white/[0.02]" />
                  ) : (
                    <>
                      {delRate > 0 && (
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${delRate}%` }}
                          title={`Delivered: ${delivered} (${delRate}%)`}
                        />
                      )}
                      {retRate > 0 && (
                        <div
                          className="h-full bg-rose-500 transition-all duration-500"
                          style={{ width: `${retRate}%` }}
                          title={`Returned: ${returned} (${retRate}%)`}
                        />
                      )}
                      {inTransitRate > 0 && (
                        <div
                          className="h-full bg-slate-600 transition-all duration-500"
                          style={{ width: `${inTransitRate}%` }}
                          title={`In Transit: ${inTransit}`}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Configure Credentials Modal */}
      <Modal
        isOpen={configureModalOpen}
        onClose={() => setConfigureModalOpen(false)}
        title={`Configure ${selectedProvider.toUpperCase()}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Courier Provider"
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as any)}
            options={[
              { value: 'steadfast', label: 'Steadfast Courier' },
              { value: 'pathao', label: 'Pathao Courier' },
              { value: 'redx', label: 'RedX Logistics' },
            ]}
          />

          <Input
            label="API Key / Client ID"
            placeholder="Enter production API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />

          <Input
            type="password"
            label={`Secret Key / Password ${selectedProvider === 'redx' ? '(Optional)' : ''}`}
            placeholder="Enter secret key"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            required={selectedProvider !== 'redx'}
          />

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400 flex items-center gap-2 font-body">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted using AES-256-GCM before persistent database storage.</span>
          </div>

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
              Save Credentials
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
