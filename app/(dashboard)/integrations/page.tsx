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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
<form id="nexusflow-checkout-form" style="max-width: 480px; margin: 0 auto; font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
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

  <button type="submit" id="nf_submit_btn" style="width: 100%; background: #7c3aed; color: #fff; padding: 12px; font-size: 15px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer;">
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
<\/script>`;

  return (
    <div className="flex flex-col w-full gap-7 max-w-[1400px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-xl text-white">
            Website &amp; Store
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Connect your store to automatically receive orders.
          </p>
        </div>

        <Link
          href="/orders"
          className="btn-glass flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 self-start sm:self-auto"
        >
          <ShoppingBag className="w-4 h-4 text-violet-400" />
          <span>View Orders ({integration?.webOrdersCount || 0} Total)</span>
        </Link>
      </div>

      {/* Top Credentials Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connected Website Domain Card */}
        <div className="glass-card p-5 rounded-2xl relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-violet-400" />
                Store Website
              </span>
              <span className="badge-green text-[10px] font-semibold">
                {integration?.websiteUrl || wooStatus?.isConnected ? 'Connected' : 'Setup Required'}
              </span>
            </div>

            {isEditingWebsite ? (
              <div className="space-y-2 mt-2">
                <input
                  type="url"
                  placeholder="https://yourstore.com"
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  className="w-full text-xs bg-black/60 border border-violet-500/40 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateIntegrationMutation.mutate({ website_url: websiteInput })
                    }
                    disabled={updateIntegrationMutation.isPending}
                    className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingWebsite(false)}
                    className="px-3 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-headline font-bold text-base text-white truncate mt-1">
                  {wooStatus?.storeUrl || integration?.websiteUrl || 'No domain linked yet'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {wooStatus?.isConnected
                    ? 'Connected'
                    : integration?.websiteUrl
                    ? 'Orders from this domain are accepted'
                    : 'Click below to attach your online shop domain'}
                </p>
              </div>
            )}
          </div>

          {!isEditingWebsite && (
            <button
              onClick={() => {
                setWebsiteInput(wooStatus?.storeUrl || integration?.websiteUrl || '');
                setIsEditingWebsite(true);
              }}
              className="mt-4 text-left text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
            >
              <span>{integration?.websiteUrl || wooStatus?.storeUrl ? 'Change Website URL' : '+ Add Store Website'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Tenant ID / Store ID Card */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">
                Tenant ID
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/[0.06] font-mono text-xs text-violet-300 break-all select-all">
              {tenantId}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Pass this ID in your webhook payload or script to map orders to this account.
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(tenantId, 'Tenant ID')}
            className="mt-3 py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5"
          >
            {copiedField === 'Tenant ID' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedField === 'Tenant ID' ? 'Copied Tenant ID' : 'Copy Tenant ID'}</span>
          </button>
        </div>

        {/* Public Order Webhook URL Card */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">
                Webhook URL
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/[0.06] font-mono text-xs text-cyan-300 break-all select-all">
              {publicWebhookUrl}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Endpoint for WooCommerce Webhooks, Landing Pages, and Custom Apps.
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(publicWebhookUrl, 'Webhook URL')}
            className="mt-3 py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5"
          >
            {copiedField === 'Webhook URL' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedField === 'Webhook URL' ? 'Copied Webhook URL' : 'Copy Webhook URL'}</span>
          </button>
        </div>
      </div>

      {/* Integration Guides Navigation Tabs */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4 mb-6">
          <button
            onClick={() => setActiveTab('woo')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'woo'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>WooCommerce (Key & Secret / Webhook)</span>
            {wooStatus?.isConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('embed')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'embed'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Landing Page / HTML Form</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'api'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>REST API / Developers</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ml-auto ${
              activeTab === 'test'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Live Test Order Simulator</span>
          </button>
        </div>

        {/* Tab 1: WooCommerce Integration (Method 1: Consumer Key/Secret + Method 2: Webhook) */}
        {activeTab === 'woo' && (
          <div className="space-y-8">
            {/* METHOD 1: Direct Consumer Key & Consumer Secret Connection */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-violet-500/25 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Option 1 — WooCommerce API</span>
                      <span className="badge-purple text-[10px]">Recommended</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Direct 2-way connection. Fetch orders and import your WooCommerce product catalog directly into NexusFlow CRM.
                    </p>
                  </div>
                </div>

                {wooStatus?.isConnected && (
                  <span className="badge-green text-xs font-semibold flex items-center gap-1.5 px-3 py-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Store Connected</span>
                  </span>
                )}
              </div>

              {wooStatus?.isConnected ? (
                /* Connected State Dashboard */
                <div className="space-y-5 pt-2">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-white text-sm">
                          {wooStatus.storeUrl}
                        </p>
                        <p className="text-emerald-300 text-[11px] mt-0.5">
                          REST API credentials encrypted at rest. Status: <strong>Authorized</strong>
                        </p>
                        <p className="text-slate-400 text-[10px] mt-1">
                          Last synchronized: {wooStatus.lastSyncedAt ? new Date(wooStatus.lastSyncedAt).toLocaleString() : 'Not synced yet'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={wooStatus.storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] rounded-lg text-slate-200 text-xs flex items-center gap-1"
                      >
                        <span>Visit Store</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to disconnect this WooCommerce store?')) {
                            disconnectWooMutation.mutate();
                          }
                        }}
                        disabled={disconnectWooMutation.isPending}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs flex items-center gap-1 transition"
                      >
                        <Unlink className="w-3 h-3" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions: Sync Orders & Import Products */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-white flex items-center gap-1.5 mb-1">
                          <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
                          <span>Sync Recent Orders</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Pulls all recent Pending & Processing orders from WooCommerce and imports them into your NexusFlow CRM Orders list.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={() => syncOrdersMutation.mutate()}
                        isLoading={syncOrdersMutation.isPending}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-2" />
                        <span>Sync Orders Now</span>
                      </Button>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-white flex items-center gap-1.5 mb-1">
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Import Product Catalog</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Imports your products, SKUs, and stock quantities from WooCommerce into your NexusFlow CRM Products catalog.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-4 w-full text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
                        onClick={() => syncProductsMutation.mutate()}
                        isLoading={syncProductsMutation.isPending}
                      >
                        <Download className="w-3.5 h-3.5 mr-2" />
                        <span>Import Products Catalog</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Connect Form */
                <form onSubmit={handleConnectWooSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <Input
                        label="WooCommerce Store Website URL"
                        placeholder="https://yourstore.com"
                        value={wooUrl}
                        onChange={(e) => setWooUrl(e.target.value)}
                        required
                      />
                    </div>

                    <div className="sm:col-span-3 sm:grid sm:grid-cols-2 gap-4">
                      <Input
                        label="Consumer Key"
                        placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={wooConsumerKey}
                        onChange={(e) => setWooConsumerKey(e.target.value)}
                        required
                      />

                      <div className="relative">
                        <Input
                          label="Consumer Secret"
                          type={showSecret ? 'text' : 'password'}
                          placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={wooConsumerSecret}
                          onChange={(e) => setWooConsumerSecret(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-3 top-8 text-slate-400 hover:text-white"
                          title={showSecret ? 'Hide' : 'Show'}
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step-by-step Help Box */}
                  <div className="p-4 rounded-xl bg-black/50 border border-white/[0.08] text-xs space-y-2">
                    <p className="font-semibold text-violet-300">
                      💡 How to get Consumer Key & Consumer Secret in WordPress:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                      <li>Go to your WordPress Admin dashboard &rarr; <strong>WooCommerce</strong> &rarr; <strong>Settings</strong></li>
                      <li>Click the <strong>Advanced</strong> tab &rarr; <strong>REST API</strong></li>
                      <li>Click the <strong>Add key</strong> button</li>
                      <li>Set Description: <strong className="text-white">NexusFlow CRM</strong>, and Permissions: <strong className="text-emerald-400">Read/Write</strong></li>
                      <li>Click <strong>Generate API key</strong> &rarr; Copy the Consumer Key and Consumer Secret and paste them above!</li>
                    </ol>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={connectWooMutation.isPending}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      <span>Connect & Verify WooCommerce Store</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* METHOD 2: Real-Time Webhook Instructions (Optional) */}
            <div className="space-y-4 pt-2 border-t border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Option 2 — Webhook (Real-time)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Optional: Whenever a customer places an order on your WooCommerce checkout, WordPress instantly notifies NexusFlow CRM in real-time.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                  <div className="w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <h4 className="text-xs font-semibold text-white">Go to Settings</h4>
                  <p className="text-[11px] text-slate-400">
                    In WordPress Admin: <strong>WooCommerce</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Advanced</strong> &rarr; <strong>Webhooks</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                  <div className="w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <h4 className="text-xs font-semibold text-white">Add Webhook</h4>
                  <p className="text-[11px] text-slate-400">
                    Click blue <strong>&quot;Add Webhook&quot;</strong> button. Set Name: <strong>NexusFlow Sync</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                  <div className="w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <h4 className="text-xs font-semibold text-white">Enter Values</h4>
                  <p className="text-[11px] text-slate-400">
                    Topic: <strong>Order created</strong><br />
                    Delivery URL: <strong>(Copy box below)</strong><br />
                    Status: <strong>Active</strong>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    4
                  </div>
                  <h4 className="text-xs font-semibold text-white">Save & Done</h4>
                  <p className="text-[11px] text-slate-400">
                    Click <strong>Save Webhook</strong>. Orders will now push automatically to your CRM!
                  </p>
                </div>
              </div>

              {/* Quick Webhook Values Box */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                <h4 className="text-xs font-semibold text-slate-200">Values to paste into WooCommerce Webhook settings:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Delivery URL</span>
                    <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-cyan-300 text-xs">
                      <span className="truncate flex-1">{publicWebhookUrl}</span>
                      <button
                        onClick={() => copyToClipboard(publicWebhookUrl, 'Delivery URL')}
                        className="p-1 hover:text-white"
                        title="Copy"
                      >
                        {copiedField === 'Delivery URL' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Secret / Tenant ID</span>
                    <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-violet-300 text-xs">
                      <span className="truncate flex-1">{tenantId}</span>
                      <button
                        onClick={() => copyToClipboard(tenantId, 'Secret')}
                        className="p-1 hover:text-white"
                        title="Copy"
                      >
                        {copiedField === 'Secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Landing Page / HTML Form Snippet */}
        {activeTab === 'embed' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Landing Page Order Form (Ready to Paste)</span>
                  <span className="badge-green text-[10px]">Zero Dependency</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Copy and paste this HTML & JavaScript code directly into your custom landing page or website. It includes Dhaka / Outside Dhaka delivery radio buttons and instant submission to your CRM.
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(embedCodeSnippet, 'Landing Page Code')}
                className="btn-gradient-glow flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white"
              >
                {copiedField === 'Landing Page Code' ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedField === 'Landing Page Code' ? 'Code Copied!' : 'Copy Entire Code'}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-black/70 border border-white/[0.08] text-xs font-mono text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {embedCodeSnippet}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: REST API & Developers */}
        {activeTab === 'api' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>REST API Specification</span>
                <span className="badge-cyan text-[10px]">CORS Enabled</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                For developers building with Next.js, React, Node.js, PHP, or custom shopping carts.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-300">cURL Example (Pre-filled with your Tenant ID):</span>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-black/70 border border-white/[0.08] text-xs font-mono text-emerald-300 overflow-x-auto">
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
                <button
                  onClick={() =>
                    copyToClipboard(
                      `curl -X POST "${publicWebhookUrl}" -H "Content-Type: application/json" -d '{"tenant_id":"${tenantId}","customer_name":"Tariqul Islam","customer_phone":"01711223344","customer_address":"House 14, Road 5, Dhanmondi, Dhaka","delivery_charge":70,"notes":"Please call before delivery","items":[{"name":"Men Premium Panjabi","sell_price":1450,"quantity":1}]}'`,
                      'cURL'
                    )
                  }
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-300 hover:text-white"
                  title="Copy cURL"
                >
                  {copiedField === 'cURL' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 space-y-1">
              <strong className="text-white block font-semibold mb-1">Expected JSON Response (HTTP 201):</strong>
              <pre className="font-mono text-[11px] text-cyan-300">
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
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Live Test Order Simulator</span>
                <span className="badge-green text-[10px]">Real-Time Test</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Send a real test order directly into your NexusFlow CRM to verify that your account receives web orders properly!
              </p>
            </div>

            {testResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Success! Test Order Created</span>
                </div>
                <p className="text-slate-300">
                  Order ID: <strong className="font-mono text-white">{testResult.orderId}</strong> | Total Amount: <strong className="text-emerald-300">{formatBDT(testResult.totalAmount)}</strong>
                </p>
                <div className="pt-1">
                  <Link
                    href="/orders"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                  >
                    <span>View this order in your Orders dashboard &rarr;</span>
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleTestOrderSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Customer Name"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                required
              />

              <Input
                label="Customer Phone Number"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                required
              />

              <div className="sm:col-span-2">
                <Input
                  label="Delivery Address"
                  value={testAddress}
                  onChange={(e) => setTestAddress(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Product Name"
                value={testProductName}
                onChange={(e) => setTestProductName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Product Price (৳)"
                  type="number"
                  value={testPrice}
                  onChange={(e) => setTestPrice(e.target.value)}
                  required
                />
                <Input
                  label="Delivery Charge (৳)"
                  type="number"
                  value={testDelivery}
                  onChange={(e) => setTestDelivery(e.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2 pt-2">
                <Button
                  variant="primary"
                  type="submit"
                  className="w-full sm:w-auto"
                  isLoading={testOrderMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  <span>Send Test Order to My CRM</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
