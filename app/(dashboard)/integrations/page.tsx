'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  Copy,
  Check,
  Zap,
  Code2,
  Send,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Key,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  Unlink,
  ExternalLink,
} from 'lucide-react';
import { fetchApi, formatBDT } from '@/lib/apiClient';
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

interface IntegrationData {
  tenantId: string;
  businessName: string;
  websiteUrl: string;
  apiKey: string;
  webhookUrl: string;
  webOrdersCount: number;
  status: string;
}

interface WooCommerceStatus {
  isConnected: boolean;
  storeUrl: string;
  hasCredentials: boolean;
  lastSyncedAt: string | null;
}

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'woo' | 'embed' | 'api' | 'test'>('woo');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Store Website URL input state
  const [websiteInput, setWebsiteInput] = useState('');
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);

  // WooCommerce REST API Key/Secret state
  const [wooUrl, setWooUrl] = useState('');
  const [wooConsumerKey, setWooConsumerKey] = useState('');
  const [wooConsumerSecret, setWooConsumerSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // Test Order state
  const [testName, setTestName] = useState('Md Sakib (Test Website Order)');
  const [testPhone, setTestPhone] = useState('01712345678');
  const [testAddress, setTestAddress] = useState('Flat 4B, Road 12, Banani, Dhaka');
  const [testDelivery, setTestDelivery] = useState('70');
  const [testProductName, setTestProductName] = useState('Exclusive Premium Shirt');
  const [testPrice, setTestPrice] = useState('1250');
  const [testResult, setTestResult] = useState<{ orderId: string; totalAmount: number } | null>(null);

  const { data: integration } = useQuery<IntegrationData>({
    queryKey: ['store-integrations'],
    queryFn: () => fetchApi('/api/v1/store/integrations'),
  });

  const { data: wooStatus, refetch: refetchWoo } = useQuery<WooCommerceStatus>({
    queryKey: ['woocommerce-status'],
    queryFn: () => fetchApi('/api/v1/store/woocommerce'),
  });

  React.useEffect(() => {
    if (integration?.websiteUrl && !websiteInput) {
      setWebsiteInput(integration.websiteUrl);
    }
  }, [integration?.websiteUrl, websiteInput]);

  React.useEffect(() => {
    if (wooStatus?.storeUrl && !wooUrl) {
      setWooUrl(wooStatus.storeUrl);
    }
  }, [wooStatus?.storeUrl, wooUrl]);

  const updateIntegrationMutation = useMutation({
    mutationFn: (body: { website_url?: string; regenerate_key?: boolean }) =>
      fetchApi('/api/v1/store/integrations', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Store website settings updated successfully!', 'success');
      setIsEditingWebsite(false);
      queryClient.invalidateQueries({ queryKey: ['store-integrations'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to update settings', 'error');
    },
  });

  // WooCommerce Connect Mutation
  const connectWooMutation = useMutation({
    mutationFn: (body: { store_url: string; consumer_key: string; consumer_secret: string }) =>
      fetchApi('/api/v1/store/woocommerce/connect', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data: unknown) => {
      const msg = (data as { message?: string })?.message || 'WooCommerce connected successfully!';
      toast(msg, 'success');
      setWooConsumerKey('');
      setWooConsumerSecret('');
      refetchWoo();
      queryClient.invalidateQueries({ queryKey: ['store-integrations'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to connect WooCommerce store', 'error');
    },
  });

  // Sync Orders Mutation
  const syncOrdersMutation = useMutation({
    mutationFn: () =>
      fetchApi<{ message: string; importedCount: number; skippedCount: number }>('/api/v1/store/woocommerce/sync-orders', {
        method: 'POST',
      }),
    onSuccess: (data) => {
      toast(data?.message || 'Orders synced from WooCommerce!', 'success');
      refetchWoo();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['store-integrations'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to sync orders', 'error');
    },
  });

  // Sync Products Mutation
  const syncProductsMutation = useMutation({
    mutationFn: () =>
      fetchApi<{ message: string; importedCount: number; updatedCount: number }>('/api/v1/store/woocommerce/sync-products', {
        method: 'POST',
      }),
    onSuccess: (data) => {
      toast(data?.message || 'Products synced from WooCommerce!', 'success');
      refetchWoo();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to sync products', 'error');
    },
  });

  // Disconnect Mutation
  const disconnectWooMutation = useMutation({
    mutationFn: () =>
      fetchApi('/api/v1/store/woocommerce', {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast('WooCommerce store disconnected', 'info');
      setWooConsumerKey('');
      setWooConsumerSecret('');
      refetchWoo();
      queryClient.invalidateQueries({ queryKey: ['store-integrations'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to disconnect', 'error');
    },
  });

  const testOrderMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/v1/orders/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to send test order');
      }
      return data.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast('Test order placed successfully into your CRM!', 'success');
      queryClient.invalidateQueries({ queryKey: ['store-integrations'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Error sending test order', 'error');
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast(`${field} copied to clipboard!`, 'info');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleConnectWooSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wooUrl || !wooConsumerKey || !wooConsumerSecret) {
      toast('Please enter Store URL, Consumer Key, and Consumer Secret', 'error');
      return;
    }
    connectWooMutation.mutate({
      store_url: wooUrl,
      consumer_key: wooConsumerKey,
      consumer_secret: wooConsumerSecret,
    });
  };

  const handleTestOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!integration?.tenantId) return;

    testOrderMutation.mutate({
      tenant_id: integration.tenantId,
      customer_name: testName,
      customer_phone: testPhone,
      customer_address: testAddress,
      delivery_charge: Number(testDelivery) || 0,
      notes: 'Test order sent from Website Integration dashboard',
      items: [
        {
          name: testProductName,
          sell_price: Number(testPrice) || 0,
          quantity: 1,
        },
      ],
    });
  };

  const tenantId = integration?.tenantId || user?.tenant_id || '5cfe174a-505f-4422-9b37-801a238cdd22';
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://crm-orpin-theta.vercel.app';
  const publicWebhookUrl = `${appOrigin}/api/v1/orders/public`;

  // HTML / JS Embed code for landing pages
  const embedCodeSnippet = `<!-- NexusFlow CRM Checkout Form Snippet -->
<form id="nexusflow-checkout-form" style="max-width: 480px; margin: 0 auto; font-family: var(--font-sans); padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
  <h3 style="margin-top: 0; font-size: 18px; color: #0f172a;">অর্ডার কনফার্ম করতে ফর্মটি পূরণ করুন</h3>
  
  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">আপনার নাম *</label>
    <input type="text" id="nf_name" required placeholder="আপনার নাম লিখুন" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">মোবাইল নম্বর *</label>
    <input type="tel" id="nf_phone" required placeholder="01XXXXXXXXX" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">সম্পূর্ণ ঠিকানা *</label>
    <textarea id="nf_address" required placeholder="বাসা/রোড নম্বর, এলাকা ও জেলা" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box;"></textarea>
  </div>

  <div style="margin-bottom: 16px;">
    <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">ডেলিভারি চার্জ</label>
    <label style="margin-right: 15px; font-size: 13px;">
      <input type="radio" name="nf_delivery" value="70" checked /> ঢাকার ভেতরে (৳70)
    </label>
    <label style="font-size: 13px;">
      <input type="radio" name="nf_delivery" value="130" /> ঢাকার বাইরে (৳130)
    </label>
  </div>

  <button type="submit" id="nf_submit_btn" style="width: 100%; background: #4f46e5; color: #fff; padding: 12px; font-size: 15px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer;">
    অর্ডার সাবমিট করুন (ক্যাশ অন ডেলিভারি)
  </button>
  <div id="nf_msg" style="margin-top: 10px; font-size: 13px; text-align: center;"></div>
</form>

<script>
document.getElementById('nexusflow-checkout-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('nf_submit_btn');
  const msg = document.getElementById('nf_msg');
  btn.disabled = true;
  btn.innerText = 'অর্ডার প্রসেস হচ্ছে...';
  msg.innerText = '';

  const deliveryCharge = Number(document.querySelector('input[name="nf_delivery"]:checked').value);

  const payload = {
    tenant_id: "${tenantId}",
    customer_name: document.getElementById('nf_name').value,
    customer_phone: document.getElementById('nf_phone').value,
    customer_address: document.getElementById('nf_address').value,
    delivery_charge: deliveryCharge,
    notes: 'Order placed from Website Landing Page',
    items: [
      {
        name: "Website Product",
        sell_price: 1200,
        quantity: 1
      }
    ]
  };

  try {
    const res = await fetch("${publicWebhookUrl}", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok && result.success) {
      msg.style.color = '#16a34a';
      msg.innerText = 'ধন্যবাদ! আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে (অর্ডার #' + result.data.orderId.slice(0, 8) + ')।';
      document.getElementById('nexusflow-checkout-form').reset();
    } else {
      msg.style.color = '#dc2626';
      msg.innerText = 'অর্ডার করতে সমস্যা হয়েছে: ' + (result.error?.message || 'পুনরায় চেষ্টা করুন');
    }
  } catch (err) {
    msg.style.color = '#dc2626';
    msg.innerText = 'সার্ভার সংযোগে ত্রুটি। ইন্টারনেট চেক করুন।';
  } finally {
    btn.disabled = false;
    btn.innerText = 'অর্ডার সাবমিট করুন (ক্যাশ অন ডেলিভারি)';
  }
});
</script>`;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 pb-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Website & Store</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your store to automatically receive orders.
          </p>
        </div>

        <Link
          href="/orders"
          className="self-start sm:self-auto"
        >
          <Button variant="outline" size="sm">
            <ShoppingBag className="w-4 h-4 text-indigo-600 mr-2" />
            View Orders ({integration?.webOrdersCount || 0} Total)
          </Button>
        </Link>
      </div>

      {/* Top Credentials Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connected Website Domain Card */}
        <Card className="flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-500" />
                Store Website
              </span>
              <Badge variant={integration?.websiteUrl || wooStatus?.isConnected ? 'outline' : 'secondary'} className={integration?.websiteUrl || wooStatus?.isConnected ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10 uppercase tracking-widest text-[10px]' : 'uppercase tracking-widest text-[10px]'}>
                {integration?.websiteUrl || wooStatus?.isConnected ? 'Connected' : 'Setup Required'}
              </Badge>
            </div>

            {isEditingWebsite ? (
              <div className="space-y-3 mt-2">
                <Input
                  type="url"
                  placeholder="https://yourstore.com"
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      updateIntegrationMutation.mutate({ website_url: websiteInput })
                    }
                    disabled={updateIntegrationMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingWebsite(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-base truncate mt-1">
                  {wooStatus?.storeUrl || integration?.websiteUrl || 'No domain linked yet'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {wooStatus?.isConnected
                    ? 'Connected'
                    : integration?.websiteUrl
                    ? 'Orders from this domain are accepted'
                    : 'Click below to attach your online shop domain'}
                </p>
              </div>
            )}
          </CardContent>

          {!isEditingWebsite && (
            <div className="p-4 border-t bg-muted/10">
              <Button
                variant="ghost"
                className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 justify-between h-9 px-2"
                onClick={() => {
                  setWebsiteInput(wooStatus?.storeUrl || integration?.websiteUrl || '');
                  setIsEditingWebsite(true);
                }}
              >
                <span>{integration?.websiteUrl || wooStatus?.storeUrl ? 'Change Website URL' : '+ Add Store Website'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </Card>

        {/* Tenant ID / Store ID Card */}
        <Card className="flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tenant ID
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border font-mono text-xs break-all select-all font-medium">
              {tenantId}
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Pass this ID in your webhook payload or script to map orders to this account.
            </p>
          </CardContent>

          <div className="p-4 border-t bg-muted/10">
            <Button
              variant="outline"
              className="w-full h-9"
              onClick={() => copyToClipboard(tenantId, 'Tenant ID')}
            >
              {copiedField === 'Tenant ID' ? (
                <Check className="w-4 h-4 text-emerald-500 mr-2" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground mr-2" />
              )}
              {copiedField === 'Tenant ID' ? 'Copied Tenant ID' : 'Copy Tenant ID'}
            </Button>
          </div>
        </Card>

        {/* Public Order Webhook URL Card */}
        <Card className="flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Webhook URL
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border font-mono text-xs text-indigo-600 break-all select-all font-medium">
              {publicWebhookUrl}
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Endpoint for WooCommerce Webhooks, Landing Pages, and Custom Apps.
            </p>
          </CardContent>

          <div className="p-4 border-t bg-muted/10">
            <Button
              variant="outline"
              className="w-full h-9"
              onClick={() => copyToClipboard(publicWebhookUrl, 'Webhook URL')}
            >
              {copiedField === 'Webhook URL' ? (
                <Check className="w-4 h-4 text-emerald-500 mr-2" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground mr-2" />
              )}
              {copiedField === 'Webhook URL' ? 'Copied Webhook URL' : 'Copy Webhook URL'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Integration Guides Navigation Tabs */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b p-4 sm:p-6 pb-4">
          <Button
            variant={activeTab === 'woo' ? 'default' : 'ghost'}
            className={activeTab === 'woo' ? '' : 'text-muted-foreground'}
            onClick={() => setActiveTab('woo')}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            <span>WooCommerce (Key & Secret)</span>
            {wooStatus?.isConnected && (
              <span className="w-2 h-2 ml-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </Button>

          <Button
            variant={activeTab === 'embed' ? 'default' : 'ghost'}
            className={activeTab === 'embed' ? '' : 'text-muted-foreground'}
            onClick={() => setActiveTab('embed')}
          >
            <Code2 className="w-4 h-4 mr-2" />
            <span>Landing Page / HTML Form</span>
          </Button>

          <Button
            variant={activeTab === 'api' ? 'default' : 'ghost'}
            className={activeTab === 'api' ? '' : 'text-muted-foreground'}
            onClick={() => setActiveTab('api')}
          >
            <Zap className="w-4 h-4 mr-2" />
            <span>REST API / Developers</span>
          </Button>

          <Button
            variant={activeTab === 'test' ? 'default' : 'outline'}
            className={`sm:ml-auto ${activeTab === 'test' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-500 text-emerald-600 bg-emerald-500/5'}`}
            onClick={() => setActiveTab('test')}
          >
            <Send className="w-4 h-4 mr-2" />
            <span>Live Test Order</span>
          </Button>
        </div>

        <CardContent className="p-4 sm:p-6">
          {/* Tab 1: WooCommerce Integration */}
          {activeTab === 'woo' && (
            <div className="space-y-8">
              {/* METHOD 1: Direct Consumer Key & Consumer Secret Connection */}
              <div className="rounded-xl border bg-card relative overflow-hidden">
                <div className="p-6 border-b">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          <span>Option 1 — WooCommerce API</span>
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-[10px] tracking-widest uppercase">Recommended</Badge>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Direct 2-way connection. Fetch orders and import your WooCommerce product catalog directly into NexusFlow CRM.
                        </p>
                      </div>
                    </div>

                    {wooStatus?.isConnected && (
                      <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-500/10 flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Store Connected</span>
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-6">
                {wooStatus?.isConnected ? (
                  /* Connected State Dashboard */
                  <div className="space-y-6">
                    <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                        <div>
                          <p className="font-semibold text-base">
                            {wooStatus.storeUrl}
                          </p>
                          <p className="text-emerald-700 dark:text-emerald-500 text-sm font-medium mt-0.5">
                            REST API credentials encrypted at rest. Status: <strong>Authorized</strong>
                          </p>
                          <p className="text-muted-foreground text-xs mt-1.5 font-medium">
                            Last synchronized: {wooStatus.lastSyncedAt ? new Date(wooStatus.lastSyncedAt).toLocaleString() : 'Not synced yet'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                          <a href={wooStatus.storeUrl} target="_blank" rel="noreferrer">
                            Visit Store <ExternalLink className="w-4 h-4 ml-2 text-muted-foreground" />
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to disconnect this WooCommerce store?')) {
                              disconnectWooMutation.mutate();
                            }
                          }}
                          disabled={disconnectWooMutation.isPending}
                        >
                          <Unlink className="w-4 h-4 mr-2" />
                          Disconnect
                        </Button>
                      </div>
                    </div>

                    {/* Actions: Sync Orders & Import Products */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 rounded-xl bg-muted/50 border flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                            <RefreshCw className="w-4 h-4 text-indigo-600" />
                            <span>Sync Recent Orders</span>
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Pulls all recent Pending & Processing orders from WooCommerce and imports them into your NexusFlow CRM Orders list.
                          </p>
                        </div>
                        <Button
                          className="mt-5 w-full"
                          onClick={() => syncOrdersMutation.mutate()}
                          disabled={syncOrdersMutation.isPending}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${syncOrdersMutation.isPending ? 'animate-spin' : ''}`} />
                          {syncOrdersMutation.isPending ? 'Syncing...' : 'Sync Orders Now'}
                        </Button>
                      </div>

                      <div className="p-5 rounded-xl bg-muted/50 border flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                            <Download className="w-4 h-4 text-emerald-600" />
                            <span>Import Product Catalog</span>
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Imports your products, SKUs, and stock quantities from WooCommerce into your NexusFlow CRM Products catalog.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="mt-5 w-full text-emerald-600 border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                          onClick={() => syncProductsMutation.mutate()}
                          disabled={syncProductsMutation.isPending}
                        >
                          <Download className={`w-4 h-4 mr-2 ${syncProductsMutation.isPending ? 'animate-bounce' : ''}`} />
                          {syncProductsMutation.isPending ? 'Importing...' : 'Import Products Catalog'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Connect Form */
                  <form onSubmit={handleConnectWooSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">WooCommerce Store Website URL</label>
                        <Input
                          placeholder="https://yourstore.com"
                          value={wooUrl}
                          onChange={(e) => setWooUrl(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Consumer Key</label>
                          <Input
                            placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            value={wooConsumerKey}
                            onChange={(e) => setWooConsumerKey(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Consumer Secret</label>
                          <div className="relative">
                            <Input
                              type={showSecret ? 'text' : 'password'}
                              placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                              value={wooConsumerSecret}
                              onChange={(e) => setWooConsumerSecret(e.target.value)}
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowSecret(!showSecret)}
                              className="absolute right-0 top-0 h-9 w-9 text-muted-foreground"
                              title={showSecret ? 'Hide' : 'Show'}
                            >
                              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-step Help Box */}
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm space-y-3">
                      <p className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                        <span className="text-lg">💡</span> How to get Consumer Key & Consumer Secret in WordPress:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-indigo-700/80 dark:text-indigo-300 font-medium leading-relaxed pl-1">
                        <li>Go to your WordPress Admin dashboard &rarr; <strong className="text-indigo-700 dark:text-indigo-400">WooCommerce</strong> &rarr; <strong className="text-indigo-700 dark:text-indigo-400">Settings</strong></li>
                        <li>Click the <strong className="text-indigo-700 dark:text-indigo-400">Advanced</strong> tab &rarr; <strong className="text-indigo-700 dark:text-indigo-400">REST API</strong></li>
                        <li>Click the <strong className="text-indigo-700 dark:text-indigo-400">Add key</strong> button</li>
                        <li>Set Description: <strong className="bg-background px-1.5 py-0.5 rounded border">NexusFlow CRM</strong>, and Permissions: <strong className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">Read/Write</strong></li>
                        <li>Click <strong className="text-indigo-700 dark:text-indigo-400">Generate API key</strong> &rarr; Copy the Consumer Key and Consumer Secret and paste them above!</li>
                      </ol>
                    </div>

                    <div>
                      <Button
                        type="submit"
                        className="w-full sm:w-auto"
                        disabled={connectWooMutation.isPending}
                      >
                        <Key className="w-4 h-4 mr-2" />
                        {connectWooMutation.isPending ? 'Connecting...' : 'Connect & Verify WooCommerce Store'}
                      </Button>
                    </div>
                  </form>
                )}
                </div>
              </div>

              {/* METHOD 2: Real-Time Webhook Instructions (Optional) */}
              <div className="space-y-5 pt-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span>Option 2 — Webhook (Real-time)</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Optional: Whenever a customer places an order on your WooCommerce checkout, WordPress instantly notifies NexusFlow CRM in real-time.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-xl bg-muted/50 border shadow-sm space-y-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      1
                    </div>
                    <h4 className="text-sm font-semibold">Go to Settings</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                      In WordPress Admin: <strong>WooCommerce</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Advanced</strong> &rarr; <strong>Webhooks</strong>.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-muted/50 border shadow-sm space-y-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      2
                    </div>
                    <h4 className="text-sm font-semibold">Add Webhook</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                      Click blue <strong>&quot;Add Webhook&quot;</strong> button. Set Name: <strong>NexusFlow Sync</strong>.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-muted/50 border shadow-sm space-y-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      3
                    </div>
                    <h4 className="text-sm font-semibold">Enter Values</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                      Topic: <strong>Order created</strong><br />
                      Delivery URL: <strong>(Copy box below)</strong><br />
                      Status: <strong>Active</strong>
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm space-y-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm">
                      4
                    </div>
                    <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-500">Save & Done</h4>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400/80 leading-relaxed font-medium">
                      Click <strong>Save Webhook</strong>. Orders will now push automatically to your CRM!
                    </p>
                  </div>
                </div>

                {/* Quick Webhook Values Box */}
                <div className="p-5 rounded-xl bg-card border shadow-sm space-y-4">
                  <h4 className="text-sm font-semibold">Values to paste into WooCommerce Webhook settings:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wide">Delivery URL</span>
                      <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg border font-mono text-primary text-sm font-medium">
                        <span className="truncate flex-1">{publicWebhookUrl}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(publicWebhookUrl, 'Delivery URL')}
                          className="h-8 w-8 shrink-0"
                          title="Copy"
                        >
                          {copiedField === 'Delivery URL' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wide">Secret / Tenant ID</span>
                      <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg border font-mono text-primary text-sm font-medium">
                        <span className="truncate flex-1">{tenantId}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(tenantId, 'Secret')}
                          className="h-8 w-8 shrink-0"
                          title="Copy"
                        >
                          {copiedField === 'Secret' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Landing Page / HTML Form Snippet */}
          {activeTab === 'embed' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-3">
                    <span>Landing Page Order Form (Ready to Paste)</span>
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-500/10 uppercase tracking-widest text-[10px]">Zero Dependency</Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Copy and paste this HTML & JavaScript code directly into your custom landing page or website. It includes Dhaka / Outside Dhaka delivery radio buttons and instant submission to your CRM.
                  </p>
                </div>

                <Button
                  onClick={() => copyToClipboard(embedCodeSnippet, 'Landing Page Code')}
                  className="shrink-0"
                >
                  {copiedField === 'Landing Page Code' ? (
                    <Check className="w-4 h-4 text-emerald-300 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  <span>{copiedField === 'Landing Page Code' ? 'Code Copied!' : 'Copy Entire Code'}</span>
                </Button>
              </div>

              <div className="rounded-xl overflow-hidden border bg-muted/30">
                <pre className="p-6 text-sm font-mono text-muted-foreground overflow-x-auto max-h-[500px] leading-relaxed">
                  {embedCodeSnippet}
                </pre>
              </div>
            </div>
          )}

          {/* Tab 3: REST API & Developers */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-3">
                  <span>REST API Specification</span>
                  <Badge variant="outline" className="border-cyan-500 text-cyan-600 bg-cyan-500/10 uppercase tracking-widest text-[10px]">CORS Enabled</Badge>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  For developers building with Next.js, React, Node.js, PHP, or custom shopping carts.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-sm font-semibold block">cURL Example (Pre-filled with your Tenant ID):</span>
                <div className="relative rounded-xl overflow-hidden border bg-muted/30">
                  <pre className="p-6 text-sm font-mono text-muted-foreground overflow-x-auto leading-relaxed">
{`curl -X POST "${publicWebhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tenant_id": "${tenantId}",
    "customer_name": "Tariqul Islam",
    "customer_phone": "01711223344",
    "customer_address": "House 14, Road 5, Dhanmondi, Dhaka",
    "delivery_charge": 70,
    "notes": "Please call before delivery",
    "items": [
      {
        "name": "Men Premium Panjabi",
        "sell_price": 1450,
        "quantity": 1
      }
    ]
  }'`}
                  </pre>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(
                        `curl -X POST "${publicWebhookUrl}" -H "Content-Type: application/json" -d '{"tenant_id":"${tenantId}","customer_name":"Tariqul Islam","customer_phone":"01711223344","customer_address":"House 14, Road 5, Dhanmondi, Dhaka","delivery_charge":70,"notes":"Please call before delivery","items":[{"name":"Men Premium Panjabi","sell_price":1450,"quantity":1}]}'`,
                        'cURL'
                      )
                    }
                    className="absolute top-4 right-4 bg-background"
                    title="Copy cURL"
                  >
                    {copiedField === 'cURL' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-card border text-sm space-y-3">
                <strong className="block font-semibold">Expected JSON Response (HTTP 201):</strong>
                <pre className="font-mono text-xs text-primary bg-muted/50 p-4 rounded-lg border overflow-x-auto">
{`{
  "success": true,
  "data": {
    "message": "Order placed successfully into NexusFlow CRM",
    "orderId": "6576b9e2-127e-4e4d-9744-db36656a403c",
    "totalAmount": 1520,
    "status": "pending",
    "createdAt": "2026-10-03T07:30:00.000Z"
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Tab 4: Live Test Order Simulator */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-3">
                  <span>Live Test Order Simulator</span>
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-500/10 uppercase tracking-widest text-[10px]">Real-Time Test</Badge>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Send a real test order directly into your NexusFlow CRM to verify that your account receives web orders properly!
                </p>
              </div>

              {testResult && (
                <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Success! Test Order Created</span>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-500 font-medium">
                    Order ID: <strong className="font-mono">{testResult.orderId}</strong> | Total Amount: <strong>{formatBDT(testResult.totalAmount)}</strong>
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/orders"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-2 transition-colors"
                    >
                      <span>View this order in your Orders dashboard &rarr;</span>
                    </Link>
                  </div>
                </div>
              )}

              <form onSubmit={handleTestOrderSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-6 bg-card border rounded-xl shadow-sm">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer Name</label>
                  <Input
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer Phone Number</label>
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Delivery Address</label>
                  <Input
                    value={testAddress}
                    onChange={(e) => setTestAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Name</label>
                  <Input
                    value={testProductName}
                    onChange={(e) => setTestProductName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product Price (৳)</label>
                    <Input
                      type="number"
                      value={testPrice}
                      onChange={(e) => setTestPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery Charge (৳)</label>
                    <Input
                      type="number"
                      value={testDelivery}
                      onChange={(e) => setTestDelivery(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 pt-4">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={testOrderMutation.isPending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {testOrderMutation.isPending ? 'Sending...' : 'Send Test Order to My CRM'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
