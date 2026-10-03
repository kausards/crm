'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Printer,
  Truck,
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertTriangle,
  Phone,
  MapPin,
  User,
  Package,
  FileText,
  DollarSign,
  Edit,
  Clock,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { OrderInspectorModal } from '@/components/orders/OrderInspectorModal';
import { HoldOrderModal } from '@/components/orders/HoldOrderModal';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';

interface OrderItemDetail {
  id: string;
  product_id: string;
  quantity: number;
  sell_price: number;
  buy_price?: number;
  products?: {
    id: string;
    name: string;
    sku: string | null;
  };
}

interface CourierShipment {
  id: string;
  provider: string;
  consignment_id: string | null;
  tracking_code: string | null;
  status: string;
  updated_at: string;
}

interface OrderDetail {
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
  courier_delivery_ratio?: number | null;
  courier_cancel_ratio?: number | null;
  courier_fraud_reports?: number;
  courier_fraud_comment?: string | null;
  created_at: string;
  updated_at?: string;
  order_items?: OrderItemDetail[];
  courier_shipments?: CourierShipment[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [inspectorModalOpen, setInspectorModalOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [chosenCourier, setChosenCourier] = useState('steadfast');

  const { data: order, isLoading, error } = useQuery<OrderDetail>({
    queryKey: ['order-detail', id],
    queryFn: () => fetchApi(`/api/v1/orders/${id}`),
    enabled: Boolean(id),
  });

  const { data: riskSettings } = useQuery<{ minDeliveryRatio: number; maxCancelRatio: number }>({
    queryKey: ['courier-risk-settings'],
    queryFn: () => fetchApi('/api/v1/courier/risk-settings'),
  });

  const minDelivery = riskSettings?.minDeliveryRatio ?? 50;
  const maxCancel = riskSettings?.maxCancelRatio ?? 50;

  const confirmMutation = useMutation({
    mutationFn: (courier: string) =>
      fetchApi(`/api/v1/orders/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ courier_provider: courier }),
      }),
    onSuccess: () => {
      toast('Order confirmed, inventory deducted, and courier booked!', 'success');
      setConfirmModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => {
      toast(err?.message || 'Failed to confirm order', 'error');
    },
  });

  const setPendingMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/api/v1/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'pending' }),
      }),
    onSuccess: () => {
      toast('Order moved back to Pending status', 'success');
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => {
      toast(err?.message || 'Failed to reset order to pending', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/orders" className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-6 w-48 bg-white/[0.06] rounded animate-pulse" />
        </div>
        <div className="glass-card p-6">
          <TableSkeleton rows={4} cols={4} />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-20 text-center glass-card p-8">
        <Package className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Order Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">
          The requested order does not exist or you do not have permission to view it.
        </p>
        <Link href="/orders">
          <Button variant="primary">Return to Orders</Button>
        </Link>
      </div>
    );
  }

  const itemsSubtotal = (order.order_items || []).reduce(
    (acc, item) => acc + (Number(item.sell_price) || 0) * (Number(item.quantity) || 0),
    0
  );

  const isPending = order.status === 'pending' || order.status === 'flagged' || order.status === 'on_hold';

  // Fraud and ratio risk evaluation
  const hasFraudComment = Boolean(order.courier_fraud_comment && order.courier_fraud_comment.trim());
  const hasFraudReports = Boolean(order.courier_fraud_reports && order.courier_fraud_reports > 0);
  const isLowDelivery =
    order.courier_delivery_ratio !== undefined &&
    order.courier_delivery_ratio !== null &&
    order.courier_delivery_ratio < minDelivery;
  const isHighCancel =
    order.courier_cancel_ratio !== undefined &&
    order.courier_cancel_ratio !== null &&
    order.courier_cancel_ratio > maxCancel;

  const isRedRiskAlert =
    order.is_flagged ||
    order.status === 'flagged' ||
    hasFraudComment ||
    hasFraudReports ||
    isLowDelivery ||
    isHighCancel;

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:p-0 print:m-0">
      {/* Top Navigation & Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-slate-400">Order</span>
              <span className="font-mono font-bold text-white text-base">#{order.id.slice(0, 8)}</span>
              <Badge status={order.status} showDot={true} />
              {isRedRiskAlert && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Red Alert
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>Created on {formatDate(order.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-label text-slate-200 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Invoice</span>
          </button>

          {/* Full Inspector & Product Add/Delete Modal Trigger */}
          <Button variant="outline" size="sm" onClick={() => setInspectorModalOpen(true)}>
            <Edit className="w-3.5 h-3.5 mr-1 text-violet-400" />
            <span>Edit Details & Products</span>
          </Button>

          {/* Set Back to Pending if on hold or cancelled */}
          {(order.status === 'on_hold' || order.status === 'cancelled') && (
            <button
              onClick={() => setPendingMutation.mutate()}
              disabled={setPendingMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-label font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Set to Pending</span>
            </button>
          )}

          {isPending && (
            <>
              {order.status !== 'on_hold' && (
                <button
                  onClick={() => setHoldModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-label font-medium transition-colors"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Hold</span>
                </button>
              )}

              {order.status !== 'cancelled' && (
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-label font-medium transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setChosenCourier(order.courier_provider || 'steadfast');
                  setConfirmModalOpen(true);
                }}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-300" />
                <span>Confirm & Dispatch</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Flag / Risk Alert Banner if Risk Detected */}
      {isRedRiskAlert && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-200 font-headline uppercase tracking-wider flex items-center gap-2">
              <span>Courier Fraud & Delivery Risk Alert</span>
              {hasFraudComment && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 text-[10px] font-bold">
                  Fraud Reported
                </span>
              )}
            </h4>
            <div className="text-xs text-rose-300/90 font-body">
              {order.courier_fraud_comment ? (
                <div>
                  <strong className="text-white">Steadfast Fraud Note:</strong> {order.courier_fraud_comment}
                </div>
              ) : (
                order.flag_reason ||
                `Customer risk ratios exceed rules (Delivery: ${order.courier_delivery_ratio ?? 'N/A'}% vs min ${minDelivery}%, Cancel: ${order.courier_cancel_ratio ?? 'N/A'}% vs max ${maxCancel}%).`
              )}
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Header */}
      <div className="hidden print:block mb-8">
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-black">INVOICE</h1>
            <p className="text-sm text-gray-600">Order #{order.id.slice(0, 8)}</p>
            <p className="text-xs text-gray-500">Date: {formatDate(order.created_at)}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-black">NexusFlow Store</h2>
            <p className="text-xs text-gray-600">Bangladesh E-Commerce</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column (Customer & Logistics) */}
        <div className="space-y-5 md:col-span-1">
          {/* Customer Card */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-violet-400" />
                <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-slate-300">
                  Customer Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectorModalOpen(true)}
                className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
              >
                Edit
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Full Name</span>
                <span className="font-semibold text-white text-sm">{order.customer_name}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Phone Number</span>
                <a
                  href={`tel:${order.customer_phone}`}
                  className="font-mono text-violet-400 hover:underline flex items-center gap-1.5 mt-0.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{order.customer_phone}</span>
                </a>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Delivery Address</span>
                <div className="flex items-start gap-1.5 mt-0.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>{order.customer_address || 'No address provided'}</span>
                </div>
              </div>

              {/* Steadfast Courier Track Record */}
              <div className="pt-2.5 border-t border-white/[0.06] space-y-1.5">
                <span className="text-slate-400 text-[11px] font-semibold block flex items-center gap-1">
                  <Truck className="w-3 h-3 text-cyan-400" />
                  <span>Steadfast Track Record</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10">
                    <span className="text-slate-500 block text-[10px]">Delivery Rate</span>
                    <span
                      className={`font-mono font-bold ${
                        isLowDelivery ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {order.courier_delivery_ratio !== undefined && order.courier_delivery_ratio !== null
                        ? `${order.courier_delivery_ratio}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10">
                    <span className="text-slate-500 block text-[10px]">Cancel Rate</span>
                    <span
                      className={`font-mono font-bold ${
                        isHighCancel ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {order.courier_cancel_ratio !== undefined && order.courier_cancel_ratio !== null
                        ? `${order.courier_cancel_ratio}%`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {order.courier_fraud_reports !== undefined && order.courier_fraud_reports > 0 && (
                  <div className="text-[11px] text-rose-300">
                    Steadfast Fraud Reports: <strong className="font-mono">{order.courier_fraud_reports}</strong>
                  </div>
                )}
              </div>

              {order.notes && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <span className="text-slate-500 text-[11px] block">Sales Notes / Reason</span>
                  <p className="text-amber-300/90 text-[11px] mt-0.5">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Courier Card */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
              <Truck className="w-4 h-4 text-indigo-400" />
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-slate-300">
                Logistics & Dispatch
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Provider</span>
                <span className="font-semibold text-white capitalize">
                  {order.courier_provider || 'Not assigned'}
                </span>
              </div>

              {order.courier_shipments && order.courier_shipments.length > 0 ? (
                order.courier_shipments.map((s) => (
                  <div key={s.id} className="pt-2 border-t border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Consignment ID</span>
                      <span className="font-mono text-violet-300">{s.consignment_id || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Tracking Code</span>
                      <span className="font-mono text-emerald-400">{s.tracking_code || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Shipment Status</span>
                      <span className="text-xs uppercase font-bold text-slate-300">{s.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-500 pt-1">
                  Shipment will be created automatically once order is confirmed.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Columns (Items & Summary) */}
        <div className="space-y-5 md:col-span-2">
          {/* Order Items Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-violet-400" />
                <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-slate-300">
                  Order Items ({order.order_items?.length || 0})
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setInspectorModalOpen(true)}
                className="text-xs text-violet-400 hover:text-violet-300 font-medium"
              >
                + Add or Modify Items
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase font-label text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {(order.order_items || []).map((item) => {
                    const lineTotal = (Number(item.sell_price) || 0) * (Number(item.quantity) || 0);
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">
                            {item.products?.name || 'Product'}
                          </div>
                          {item.products?.sku && (
                            <span className="text-[10px] font-mono text-slate-500">
                              SKU: {item.products.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-white">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatBDT(item.sell_price)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatBDT(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                  {(!order.order_items || order.order_items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                        No item records attached to this invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Breakdown */}
            <div className="p-4 bg-white/[0.02] border-t border-white/[0.08] space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-mono text-slate-200">{formatBDT(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Delivery Charge:</span>
                <span className="font-mono text-slate-200">{formatBDT(order.delivery_charge || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/[0.08]">
                <span>Total Amount:</span>
                <span className="font-mono text-violet-400">{formatBDT(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-emerald-400">
                <span>Cash On Delivery (COD):</span>
                <span className="font-mono">{formatBDT(order.cod_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dispatch Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Dispatch Order to Courier"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Confirming this order will decrement inventory and create an automated consignment with the chosen courier provider.
          </p>

          <Select
            label="Courier Provider"
            value={chosenCourier}
            onChange={(e) => setChosenCourier(e.target.value)}
            options={[
              { value: 'steadfast', label: 'Steadfast Courier' },
              { value: 'pathao', label: 'Pathao Courier' },
              { value: 'redx', label: 'RedX Logistics' },
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate(chosenCourier)}
            >
              Confirm & Book Courier
            </Button>
          </div>
        </div>
      </Modal>

      {/* Hold Order Modal with Sales Note */}
      <HoldOrderModal
        isOpen={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        orderId={order.id}
        customerName={order.customer_name}
        totalAmount={order.total_amount}
        currentNotes={order.notes}
      />

      {/* Cancel Order Modal with Sales Note */}
      <CancelOrderModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        orderId={order.id}
        customerName={order.customer_name}
        totalAmount={order.total_amount}
        currentNotes={order.notes}
      />

      {/* Full Order & Customer Inspector & Product Editor Modal */}
      <OrderInspectorModal
        isOpen={inspectorModalOpen}
        onClose={() => setInspectorModalOpen(false)}
        orderId={order.id}
        onOpenConfirm={() => setConfirmModalOpen(true)}
        onOpenHold={() => setHoldModalOpen(true)}
        onOpenCancel={() => setCancelModalOpen(true)}
      />
    </div>
  );
}
