'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

interface OrderItemState {
  product_id: string;
  name: string;
  sku: string | null;
  sell_price: number;
  quantity: number;
  stock_quantity?: number;
}

interface OrderInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onOpenConfirm?: (order: any) => void;
  onOpenHold?: (order: any) => void;
  onOpenCancel?: (order: any) => void;
}

interface InventoryProduct {
  id: string;
  name: string;
  sku: string | null;
  sell_price: number;
  stock_quantity: number;
  is_active: boolean;
}

export function OrderInspectorModal({
  isOpen,
  onClose,
  orderId,
  onOpenConfirm,
  onOpenHold,
  onOpenCancel,
}: OrderInspectorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch full order
  const { data: order, isLoading: orderLoading } = useQuery<any>({
    queryKey: ['order-detail', orderId],
    queryFn: () => fetchApi(`/api/v1/orders/${orderId}`),
    enabled: Boolean(isOpen && orderId),
  });

  // Fetch inventory products for the "Add Product" selector
  const { data: productsData } = useQuery<{ items: InventoryProduct[] }>({
    queryKey: ['products-for-order'],
    queryFn: () => fetchApi('/api/v1/products?limit=100'),
    enabled: isOpen,
  });

  const inventoryProducts: InventoryProduct[] = productsData?.items || [];

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemState[]>([]);

  // Add product state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  // Live fraud check state
  const [isCheckingFraud, setIsCheckingFraud] = useState(false);
  const [fraudInfo, setFraudInfo] = useState<{
    deliveryRatio?: number | null;
    cancelRatio?: number | null;
    fraudReports?: number;
    fraudComment?: string | null;
    isFlagged?: boolean;
    flagReason?: string | null;
  }>({});

  // Sync form state when order loads
  useEffect(() => {
    if (order) {
      setCustomerName(order.customer_name || '');
      setCustomerPhone(order.customer_phone || '');
      setCustomerAddress(order.customer_address || '');
      setDeliveryCharge(Number(order.delivery_charge) || 0);
      setNotes(order.notes || '');

      const parsedItems: OrderItemState[] = (order.order_items || []).map((it: any) => ({
        product_id: it.product_id,
        name: it.products?.name || 'Product',
        sku: it.products?.sku || null,
        sell_price: Number(it.sell_price) || 0,
        quantity: Math.max(1, Number(it.quantity) || 1),
        stock_quantity: it.products?.stock_quantity,
      }));
      setItems(parsedItems);

      setFraudInfo({
        deliveryRatio: order.courier_delivery_ratio,
        cancelRatio: order.courier_cancel_ratio,
        fraudReports: order.courier_fraud_reports || 0,
        fraudComment: order.courier_fraud_comment || null,
        isFlagged: order.is_flagged,
        flagReason: order.flag_reason,
      });
    }
  }, [order]);

  // Recalculated values
  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.sell_price) || 0) * (Number(item.quantity) || 1), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return itemsSubtotal + Math.max(0, Number(deliveryCharge) || 0);
  }, [itemsSubtotal, deliveryCharge]);

  // Quantity controllers
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: newQty } : it))
    );
  };

  // Delete product from order
  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      toast('An order must have at least one product item', 'error');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    toast('Item removed from order', 'info');
  };

  // Add product to order
  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast('Please select a product from inventory', 'error');
      return;
    }
    const product = inventoryProducts.find((p) => p.id === selectedProductId);
    if (!product) return;

    // Check if already in items
    const existingIndex = items.findIndex((it) => it.product_id === product.id);
    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: it.quantity + selectedQty } : it
        )
      );
      toast(`Increased quantity for ${product.name}`, 'success');
    } else {
      setItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          sell_price: Number(product.sell_price) || 0,
          quantity: Math.max(1, selectedQty),
          stock_quantity: product.stock_quantity,
        },
      ]);
      toast(`Added ${product.name} to order`, 'success');
    }

    setSelectedProductId('');
    setSelectedQty(1);
  };

  // Save changes mutation
  const saveMutation = useMutation({
    mutationFn: (body: any) =>
      fetchApi(`/api/v1/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Order and customer information updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onClose();
    },
    onError: (err: any) => {
      toast(err?.message || 'Failed to save order updates', 'error');
    },
  });

  const handleSave = () => {
    if (!orderId) return;
    if (items.length === 0) {
      toast('Order must contain at least one product item', 'error');
      return;
    }
    if (!customerName.trim()) {
      toast('Customer name is required', 'error');
      return;
    }
    if (!customerPhone.trim()) {
      toast('Customer phone is required', 'error');
      return;
    }

    saveMutation.mutate({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_address: customerAddress.trim(),
      delivery_charge: Math.max(0, Number(deliveryCharge) || 0),
      notes: notes.trim(),
      items: items.map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        sell_price: it.sell_price,
      })),
    });
  };

  // Set Back to Pending mutation
  const pendingMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/api/v1/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'pending' }),
      }),
    onSuccess: () => {
      toast('Order status reset back to Pending!', 'success');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
    },
    onError: (err: any) => {
      toast(err?.message || 'Failed to reset status', 'error');
    },
  });

  // Live Steadfast Fraud check
  const handleRunFraudCheck = async () => {
    const phone = customerPhone.trim();
    if (!phone) {
      toast('Please enter a valid phone number first', 'error');
      return;
    }

    try {
      setIsCheckingFraud(true);
      const res = await fetchApi<{
        phone: string;
        isFlagged: boolean;
        flagReason?: string;
        deliveryRatio?: number;
        cancelRatio?: number;
        fraudReports?: number;
        fraudComment?: string;
      }>(`/api/v1/courier/fraud-check?phone=${encodeURIComponent(phone)}`);

      setFraudInfo({
        deliveryRatio: res.deliveryRatio,
        cancelRatio: res.cancelRatio,
        fraudReports: res.fraudReports || 0,
        fraudComment: res.fraudComment || null,
        isFlagged: res.isFlagged,
        flagReason: res.flagReason,
      });

      if (res.isFlagged) {
        toast(`Risk Detected: ${res.flagReason || 'Customer flagged by courier intelligence'}`, 'error');
      } else {
        toast('Steadfast courier profile verified: Healthy delivery track record!', 'success');
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to check courier risk', 'error');
    } finally {
      setIsCheckingFraud(false);
    }
  };

  const isRiskOrder =
    Boolean(fraudInfo.fraudComment) ||
    Boolean(fraudInfo.fraudReports && fraudInfo.fraudReports > 0) ||
    Boolean(fraudInfo.deliveryRatio !== undefined && fraudInfo.deliveryRatio !== null && fraudInfo.deliveryRatio < 50) ||
    Boolean(fraudInfo.cancelRatio !== undefined && fraudInfo.cancelRatio !== null && fraudInfo.cancelRatio > 50) ||
    fraudInfo.isFlagged;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order & Customer Inspector #${orderId?.slice(0, 8)}`}
      maxWidth="6xl"
    >
      {orderLoading ? (
        <div className="py-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-2" />
          <p className="text-xs">Loading order data & customer history...</p>
        </div>
      ) : !order ? (
        <div className="py-12 text-center text-rose-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>Order not found or access denied.</p>
        </div>
      ) : (
        <div className="space-y-5 text-xs text-slate-200">
          {/* Top Bar: Status, Date, Full Page Link */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center gap-2">
              <Badge status={order.status} showDot={true} />
              <span className="text-[11px] text-slate-400 font-mono">
                Created: {formatDate(order.created_at)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Status Buttons */}
              {(order.status === 'on_hold' || order.status === 'cancelled') && (
                <button
                  type="button"
                  onClick={() => pendingMutation.mutate()}
                  disabled={pendingMutation.isPending}
                  className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-[11px] font-medium transition-colors"
                >
                  Set Back to Pending
                </button>
              )}

              {order.status === 'pending' && onOpenHold && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenHold(order);
                    onClose();
                  }}
                  className="px-2.5 py-1 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 rounded-lg text-[11px] font-medium transition-colors"
                >
                  Put On Hold
                </button>
              )}

              {order.status !== 'cancelled' && order.status !== 'delivered' && onOpenCancel && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenCancel(order);
                    onClose();
                  }}
                  className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-lg text-[11px] font-medium transition-colors"
                >
                  Cancel Order
                </button>
              )}

              {['pending', 'flagged', 'on_hold'].includes(order.status) && onOpenConfirm && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenConfirm(order);
                    onClose();
                  }}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-[11px] font-semibold transition-colors shadow-sm"
                >
                  Confirm & Dispatch
                </button>
              )}

              <Link
                href={`/orders/${order.id}`}
                target="_blank"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
              >
                <span>Full Page</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* LEFT SIDEBAR (1/3 Width) */}
            <div className="space-y-5 lg:col-span-1">
              {/* Steadfast Courier Fraud Risk Banner */}
              <div
            className={`p-3.5 rounded-xl border transition-all ${
              isRiskOrder
                ? 'bg-rose-950/25 border-rose-500/40 text-rose-200'
                : 'bg-emerald-950/15 border-emerald-500/20 text-emerald-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                {isRiskOrder ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                )}
                <div>
                  <div className="font-semibold text-xs flex items-center gap-2">
                    <span>Steadfast Courier Delivery & Fraud Risk</span>
                    {isRiskOrder ? (
                      <span className="px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider">
                        High Risk
                      </span>
                    ) : (
                      <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                        Verified Safe
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Delivery Ratio:{' '}
                    <strong className="text-white font-mono">
                      {fraudInfo.deliveryRatio !== undefined && fraudInfo.deliveryRatio !== null
                        ? `${fraudInfo.deliveryRatio}%`
                        : 'N/A'}
                    </strong>
                    {' • '}
                    Cancel Ratio:{' '}
                    <strong className="text-white font-mono">
                      {fraudInfo.cancelRatio !== undefined && fraudInfo.cancelRatio !== null
                        ? `${fraudInfo.cancelRatio}%`
                        : 'N/A'}
                    </strong>
                    {' • '}
                    Fraud Reports:{' '}
                    <strong className="text-white font-mono">{fraudInfo.fraudReports || 0}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunFraudCheck}
                disabled={isCheckingFraud}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white text-[11px] font-medium shrink-0 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingFraud ? 'animate-spin' : ''}`} />
                <span>{isCheckingFraud ? 'Checking...' : 'Check Steadfast Risk'}</span>
              </button>
            </div>

            {/* Fraud Comment Alert */}
            {fraudInfo.fraudComment && (
              <div className="mt-2.5 p-2 rounded-lg bg-rose-900/40 border border-rose-500/50 text-[11px] text-rose-200">
                <strong className="text-white">Steadfast Fraud Remark:</strong> {fraudInfo.fraudComment}
              </div>
            )}
            {fraudInfo.flagReason && !fraudInfo.fraudComment && (
              <div className="mt-2 text-[11px] text-rose-300">
                <strong>Reason:</strong> {fraudInfo.flagReason}
              </div>
            )}
          </div>

          {/* Customer Information (Editable) */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5 border-b border-white/[0.06] pb-1.5">
              <User className="w-3.5 h-3.5 text-violet-400" />
              <span>Customer Information (Editable)</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Full Name"
                  className="glass-input w-full p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="glass-input w-full p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Delivery Address *
                </label>
                <textarea
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Detailed address (house, road, area, city/district)..."
                  className="glass-input w-full p-2 text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Delivery Charge (৳ BDT)
                </label>
                <input
                  type="number"
                  min="0"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value)))}
                  className="glass-input w-full p-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Sales Team Notes / Instructions
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sales notes, call records, delivery requests..."
                  className="glass-input w-full p-2 text-xs"
                />
              </div>
            </div>
          </div>
            </div>

            {/* RIGHT MAIN COLUMN (2/3 Width) */}
            <div className="lg:col-span-2 space-y-5">
              {/* Products & Items Section */}
              <div className="space-y-3 pt-2 lg:pt-0">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
              <h4 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-violet-400" />
                <span>Order Items & Products ({items.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Add, change quantity, or delete products freely
              </span>
            </div>

            {/* Current Items Table */}
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.01]">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] border-b border-white/10 text-slate-400 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Product Name & SKU</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {items.map((item, idx) => {
                    const lineSubtotal = (Number(item.sell_price) || 0) * (Number(item.quantity) || 1);
                    return (
                      <tr key={`${item.product_id}-${idx}`} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-white">{item.name}</div>
                          {item.sku && (
                            <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-200">
                          {formatBDT(item.sell_price)}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-6 h-6 rounded bg-white/[0.06] hover:bg-white/15 disabled:opacity-30 text-white flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-mono font-bold text-white text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                              className="w-6 h-6 rounded bg-white/[0.06] hover:bg-white/15 text-white flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          {formatBDT(lineSubtotal)}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            title="Delete product from order"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add New Product Ribbon */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300">
                + Add Another Product from Inventory:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="glass-input flex-1 p-2 text-xs bg-[#0c0e14] text-slate-200"
                >
                  <option value="">-- Choose Product from Catalog --</option>
                  {inventoryProducts.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} {prod.sku ? `(${prod.sku})` : ''} — ৳{prod.sell_price} (Stock: {prod.stock_quantity})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                    className="glass-input w-16 p-2 text-center text-xs font-mono text-white"
                    placeholder="Qty"
                  />
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="flex items-center gap-1 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Totals Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div>
                <span className="text-[10px] text-slate-400 block">Items Subtotal:</span>
                <span className="font-mono font-bold text-white text-sm">{formatBDT(itemsSubtotal)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Delivery Charge:</span>
                <span className="font-mono font-bold text-slate-300 text-sm">+{formatBDT(deliveryCharge)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Total Order Value:</span>
                <span className="font-mono font-bold text-violet-400 text-sm">{formatBDT(totalAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 font-semibold block">COD Receivable:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{formatBDT(totalAmount)}</span>
              </div>
            </div>
          </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Changes update order records, calculations, and customer database instantly.
            </span>

            <div className="flex items-center gap-2.5 ml-auto">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>
                Close
              </Button>

              <Button
                variant="primary"
                size="sm"
                type="button"
                isLoading={saveMutation.isPending}
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save All Changes</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
