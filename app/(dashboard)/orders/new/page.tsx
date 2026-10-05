'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft, ShoppingBag, Truck } from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ProductOption {
  id: string;
  name: string;
  sku: string | null;
  sell_price: number;
  stock_quantity: number;
}

interface OrderItemRow {
  product_id: string;
  quantity: number;
  sell_price: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(60);
  const [courierProvider, setCourierProvider] = useState<string>('steadfast');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<OrderItemRow[]>([
    { product_id: '', quantity: 1, sell_price: 0 },
  ]);

  // Fetch available products
  const { data: productsData } = useQuery<{ items: ProductOption[] } | ProductOption[]>({
    queryKey: ['products-options'],
    queryFn: () => fetchApi('/api/v1/products?limit=100'),
  });

  const productList: ProductOption[] = Array.isArray(productsData)
    ? productsData
    : productsData?.items || [];
  const productMap = new Map(productList.map((p) => [p.id, p]));

  // Auto calculate totals
  const itemsSubtotal = items.reduce((acc, row) => {
    return acc + (Number(row.sell_price) || 0) * (Number(row.quantity) || 1);
  }, 0);

  const grandTotal = itemsSubtotal + Number(deliveryCharge || 0);

  const handleProductChange = (index: number, productId: string) => {
    const prod = productMap.get(productId);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_id: productId,
        sell_price: prod ? Number(prod.sell_price) : 0,
      };
      return copy;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: Math.max(1, qty) };
      return copy;
    });
  };

  const handlePriceChange = (index: number, price: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], sell_price: Math.max(0, price) };
      return copy;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { product_id: '', quantity: 1, sell_price: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (payload: unknown) =>
      fetchApi('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast('Order created successfully!', 'success');
      router.push('/orders');
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to create order', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate items
    const validItems = items.filter((i) => i.product_id);
    if (validItems.length === 0) {
      toast('Please select at least one product for the order', 'error');
      return;
    }

    createOrderMutation.mutate({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      delivery_charge: Number(deliveryCharge) || 0,
      courier_provider: courierProvider || null,
      notes: notes || undefined,
      items: validItems.map((i) => ({
        product_id: i.product_id,
        quantity: Number(i.quantity),
        sell_price: Number(i.sell_price),
      })),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Create New Order (POS)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Quick customer order entry with automated return risk screening
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details Card */}
          <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl p-5 shadow-glow-card space-y-4">
            <h3 className="font-headline text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Customer Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Customer Name"
                placeholder="e.g. Sazzad Hossain"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />

              <Input
                label="Phone Number"
                placeholder="017xxxxxxxx"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
            </div>

            <Input
              label="Full Delivery Address"
              placeholder="House 12, Road 4, Dhanmondi, Dhaka"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              required
            />
          </div>

          {/* Order Items Card */}
          <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl p-5 shadow-glow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Order Items
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItemRow}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((row, index) => {
                const selectedProd = productMap.get(row.product_id);

                return (
                  <div
                    key={index}
                    className="p-3 bg-[#100D15] border border-white/[0.08] rounded-xl flex flex-col sm:flex-row items-center gap-3"
                  >
                    {/* Product Selector */}
                    <div className="w-full sm:flex-1">
                      <select
                        value={row.product_id}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full px-3 py-2 bg-[#100D15] border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-violet transition-all"
                        required
                      >
                        <option value="">Select a product...</option>
                        {productList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.stock_quantity}) — {formatBDT(p.sell_price)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-2 bg-[#100D15] border border-white/10 rounded-xl text-xs sm:text-sm text-center text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-violet transition-all"
                        placeholder="Qty"
                        required
                      />
                    </div>

                    {/* Unit Sell Price */}
                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        value={row.sell_price}
                        onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 bg-[#100D15] border border-white/10 rounded-xl text-xs sm:text-sm text-right text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-violet transition-all"
                        placeholder="Price"
                        required
                      />
                    </div>

                    {/* Row Total */}
                    <div className="w-24 text-right font-bold text-xs sm:text-sm text-emerald-400">
                      {formatBDT((row.quantity || 1) * (row.sell_price || 0))}
                    </div>

                    {/* Remove button */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Courier & Summary */}
        <div className="space-y-6">
          <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl p-5 shadow-glow-card space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Delivery & Courier
            </h3>

            <Select
              label="Courier Service"
              value={courierProvider}
              onChange={(e) => setCourierProvider(e.target.value)}
              options={[
                { value: 'steadfast', label: 'Steadfast Courier' },
                { value: 'pathao', label: 'Pathao Logistics' },
                { value: 'redx', label: 'RedX Delivery' },
              ]}
            />

            <div>
              <label className="text-xs font-semibold text-slate-300 tracking-wide block mb-1.5">
                Delivery Charge (৳)
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setDeliveryCharge(60)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                    deliveryCharge === 60
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Inside Dhaka (৳60)
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryCharge(120)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                    deliveryCharge === 120
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Outside Dhaka (৳120)
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#100D15] border border-white/10 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-violet transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 tracking-wide block mb-1.5">
                Special Delivery Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Call before delivery, leave with guard, etc."
                className="w-full px-3 py-2 bg-[#100D15] border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-violet transition-all"
              />
            </div>
          </div>

          {/* Total & Checkout Card */}
          <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl p-5 shadow-glow-card space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Order Pricing
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Items Subtotal:</span>
                <span className="text-slate-200 font-medium">
                  {formatBDT(itemsSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Charge:</span>
                <span className="text-slate-200 font-medium">
                  {formatBDT(deliveryCharge)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                <span>Total COD Amount:</span>
                <span className="text-emerald-400 font-mono text-base">
                  {formatBDT(grandTotal)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3"
              isLoading={createOrderMutation.isPending}
            >
              Place & Save Order
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
