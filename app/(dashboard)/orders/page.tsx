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
  Calendar,
  Eye,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

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
  { label: 'At Risk', value: 'flagged' },
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
  const [search, setSearch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [chosenCourier, setChosenCourier] = useState<string>('steadfast');

  // Fetch Orders query
  const { data, isLoading } = useQuery<{
    items: OrderRecord[];
    pagination: { total: number; totalPages: number; page: number };
  }>({
    queryKey: ['orders', activeTab, search, fromDate, toDate, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeTab) params.set('status', activeTab);
      if (search) params.set('search', search);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
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

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab) params.set('status', activeTab);
      if (search) params.set('search', search);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      toast('Preparing full export...', 'info');
      const res = await fetch(`/api/v1/export/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to generate export file');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders_manifest_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast('Full orders manifest exported successfully!', 'success');
    } catch (err: any) {
      toast(err?.message || 'Export failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-xl text-white">
            Orders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage and track all your orders.
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

      {/* Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Orders</span>
            <Truck className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 tabular-nums">
            {pagination.total || orders.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">This month</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">At Risk</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 tabular-nums">
            {orders.filter((o) => o.is_flagged || o.status === 'flagged').length}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1">Possible returns</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">In Transit</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-2 tabular-nums">
            {orders.filter((o) => o.status === 'shipped').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">In transit</p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Delivered</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 tabular-nums">
            {orders.filter((o) => o.status === 'delivered').length}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">Successfully delivered</p>
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

        {/* Search & Date Filter Ribbon */}
        <div className="flex flex-col gap-3 pt-2 border-t border-white/[0.06]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer name, phone, or order ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="glass-input w-full pl-9 pr-3 py-2 text-xs"
              />
            </div>

            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 font-label self-start sm:self-auto"
              >
                Clear search
              </button>
            )}
          </div>

          {/* Date Range Sub-ribbon */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.04]">
            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-label">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              <span>Date Filter:</span>
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="glass-input text-xs px-2.5 py-1"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="glass-input text-xs px-2.5 py-1"
            />
            <button
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setFromDate(today);
                setToDate(today);
                setPage(1);
              }}
              className="text-xs px-2 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg text-slate-300 font-label"
            >
              Today
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                const today = now.toISOString().slice(0, 10);
                setFromDate(firstDay);
                setToDate(today);
                setPage(1);
              }}
              className="text-xs px-2 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg text-slate-300 font-label"
            >
              This Month
            </button>
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
                className="text-xs text-slate-400 hover:text-white font-label ml-1"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders Glass Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <Truck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-headline font-semibold">No orders in this view</p>
            {(activeTab || search || fromDate || toDate) && (
              <button
                onClick={() => {
                  setActiveTab('');
                  setSearch('');
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
                className="mt-2 text-xs text-violet-400 hover:underline font-label"
              >
                Reset all filters
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
                      <td className="py-3 px-4">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-mono font-medium text-slate-300 hover:text-violet-400 flex items-center gap-1 group transition-colors"
                        >
                          <span>#{order.id.slice(0, 8)}</span>
                          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" />
                        </Link>
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
                          <Link
                            href={`/orders/${order.id}`}
                            title="View Order Details"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

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
