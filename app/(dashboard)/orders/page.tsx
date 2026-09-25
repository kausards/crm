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
import { Input, Select } from '@/components/ui/Input';
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
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Flagged', value: 'flagged' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Shipped', value: 'shipped' },
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

  const orders = data?.items || [];
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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Orders exported to CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Order Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage customer orders, fraud alerts, and courier dispatches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Link href="/orders/new">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4" />
              <span>New Order</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/80">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search by Phone / Customer */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer phone number..."
              value={searchPhone}
              onChange={(e) => {
                setSearchPhone(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {searchPhone && (
            <button
              onClick={() => setSearchPhone('')}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            Loading orders list...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <Truck className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No orders found.</p>
            {activeTab && (
              <button
                onClick={() => setActiveTab('')}
                className="mt-2 text-xs text-emerald-400 hover:underline"
              >
                Clear status filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Amount / COD</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Courier</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((order) => {
                  const isConfirmable =
                    order.status === 'pending' ||
                    order.status === 'flagged' ||
                    order.status === 'on_hold';

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/30 transition-colors"
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
                        <div className="text-[11px] text-slate-400">
                          {order.customer_phone}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">
                          {order.customer_address}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-300">
                          {order.order_items?.length || 0} item(s)
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                          {order.order_items
                            ?.map((i) => `${i.products?.name || 'Product'} ×${i.quantity}`)
                            .join(', ')}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-white">
                          {formatBDT(order.total_amount)}
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          COD: {formatBDT(order.cod_amount)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge status={order.status} />
                      </td>

                      <td className="py-3 px-4 text-slate-400 capitalize">
                        {order.courier_provider || '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {formatDate(order.created_at)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isConfirmable && (
                            <button
                              onClick={() => handleOpenConfirm(order)}
                              title="Confirm Order & Dispatch Courier"
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Confirm
                            </button>
                          )}

                          {order.status === 'pending' && (
                            <button
                              onClick={() => holdMutation.mutate(order.id)}
                              title="Put on hold"
                              className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-md"
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
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md"
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
          <div className="flex items-center justify-between p-4 bg-slate-950/60 border-t border-slate-800 text-xs">
            <span className="text-slate-400">
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
        title={`Confirm Order #${selectedOrder?.id?.slice(0, 8)}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Confirming this order will pre-validate inventory, deduct product stocks from the ledger, and dispatch a consignment parcel to your courier service.
          </p>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
            <div className="text-slate-400">Customer: <strong className="text-white">{selectedOrder?.customer_name}</strong> ({selectedOrder?.customer_phone})</div>
            <div className="text-slate-400">Address: <span className="text-slate-300">{selectedOrder?.customer_address}</span></div>
            <div className="text-slate-400">COD to collect: <strong className="text-emerald-400">{formatBDT(selectedOrder?.cod_amount)}</strong></div>
          </div>

          <Select
            label="Select Courier Provider"
            value={chosenCourier}
            onChange={(e) => setChosenCourier(e.target.value)}
            options={[
              { value: 'steadfast', label: 'Steadfast Courier (Recommended)' },
              { value: 'pathao', label: 'Pathao Courier' },
              { value: 'redx', label: 'RedX Logistics' },
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
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
