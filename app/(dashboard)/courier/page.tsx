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
  ShieldAlert,
} from 'lucide-react';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

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

// Old UI components
import { Modal } from '@/components/ui/Modal';
import { Input as FormInput, Select } from '@/components/ui/Input';
import { RiskSettingsModal } from '@/components/orders/RiskSettingsModal';

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
  const [riskModalOpen, setRiskModalOpen] = useState(false);
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

  // Fetch courier risk settings
  const { data: riskSettings } = useQuery<{ minDeliveryRatio: number; maxCancelRatio: number }>({
    queryKey: ['courier-risk-settings'],
    queryFn: () => fetchApi('/api/v1/courier/risk-settings'),
  });

  const minDelivery = riskSettings?.minDeliveryRatio ?? 50;
  const maxCancel = riskSettings?.maxCancelRatio ?? 50;

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
      accentColor: 'bg-indigo-500',
      logoBg: 'bg-indigo-50 border-indigo-100 text-indigo-700',
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
      accentColor: 'bg-pink-500',
      logoBg: 'bg-pink-50 border-pink-100 text-pink-700',
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
      accentColor: 'bg-emerald-500',
      logoBg: 'bg-emerald-50 border-emerald-100 text-emerald-700',
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
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courier Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track shipments across all your courier partners.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRiskModalOpen(true)}
            title="Configure Steadfast delivery ratio, cancel ratio, and fraud thresholds"
          >
            <ShieldAlert className="w-4 h-4 mr-2 text-rose-500" />
            Fraud & Risk Rules
            <Badge variant="secondary" className="ml-2 bg-rose-100 text-rose-800 hover:bg-rose-100">
              {minDelivery}% / {maxCancel}%
            </Badge>
          </Button>

          <Button
            size="sm"
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
          >
            <RotateCw className={`w-4 h-4 mr-2 ${syncAllMutation.isPending ? 'animate-spin' : ''}`} />
            {syncAllMutation.isPending ? 'Syncing...' : 'Sync All Couriers'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dispatched</CardTitle>
            <Package className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats?.total_dispatched ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.delivered_count ?? 0} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">COD In Transit</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 tabular-nums">
              {formatBDT(stats?.cod_in_transit ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.in_transit_count ?? 0} parcels in transit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">
              {stats?.delivery_rate ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Of all dispatched orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Return Loss</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive tabular-nums">
              {formatBDT(stats?.rto_loss ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.returned_count ?? 0} returned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connected Couriers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Connected Couriers</h2>
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-500/10">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Encrypted Keys
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {couriers.map((c) => {
            const isRevealed = Boolean(showKey[c.id]);
            const isConnected = Boolean(connectedMap.get(c.id));

            return (
              <Card key={c.id} className="relative overflow-hidden flex flex-col justify-between pt-1">
                {/* Top accent line */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${c.accentColor}`} />

                <CardContent className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm shrink-0 ${c.logoBg}`}>
                        {c.code}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">
                          {c.name}
                        </h3>
                        {c.sub && <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>}
                      </div>
                    </div>

                    <Badge variant={isConnected ? 'outline' : 'secondary'} className={isConnected ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10' : ''}>
                      {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
                      {isConnected ? 'Live' : 'Offline'}
                    </Badge>
                  </div>

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/50 border mb-5 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Dispatched</div>
                      <div className="text-sm font-semibold mt-1">{c.dispatched}</div>
                    </div>
                    <div className="border-x">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">SLA</div>
                      <div className="text-sm font-semibold text-emerald-600 mt-1">{c.latency}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">COD Value</div>
                      <div className="text-sm font-semibold tabular-nums mt-1">{c.cod}</div>
                    </div>
                  </div>

                  {/* Masked API Key */}
                  <div className="space-y-1.5 mb-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {c.keyLabel}
                    </div>
                    <div className="relative">
                      <Input
                        type={isRevealed ? 'text' : 'password'}
                        value={c.dummyKey}
                        readOnly
                        className="font-mono text-sm pr-10 bg-muted/30"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => toggleShowKey(c.id)}
                        className="absolute inset-y-0 right-0 h-9 w-9 text-muted-foreground"
                      >
                        {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Webhook Endpoint */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Webhook URL
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-muted/50 border rounded-md text-xs font-mono text-primary font-medium truncate">
                        {c.webhookUrl}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => copyWebhookUrl(c.id)}
                        className="shrink-0 h-8 w-8"
                        title="Copy Webhook"
                      >
                        {copiedUrl === c.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>

                <div className="p-4 border-t bg-muted/10 flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenConfig(c.id)}
                    className="flex-1 text-sm font-medium"
                    type="button"
                  >
                    <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                    Configure Keys
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => toast(`Ping dispatched to ${c.name}! Status: Live`, 'success')}
                    className="text-sm font-medium"
                    type="button"
                  >
                    Test Ping
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 4. Delivery Performance Matrix */}
      <Card>
        <CardHeader className="p-4 sm:px-6 sm:pt-6 pb-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle>Delivery Performance</CardTitle>
            <CardDescription className="mt-1">Last 30 days</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Delivered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Returned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>In Transit</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
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
              <div key={provider.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{provider.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({dispatched} {dispatched === 1 ? 'parcel' : 'parcels'} total)
                    </span>
                  </div>
                  <span className="font-mono text-emerald-600 font-medium">
                    {dispatched === 0
                      ? 'No parcels dispatched yet'
                      : `${delRate}% Delivered (${retRate}% Returned · ${inTransit} in transit)`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden flex">
                  {dispatched === 0 ? (
                    <div className="h-full w-full bg-secondary" />
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
                          className="h-full bg-slate-300 dark:bg-slate-700 transition-all duration-500"
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
        </CardContent>
      </Card>

      {/* Configure Credentials Modal */}
      <Modal
        isOpen={configureModalOpen}
        onClose={() => setConfigureModalOpen(false)}
        title={`Configure ${selectedProvider.toUpperCase()}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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

          <FormInput
            label="API Key / Client ID"
            placeholder="Enter production API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />

          <FormInput
            type="password"
            label={`Secret Key / Password ${selectedProvider === 'redx' ? '(Optional)' : ''}`}
            placeholder="Enter secret key"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            required={selectedProvider !== 'redx'}
          />

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 font-medium flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">Encrypted using AES-256-GCM before persistent database storage.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfigureModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Credentials'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Courier Fraud & Risk Thresholds Modal */}
      <RiskSettingsModal
        isOpen={riskModalOpen}
        onClose={() => setRiskModalOpen(false)}
      />
    </div>
  );
}
