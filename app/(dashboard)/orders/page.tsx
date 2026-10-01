'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Truck,
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertTriangle,
  Download,
  Filter,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface OrderItemDetail {
  id: string;
  product_id: string;
  quantity: number;
  sell_price: number;
  products?: {
    name: string;
    sku: string | null;
  };
}

interface OrderRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: string;
  total_amount: number;
  cod_amount: number;
  delivery_charge: number;
  notes: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  courier_provider: string | null;
  created_at: string;
  order_items?: OrderItemDetail[];
}

const STATUS_TABS = [
  { label: 'All Orders', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Risk Flagged', value: 'flagged' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In Transit', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Returned', value: 'returned' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function OrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>('');
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [chosenCourier, setChosenCourier] = useState<string>('steadfast');

  // Fetch Orders query
  const { data, isLoading } = useQuery<{
    items: OrderRecord[];
    pagination: { total: number; totalPages: number; page: number };
  }>({
    queryKey: ['orders', activeTab, searchPhone, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeTab) params.set('status', activeTab);
      if (searchPhone) params.set('phone', searchPhone);
      params.set('page', String(page));
      params.set('limit', '20');
      return fetchApi(`/api/v1/orders?${params.toString()}`);
    },
  });

  // Confirm order mutation
  const confirmMutation = useMutation({
    mutationFn: ({ orderId, courier }: { orderId: string; courier: string }) =>
      fetchApi(`/api/v1/orders/${orderId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ courier_provider: courier }),
      }),
    onSuccess: () => {
      toast('Order confirmed, inventory deducted, and courier booked!', 'success');
      setConfirmModalOpen(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pnl'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to confirm order', 'error');
    },
  });

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: (orderId: string) =>
      fetchApi(`/api/v1/orders/${orderId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      toast('Order cancelled successfully', 'info');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to cancel order', 'error');
    },
  });

  // Hold order mutation
  const holdMutation = useMutation({
    mutationFn: (orderId: string) =>
      fetchApi(`/api/v1/orders/${orderId}/hold`, { method: 'POST' }),
    onSuccess: () => {
      toast('Order placed on hold', 'info');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to hold order', 'error');
    },
  });

  // Mark COD as collected mutation
  const codCollectedMutation = useMutation({
    mutationFn: ({ orderId, codCollected }: { orderId: string; codCollected: number }) =>
      fetchApi(`/api/v1/orders/${orderId}/cod-collected`, {
        method: 'PATCH',
        body: JSON.stringify({ cod_collected: codCollected }),
      }),
    onSuccess: () => {
      toast('COD amount marked as collected!', 'success');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to update COD', 'error');
    },
  });

  const orders: OrderRecord[] = Array.isArray(data) ? data : data?.items || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1, page: 1 };

  const handleOpenConfirm = (order: OrderRecord) => {
    setSelectedOrder(order);
    setChosenCourier(order.courier_provider || 'steadfast');
    setConfirmModalOpen(true);
  };

  const handleExportCSV = () => {
    if (orders.length === 0) {
      toast('No orders to export', 'info');
      return;
    }
    const headers = ['Order ID', 'Customer Name', 'Phone', 'Address', 'Status', 'Total', 'COD', 'Courier', 'Date'];
    const rows = orders.map((o) => [
      o.id,
      `"${o.customer_name.replace(/"/g, '""')}"`,
      `"${o.customer_phone}"`,
      `"${o.customer_address.replace(/"/g, '""')}"`,
      o.status,
      o.total_amount,
      o.cod_amount,
      o.courier_provider || '',
      o.created_at,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast('Manifest exported to CSV with UTF-8 encoding', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[10px] font-mono font-medium border border-violet-500/25">
              Fulfillment Engine
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-label font-medium border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Auto-Sync Active
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl md:text-3xl text-white tracking-tight mt-1.5">
            Orders Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-body">
            Direct consignment dispatch, risk analysis & lifecycle tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-xs font-label font-medium text-slate-200 backdrop-blur-md transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Manifest</span>
          </button>
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Order</span>
          </Link>
        </div>
      </div>

      {/* 4 Pipeline Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Total Orders</span>
            <Truck className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-white mt-2 tabular-nums">
            {pagination.total || orders.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-body">In current batch</p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Flagged Risks</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-rose-400 mt-2 tabular-nums">
            {orders.filter((o) => o.is_flagged || o.status === 'flagged').length}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1 font-body">High RTO likelihood</p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">In Transit</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-cyan-400 mt-2 tabular-nums">
            {orders.filter((o) => o.status === 'shipped').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-body">With Steadfast & Pathao</p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Delivered Success</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-emerald-400 mt-2 tabular-nums">
            {orders.filter((o) => o.status === 'delivered').length}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1 font-body">COD collected</p>
        </div>
      </div>

      {/* Filter Tabs & Search Ribbon */}
      <div className="glass-card p-3 space-y-3">
        {/* Horizontal Status Pills */}
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1.5 pb-1">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            const isFlagged = tab.value === 'flagged';

            return (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-label font-medium shrink-0 transition-all ${
                  isActive
                    ? isFlagged
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'bg-violet-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {isFlagged && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Ribbon */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search phone (+880...), customer name, invoice #..."
              value={searchPhone}
              onChange={(e) => {
                setSearchPhone(e.target.value);
                setPage(1);
              }}
              className="glass-input w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>

          {searchPhone && (
            <button
              onClick={() => setSearchPhone('')}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 font-label"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Orders Glass Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-500 font-body">
            Loading orders pipeline...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <Truck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-headline font-semibold">No orders in this view</p>
            {activeTab && (
              <button
                onClick={() => setActiveTab('')}
                className="mt-2 text-xs text-violet-400 hover:underline font-label"
              >
                Reset filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase font-label text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Items</th>
                  <th className="py-3.5 px-4 font-semibold">Amount / COD</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Courier</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {orders.map((order) => {
                  const isConfirmable =
                    order.status === 'pending' ||
                    order.status === 'flagged' ||
                    order.status === 'on_hold';

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        #{order.id.slice(0, 8)}
                        {order.is_flagged && (
                          <div
                            title={order.flag_reason || 'Risk flagged'}
                            className="inline-flex items-center gap-1 text-[10px] text-rose-400 mt-1 block font-sans"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Risk Alert</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">
                          {order.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {order.customer_phone}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">
                          {order.customer_address}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-300 font-medium">
                          {order.order_items?.length || 0} item(s)
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                          {order.order_items
                            ?.map((i) => `${i.products?.name || 'Product'} ×${i.quantity}`)
                            .join(', ')}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white tabular-nums">
                          {formatBDT(order.total_amount)}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          COD: {formatBDT(order.cod_amount)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge status={order.status} showDot={true} />
                      </td>

                      <td className="py-3 px-4">
                        {order.courier_provider ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-[11px] text-slate-300 font-label capitalize">
                            <Truck className="w-3 h-3 text-cyan-400" />
                            {order.courier_provider}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {formatDate(order.created_at)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isConfirmable && (
                            <button
                              onClick={() => handleOpenConfirm(order)}
                              title="Confirm Order & Dispatch Courier"
                              className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-label font-medium transition-colors"
                            >
                              Confirm
                            </button>
                          )}

                          {order.status === 'delivered' && (
                            <button
                              onClick={() =>
                                codCollectedMutation.mutate({
                                  orderId: order.id,
                                  codCollected: order.cod_amount,
                                })
                              }
                              title="Mark full COD as collected"
                              className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-label font-medium transition-colors"
                            >
                              COD ✓
                            </button>
                          )}

                          {order.status === 'pending' && (
                            <button
                              onClick={() => holdMutation.mutate(order.id)}
                              title="Put on hold"
                              className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-white/[0.05] rounded-lg transition-colors"
                            >
                              <PauseCircle className="w-4 h-4" />
                            </button>
                          )}

                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel this order?')) {
                                  cancelMutation.mutate(order.id);
                                }
                              }}
                              title="Cancel Order"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border-t border-white/10 text-xs">
            <span className="text-slate-400 font-label">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total orders)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={`Confirm Dispatch #${selectedOrder?.id?.slice(0, 8)}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-body">
            Pre-validates stock levels in warehouse, logs deterministic accounting entries, and books consignment.
          </p>

          <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10 text-xs space-y-1.5 font-body">
            <div className="text-slate-400">
              Customer: <strong className="text-white">{selectedOrder?.customer_name}</strong> ({selectedOrder?.customer_phone})
            </div>
            <div className="text-slate-400">
              Destination: <span className="text-slate-300">{selectedOrder?.customer_address}</span>
            </div>
            <div className="text-slate-400">
              COD Receivable: <strong className="text-emerald-400 font-mono">{formatBDT(selectedOrder?.cod_amount)}</strong>
            </div>
          </div>

          <Select
            label="Courier Integration Partner"
            value={chosenCourier}
            onChange={(e) => setChosenCourier(e.target.value)}
            options={[
              { value: 'steadfast', label: 'Steadfast Courier (Fastest SLA)' },
              { value: 'pathao', label: 'Pathao Courier (Dhaka Instant)' },
              { value: 'redx', label: 'RedX Logistics (Nationwide)' },
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={confirmMutation.isPending}
              onClick={() => {
                if (selectedOrder) {
                  confirmMutation.mutate({
                    orderId: selectedOrder.id,
                    courier: chosenCourier,
                  });
                }
              }}
            >
              Confirm & Book Courier
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
