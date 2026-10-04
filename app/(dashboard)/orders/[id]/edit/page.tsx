'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Save,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface OrderItemState {
  product_id: string;
  name: string;
  sku: string | null;
  sell_price: number;
  quantity: number;
  stock_quantity?: number;
}

interface InventoryProduct {
  id: string;
  name: string;
  sku: string | null;
  sell_price: number;
  stock_quantity: number;
  is_active: boolean;
}

export default function OrderEditPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch full order
  const { data: order, isLoading: orderLoading, error } = useQuery<any>({
    queryKey: ['order-detail', orderId],
    queryFn: () => fetchApi(`/api/v1/orders/${orderId}`),
    enabled: Boolean(orderId),
  });

  // Fetch inventory products for the "Add Product" selector
  const { data: productsData } = useQuery<{ items: InventoryProduct[] }>({
    queryKey: ['products-for-order'],
    queryFn: () => fetchApi('/api/v1/products?limit=100'),
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

  // Action handlers
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: newQty } : it))
    );
  };

  const handleUpdatePrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, sell_price: newPrice } : it))
    );
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      toast('An order must have at least one product item', 'error');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    toast('Item removed from order', 'info');
  };

  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast('Please select a product from inventory', 'error');
      return;
    }
    const product = inventoryProducts.find((p) => p.id === selectedProductId);
    if (!product) return;

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
        toast(`Risk Detected: ${res.flagReason || 'Customer flagged'}`, 'error');
      } else {
        toast('Steadfast courier profile verified!', 'success');
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to check courier risk', 'error');
    } finally {
      setIsCheckingFraud(false);
    }
  };

  // Save changes mutation
  const saveMutation = useMutation({
    mutationFn: (body: any) =>
      fetchApi(`/api/v1/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Order updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      router.push(`/orders/${orderId}`);
    },
    onError: (err: any) => {
      toast(err?.message || 'Failed to save order updates', 'error');
    },
  });

  const handleSave = () => {
    if (items.length === 0) {
      toast('Order must contain at least one product item', 'error');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      toast('Customer name and phone are required', 'error');
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

  const isRiskOrder =
    Boolean(fraudInfo.fraudComment) ||
    Boolean(fraudInfo.fraudReports && fraudInfo.fraudReports > 0) ||
    Boolean(fraudInfo.deliveryRatio !== undefined && fraudInfo.deliveryRatio !== null && fraudInfo.deliveryRatio < 50) ||
    Boolean(fraudInfo.cancelRatio !== undefined && fraudInfo.cancelRatio !== null && fraudInfo.cancelRatio > 50) ||
    fraudInfo.isFlagged;

  if (orderLoading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-2" />
        <p className="text-sm">Loading order editor...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-20 text-center text-rose-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p>Order not found or access denied.</p>
        <Link href={`/orders/${orderId}`}>
          <Button variant="outline" className="mt-4">Go Back</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/orders/${orderId}`}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white font-headline flex items-center gap-2">
              Edit Order #{orderId.slice(0, 8)}
              <Badge status={order.status} showDot={true} />
            </h1>
            <p className="text-xs text-slate-400">
              Created on {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/orders/${orderId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            variant="primary"
            isLoading={saveMutation.isPending}
            onClick={handleSave}
            className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Fraud Risk Banner */}
      <div className={`p-4 rounded-xl border transition-all ${isRiskOrder ? 'bg-rose-950/25 border-rose-500/40 text-rose-200' : 'bg-emerald-950/15 border-emerald-500/20 text-emerald-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            {isRiskOrder ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>Steadfast Courier Risk Status</span>
                {isRiskOrder ? (
                  <span className="px-2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase">High Risk</span>
                ) : (
                  <span className="px-2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">Verified Safe</span>
                )}
              </div>
              <div className="text-xs opacity-80 mt-1">
                Delivery Ratio: <strong className="text-white font-mono">{fraudInfo.deliveryRatio ?? 'N/A'}%</strong> • 
                Cancel Ratio: <strong className="text-white font-mono">{fraudInfo.cancelRatio ?? 'N/A'}%</strong> • 
                Fraud Reports: <strong className="text-white font-mono">{fraudInfo.fraudReports || 0}</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunFraudCheck}
            disabled={isCheckingFraud}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-medium shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingFraud ? 'animate-spin' : ''}`} />
            <span>Check Risk</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Customer & Logistics info */}
        <div className="space-y-6">
          <div className="glass-card p-5 space-y-4">
            <h4 className="font-headline font-bold text-sm text-slate-300 flex items-center gap-2 border-b border-white/[0.08] pb-3">
              <User className="w-4 h-4 text-violet-400" />
              Customer Information
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="glass-input w-full p-2.5 text-sm"
                  placeholder="Customer Full Name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="glass-input w-full p-2.5 text-sm font-mono"
                  placeholder="017XXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Delivery Address *</label>
                <textarea
                  rows={3}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="glass-input w-full p-2.5 text-sm resize-none"
                  placeholder="Detailed address..."
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h4 className="font-headline font-bold text-sm text-slate-300 flex items-center gap-2 border-b border-white/[0.08] pb-3">
              <Package className="w-4 h-4 text-indigo-400" />
              Logistics & Notes
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Delivery Charge (৳ BDT)</label>
                <input
                  type="number"
                  min="0"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value)))}
                  className="glass-input w-full p-2.5 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Sales Team Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="glass-input w-full p-2.5 text-sm resize-none"
                  placeholder="Sales notes, call records..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Items */}
        <div className="glass-card p-5 space-y-5 flex flex-col">
          <h4 className="font-headline font-bold text-sm text-slate-300 flex items-center gap-2 border-b border-white/[0.08] pb-3">
            <Package className="w-4 h-4 text-violet-400" />
            Order Items ({items.length})
          </h4>

          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const lineSubtotal = (Number(item.sell_price) || 0) * (Number(item.quantity) || 1);
              return (
                <div key={`${item.product_id}-${idx}`} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white text-sm">{item.name}</div>
                      {item.sku && <div className="text-xs text-slate-400 font-mono">SKU: {item.sku}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 block mb-1">Unit Price (৳)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.sell_price}
                        onChange={(e) => handleUpdatePrice(idx, Number(e.target.value))}
                        className="glass-input w-full p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Quantity</label>
                      <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 rounded bg-white/[0.05] hover:bg-white/10 disabled:opacity-30 text-white flex items-center justify-center font-bold"
                        >-</button>
                        <span className="w-8 text-center font-mono font-bold text-white text-sm">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                          className="w-7 h-7 rounded bg-white/[0.05] hover:bg-white/10 text-white flex items-center justify-center font-bold"
                        >+</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-xs pt-2 border-t border-white/[0.06]">
                    <span className="text-slate-400 mr-2">Subtotal:</span>
                    <span className="font-mono font-bold text-emerald-400">{formatBDT(lineSubtotal)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2 mt-4">
            <label className="block text-xs font-semibold text-slate-300">Add Another Product:</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="glass-input flex-1 p-2 text-xs bg-[#0c0e14] text-slate-200"
              >
                <option value="">-- Choose Product --</option>
                {inventoryProducts.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} {prod.sku ? `(${prod.sku})` : ''} — ৳{prod.sell_price}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                  className="glass-input w-16 p-2 text-center text-xs font-mono text-white"
                />
                <Button variant="outline" size="sm" onClick={handleAddProduct} type="button">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </div>
          </div>

          {/* Financial Totals */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 mt-4">
            <div className="flex justify-between items-center text-sm text-slate-300 mb-2">
              <span>Items Subtotal</span>
              <span className="font-mono">{formatBDT(itemsSubtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-300 mb-3 border-b border-white/10 pb-3">
              <span>Delivery Charge</span>
              <span className="font-mono">+{formatBDT(deliveryCharge)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-200 font-bold">Total Order Value</span>
              <span className="font-mono font-bold text-violet-400 text-lg">{formatBDT(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
