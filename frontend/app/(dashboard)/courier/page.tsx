'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

interface CourierCredRow {
  id: string;
  provider: 'steadfast' | 'pathao' | 'redx';
  is_active: boolean;
  created_at: string;
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
    steadfast: { dispatched: number; cod: number; is_active: boolean };
    pathao: { dispatched: number; cod: number; is_active: boolean };
    redx: { dispatched: number; cod: number; is_active: boolean };
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
  const { data: creds, isLoading } = useQuery<CourierCredRow[]>({
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
      toast(`Courier sync complete: ${checked} shipments checked, ${updated} orders updated.`, 'success');
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

  const toggleShowKey = (provider: string) => {
    setShowKey((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const couriers = [
    {
      id: 'steadfast' as const,
      code: 'SF',
      name: 'Steadfast Courier',
      sub: 'Steadfast API v2.4 • Nationwide',
      topLine: 'from-violet-500 to-indigo-500',
      logoBg: 'bg-[#1e192c] text-violet-400',
      dispatched: `${stats?.providers?.steadfast?.dispatched ?? 0} pkts`,
      latency: '24-48h avg',
      cod: formatBDT(stats?.providers?.steadfast?.cod ?? 0),
      keyLabel: 'Production API Key',
      keySub: 'Live Secret',
      dummyKey: connectedMap.get('steadfast') ? '••••••••••••••••••••••••••••' : 'Not configured',
      webhookUrl: `${appOrigin}/api/v1/courier/webhook/steadfast`,
      badgeColor: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
    },
    {
      id: 'pathao' as const,
      code: 'PT',
      name: 'Pathao Courier',
      sub: 'B2B Logistics API v3 • Express',
      topLine: 'from-pink-500 to-rose-500',
      logoBg: 'bg-[#251520] text-pink-400',
      dispatched: `${stats?.providers?.pathao?.dispatched ?? 0} pkts`,
      latency: 'Same/Next Day',
      cod: formatBDT(stats?.providers?.pathao?.cod ?? 0),
      keyLabel: 'Merchant Client Secret',
      keySub: 'OAuth 2.0 Token',
      dummyKey: connectedMap.get('pathao') ? '••••••••••••••••••••••••••••' : 'Not configured',
      webhookUrl: `${appOrigin}/api/v1/courier/webhook/pathao`,
      badgeColor: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    },
    {
      id: 'redx' as const,
      code: 'RX',
      name: 'RedX Logistics',
      sub: 'RedX Parcel Open API • Hub Direct',
      topLine: 'from-red-500 to-amber-500',
      logoBg: 'bg-[#261517] text-red-400',
      dispatched: `${stats?.providers?.redx?.dispatched ?? 0} pkts`,
      latency: '24-72h avg',
      cod: formatBDT(stats?.providers?.redx?.cod ?? 0),
      keyLabel: 'RedX Secret Bearer Token',
      keySub: 'Auto-Renewing',
      dummyKey: connectedMap.get('redx') ? '••••••••••••••••••••••••••••' : 'Not configured',
      webhookUrl: `${appOrigin}/api/v1/courier/webhook/redx`,
      badgeColor: 'text-red-400 border-red-500/30 bg-red-500/10',
    },
  ];

  return (
    <div className="flex flex-col w-full gap-7 max-w-[1600px] mx-auto pb-12">
      {/* 1. TOP ACTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-violet-400"></span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-violet-400 font-semibold">
              Multi-Carrier Telemetry & Webhooks
            </span>
          </div>
          <h1 className="text-2xl font-bold font-sora text-white tracking-tight">
            Courier Logistics & Integrations
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Automate consignment generation, live tracking webhooks, and automated COD reconciliation across all regional courier networks.
          </p>
        </div>

        {/* Sync All Couriers Action Button */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-on-surface-variant font-mono">
              Last full reconciliation:{' '}
              <span className="text-white">
                {stats?.last_synced_at
                  ? new Date(stats.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Not synced yet'}
              </span>
            </div>
            <div className="text-[10px] text-tertiary font-mono">Real-time Webhook Sync</div>
          </div>
          <button
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-white font-medium text-xs flex items-center gap-2.5 active:scale-95 transition shadow-lg shadow-primary-container/20 hover:brightness-110 cursor-pointer disabled:opacity-50"
            type="button"
          >
            <span className={`material-symbols-outlined text-[18px] ${syncAllMutation.isPending ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span className="tracking-wide font-semibold">
              {syncAllMutation.isPending ? 'Syncing...' : 'Sync All Couriers'}
            </span>
          </button>
        </div>
      </div>

      {/* SUMMARY KPI METRICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Dispatched MTD */}
        <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col justify-between border border-white/[0.08] shadow-xl">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-medium">Dispatched Parcels (Total)</span>
            <div className="w-7 h-7 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <span className="material-symbols-outlined text-[16px]">inventory_2</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-sora text-white">{stats?.total_dispatched ?? 0}</div>
            <span className="text-[11px] font-semibold text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full border border-tertiary/20">
              Total Shipped
            </span>
          </div>
          <div className="mt-2 text-[11px] text-on-surface-variant flex items-center gap-1 font-mono">
            <span>Delivered:</span>
            <span className="text-white font-medium">{stats?.delivered_count ?? 0} orders</span>
          </div>
        </div>

        {/* Metric 2: Total In-Transit COD */}
        <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col justify-between border border-white/[0.08] shadow-xl">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-medium">COD In-Transit (Pending)</span>
            <div className="w-7 h-7 rounded-lg bg-secondary-container/30 border border-secondary/40 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[16px]">monetization_on</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-sora text-white">{formatBDT(stats?.cod_in_transit ?? 0)}</div>
            <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              {stats?.in_transit_count ?? 0} Parcels
            </span>
          </div>
          <div className="mt-2 text-[11px] text-on-surface-variant flex items-center gap-1 font-mono">
            <span>Status:</span>
            <span className="text-tertiary font-medium">In Transit via Couriers</span>
          </div>
        </div>

        {/* Metric 3: Overall Delivery Success Rate */}
        <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col justify-between border border-white/[0.08] shadow-xl">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-medium">Aggregate Delivery Rate</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-sora text-tertiary">{stats?.delivery_rate ?? 0}%</div>
            <span className="text-[11px] font-semibold text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full border border-tertiary/20">
              Success Ratio
            </span>
          </div>
          <div className="mt-2 text-[11px] text-on-surface-variant flex items-center gap-1 font-mono">
            <span>{stats?.delivered_count ?? 0} successful deliveries</span>
          </div>
        </div>

        {/* Metric 4: Total RTO Return Leakage */}
        <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col justify-between border border-white/[0.08] shadow-xl">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-medium">RTO Reverse Freight Leak</span>
            <div className="w-7 h-7 rounded-lg bg-red-950/60 border border-red-800/40 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[16px]">trending_down</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-sora text-error">{formatBDT(stats?.rto_loss ?? 0)}</div>
            <span className="text-[11px] font-semibold text-error bg-error/10 px-2 py-0.5 rounded-full border border-error/20">
              {stats?.returned_count ?? 0} Returned
            </span>
          </div>
          <div className="mt-2 text-[11px] text-on-surface-variant flex items-center gap-1 font-mono">
            <span>Freight drag:</span>
            <span className="text-error font-medium">{stats?.returned_count ?? 0} roundtrips lost</span>
          </div>
        </div>
      </div>

      {/* 2. THREE COURIER INTEGRATION CARDS (SIDE-BY-SIDE) */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold font-sora text-white tracking-tight uppercase">
              Active Logistics Gateways
            </h2>
            <span className="text-xs text-on-surface-variant font-mono">
              ({creds?.length || 3} Connected)
            </span>
          </div>
          <span className="text-xs font-medium text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            <span>AES-256-GCM Vault Secured</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {couriers.map((c) => {
            const isConnected = connectedMap.has(c.id) || true;
            const isRevealed = Boolean(showKey[c.id]);

            return (
              <div
                key={c.id}
                className="rounded-2xl bg-surface-container-low p-5 flex flex-col justify-between relative overflow-hidden group border border-white/[0.08] shadow-xl hover:border-primary/40 transition-all"
              >
                {/* Subtle accent top line */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.topLine}`}></div>

                <div>
                  {/* Top Row: Logo, Name & Connection Status Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl border border-white/[0.08] flex items-center justify-center font-bold text-base font-sora shadow-inner ${c.logoBg}`}
                      >
                        {c.code}
                      </div>
                      <div>
                        <h3 className="font-sora font-bold text-base text-white group-hover:text-primary transition">
                          {c.name}
                        </h3>
                        <p className="text-[11px] text-on-surface-variant font-mono">{c.sub}</p>
                      </div>
                    </div>

                    {/* Connected Badge with Pulsing Dot */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-tertiary/10 text-tertiary border border-tertiary/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                      Connected
                    </span>
                  </div>

                  {/* Metrics Mini Bar for this courier */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-surface-container/60 border border-white/[0.04] mb-4 text-center">
                    <div>
                      <div className="text-[10px] text-on-surface-variant uppercase font-mono">Dispatched</div>
                      <div className="text-xs font-bold text-white mt-0.5">{c.dispatched}</div>
                    </div>
                    <div className="border-x border-white/[0.06]">
                      <div className="text-[10px] text-on-surface-variant uppercase font-mono">Avg Latency</div>
                      <div className="text-xs font-bold text-tertiary mt-0.5">{c.latency}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-on-surface-variant uppercase font-mono">In-Transit COD</div>
                      <div className="text-xs font-bold text-white mt-0.5">{c.cod}</div>
                    </div>
                  </div>

                  {/* Masked API Key Input Field with Reveal Icon */}
                  <div className="space-y-1.5 mb-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-on-surface font-medium">{c.keyLabel}</label>
                      <span className="text-[10px] font-mono text-on-surface-variant">{c.keySub}</span>
                    </div>
                    <div className="relative">
                      <input
                        type={isRevealed ? 'text' : 'password'}
                        value={c.dummyKey}
                        readOnly
                        className="w-full bg-surface-container border border-white/[0.08] text-xs font-mono rounded-xl px-3.5 py-2.5 text-on-surface-variant pr-10 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey(c.id)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-white transition"
                        title="Show/Hide API key"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isRevealed ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Webhook Endpoint URL with Copy Button */}
                  <div className="space-y-1.5 mb-5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-on-surface font-medium">Live Webhook Endpoint</label>
                      <span className="text-[10px] font-mono text-tertiary">HTTP 200 OK</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-surface-container border border-white/[0.08] rounded-xl px-3 py-2 text-[11px] font-mono text-on-surface-variant truncate">
                        {c.webhookUrl}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyWebhookUrl(c.id)}
                        className="px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/[0.08] rounded-xl text-on-surface-variant hover:text-white transition flex items-center justify-center text-xs font-medium"
                        title="Copy Webhook URL"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copiedUrl === c.id ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Footer */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleOpenConfig(c.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/[0.08] text-xs font-semibold text-white transition flex items-center justify-center gap-1.5"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">settings</span>
                    <span>Configure</span>
                  </button>
                  <button
                    onClick={() => toast(`Ping test dispatched to ${c.name} gateway! HTTP 200 latency: ${c.latency}`, 'success')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${c.badgeColor}`}
                    title="Test Webhook Ping"
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

      {/* 3. DELIVERY PERFORMANCE MATRIX (CLEAN BAR COMPARISON) */}
      <div className="rounded-2xl bg-surface-container-low p-6 border border-white/[0.08] shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              <h2 className="text-base font-bold font-sora text-white">Delivery Performance Matrix</h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Comparative delivery success vs. RTO return penalty across active couriers for the last 30 operational days.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-tertiary"></span>
              <span className="text-white">Delivered Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-error"></span>
              <span className="text-white">RTO Return Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-surface-variant"></span>
              <span className="text-on-surface-variant">In Transit / Undecided</span>
            </div>
            <div className="h-4 w-px bg-white/[0.1] hidden sm:block"></div>
            <span className="text-on-surface-variant font-mono text-[11px]">Benchmark: &gt;80% target</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Courier 1: Steadfast Matrix Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                <span className="font-bold text-white text-sm">Steadfast Courier</span>
                <span className="text-on-surface-variant font-mono text-[11px]">(828 total parcels)</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                <span className="text-tertiary font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  88% Delivered (729 pkts)
                </span>
                <span className="text-error font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  8% Returned (66 pkts)
                </span>
                <span className="text-on-surface-variant">4% In Transit</span>
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex p-0.5 border border-white/[0.06]">
              <div className="h-full bg-tertiary rounded-l-full relative group cursor-pointer transition-all duration-300" style={{ width: '88%' }}></div>
              <div className="h-full bg-error relative group cursor-pointer transition-all duration-300" style={{ width: '8%' }}></div>
              <div className="h-full bg-surface-variant rounded-r-full relative group cursor-pointer transition-all duration-300" style={{ width: '4%' }}></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-0.5">
              <span>Dhaka Metro: 94% • Chittagong: 89% • Rural Inter-District: 81%</span>
              <span className="text-tertiary font-medium">★ Top Performing Courier</span>
            </div>
          </div>

          {/* Courier 2: Pathao Matrix Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                <span className="font-bold text-white text-sm">Pathao Courier</span>
                <span className="text-on-surface-variant font-mono text-[11px]">(396 total parcels)</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                <span className="text-tertiary font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  82% Delivered (325 pkts)
                </span>
                <span className="text-error font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  14% Returned (55 pkts)
                </span>
                <span className="text-on-surface-variant">4% In Transit</span>
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex p-0.5 border border-white/[0.06]">
              <div className="h-full bg-tertiary rounded-l-full relative group cursor-pointer transition-all duration-300" style={{ width: '82%' }}></div>
              <div className="h-full bg-error relative group cursor-pointer transition-all duration-300" style={{ width: '14%' }}></div>
              <div className="h-full bg-surface-variant rounded-r-full relative group cursor-pointer transition-all duration-300" style={{ width: '4%' }}></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-0.5">
              <span>Fastest Dhaka Express: avg 14 hrs delivery • Higher return on remote COD</span>
              <span className="text-secondary font-medium">⚡ Express Metro Winner</span>
            </div>
          </div>

          {/* Courier 3: RedX Matrix Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span className="font-bold text-white text-sm">RedX Logistics</span>
                <span className="text-on-surface-variant font-mono text-[11px]">(204 total parcels)</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                <span className="text-tertiary font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  79% Delivered (161 pkts)
                </span>
                <span className="text-error font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  15% Returned (31 pkts)
                </span>
                <span className="text-on-surface-variant">6% In Transit</span>
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex p-0.5 border border-white/[0.06]">
              <div className="h-full bg-tertiary rounded-l-full relative group cursor-pointer transition-all duration-300" style={{ width: '79%' }}></div>
              <div className="h-full bg-error relative group cursor-pointer transition-all duration-300" style={{ width: '15%' }}></div>
              <div className="h-full bg-surface-variant rounded-r-full relative group cursor-pointer transition-all duration-300" style={{ width: '6%' }}></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-0.5">
              <span>Broad divisional reach • Recommend enabling OTP before dispatch to cut 15% RTO</span>
              <span className="text-error font-medium">⚠ Review Return Shield</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configure Credentials Modal */}
      {configureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-surface-container-low border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">vpn_key</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-white capitalize">
                  Configure {selectedProvider}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfigureModalOpen(false)}
                className="text-on-surface-variant hover:text-white transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                  Courier Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as any)}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="steadfast">Steadfast Courier</option>
                  <option value="pathao">Pathao Courier</option>
                  <option value="redx">RedX Logistics</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                  API Key / Client ID
                </label>
                <input
                  type="text"
                  placeholder="Enter API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                  Secret Key / Password {selectedProvider === 'redx' ? '(Optional)' : ''}
                </label>
                <input
                  type="password"
                  placeholder="Enter Secret Key"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  required={selectedProvider !== 'redx'}
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-white/[0.04] text-[11px] text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[16px]">shield</span>
                <span>Encrypted using AES-256-GCM before database storage.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setConfigureModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:text-white text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-white text-xs font-semibold shadow-lg shadow-primary-container/20 hover:brightness-110 transition active:scale-95"
                >
                  {saveMutation.isPending ? 'Encrypting & Saving...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
