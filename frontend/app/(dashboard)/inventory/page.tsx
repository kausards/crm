'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUpDown,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useAuth, useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  buy_price: number;
  sell_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOwner = user?.role === 'owner';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // Form states for Add Product
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);

  // Form states for Stock Adjust
  const [adjustDirection, setAdjustDirection] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('manual_adjust');

  // Query products
  const { data, isLoading } = useQuery<{
    items: ProductItem[];
    pagination: { total: number; totalPages: number; page: number };
  }>({
    queryKey: ['products', search, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '25');
      return fetchApi(`/api/v1/products?${params.toString()}`);
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (body: unknown) =>
      fetchApi('/api/v1/products', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Product created and stock ledger initialized!', 'success');
      setAddModalOpen(false);
      resetAddForm();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-products'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to create product', 'error');
    },
  });

  // Adjust stock mutation
  const adjustStockMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      fetchApi(`/api/v1/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Stock balance updated and movement ledger recorded!', 'success');
      setAdjustModalOpen(false);
      setSelectedProduct(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-products'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to adjust stock', 'error');
    },
  });

  // Archive product mutation
  const archiveMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/v1/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Product archived', 'info');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to archive product', 'error');
    },
  });

  const resetAddForm = () => {
    setName('');
    setSku('');
    setBuyPrice(0);
    setSellPrice(0);
    setInitialStock(0);
    setLowStockThreshold(5);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate({
      name,
      sku: sku || undefined,
      buy_price: Number(buyPrice) || 0,
      sell_price: Number(sellPrice) || 0,
      stock_quantity: Number(initialStock) || 0,
      low_stock_threshold: Number(lowStockThreshold) || 5,
    });
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    adjustStockMutation.mutate({
      id: selectedProduct.id,
      body: {
        direction: adjustDirection,
        quantity: Number(adjustQty),
        reason: adjustReason,
      },
    });
  };

  const products: ProductItem[] = Array.isArray(data) ? data : data?.items || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1, page: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-sora text-xl sm:text-2xl font-bold text-white tracking-tight">
            Inventory & Stock Control
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time multi-item inventory tracking with deterministic stock ledger
          </p>
        </div>

        {isOwner && (
          <Button variant="primary" size="md" onClick={() => setAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Button>
        )}
      </div>

      {/* Stock Valuation KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl p-5 shadow-glow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Active Catalog SKUs
            </span>
            <span className="font-sora text-2xl font-bold text-white tabular-nums">
              {pagination.total} Items
            </span>
          </div>
          <div className="p-3 bg-brand-violet/10 border border-brand-violet/20 rounded-xl text-purple-300">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl p-5 shadow-glow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Est. Stock Valuation
            </span>
            <span className="font-sora text-2xl font-bold text-white tabular-nums">
              {formatBDT(
                products.reduce((acc, p) => acc + (p.buy_price * p.stock_quantity), 0)
              )}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl p-5 shadow-glow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Critical Low Stock
            </span>
            <span className="font-sora text-2xl font-bold text-amber-400 tabular-nums">
              {products.filter(p => p.stock_quantity <= p.low_stock_threshold).length} SKUs
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl p-4 shadow-glow-card flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by title or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-[#100D15] border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-violet transition-all"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl shadow-glow-card overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <Boxes className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No products found in inventory.</p>
            {isOwner && (
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => setAddModalOpen(true)}
              >
                Add Your First Product
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#100D15] border-b border-white/[0.08] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Wholesale (Buy)</th>
                  <th className="py-3.5 px-4">Retail (Sell)</th>
                  <th className="py-3.5 px-4">Gross Margin</th>
                  <th className="py-3.5 px-4">Stock Level</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {products.map((prod) => {
                  const isLow = prod.stock_quantity <= prod.low_stock_threshold;
                  const isOutOfStock = prod.stock_quantity <= 0;
                  const unitMargin = prod.sell_price - prod.buy_price;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {prod.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-purple-300">
                        {prod.sku || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {formatBDT(prod.buy_price)}
                      </td>
                      <td className="py-3.5 px-4 font-sora font-bold text-white tabular-nums">
                        {formatBDT(prod.sell_price)}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-medium">
                        +{formatBDT(unitMargin)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold font-sora tabular-nums ${
                              isOutOfStock
                                ? 'text-rose-400'
                                : isLow
                                ? 'text-amber-400'
                                : 'text-slate-100'
                            }`}
                          >
                            {prod.stock_quantity} units
                          </span>
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Low Stock
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(prod);
                              setAdjustModalOpen(true);
                            }}
                            title="Adjust Stock Quantity"
                            className="px-2.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <ArrowUpDown className="w-3 h-3 text-purple-300" />
                            <span>Adjust</span>
                          </button>

                          {isOwner && (
                            <button
                              onClick={() => {
                                if (confirm(`Archive product "${prod.name}"?`)) {
                                  archiveMutation.mutate(prod.id);
                                }
                              }}
                              title="Archive Product"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-white/[0.05] rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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


        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-950/60 border-t border-slate-800 text-xs">
            <span className="text-slate-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} products)
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

      {/* Add Product Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Inventory Product"
        maxWidth="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Product Title"
            placeholder="e.g. Premium Cotton Polo Shirt"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU / Barcode (Optional)"
              placeholder="POLO-BLK-M"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />

            <Input
              type="number"
              min="0"
              label="Low Stock Threshold"
              helperText="Alert when inventory drops to or below"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              type="number"
              min="0"
              step="1"
              label="Wholesale Buy Price (৳)"
              placeholder="350"
              value={buyPrice || ''}
              onChange={(e) => setBuyPrice(Number(e.target.value))}
              required
            />

            <Input
              type="number"
              min="0"
              step="1"
              label="Retail Sell Price (৳)"
              placeholder="650"
              value={sellPrice || ''}
              onChange={(e) => setSellPrice(Number(e.target.value))}
              required
            />

            <Input
              type="number"
              min="0"
              step="1"
              label="Initial Stock Quantity"
              placeholder="50"
              value={initialStock || ''}
              onChange={(e) => setInitialStock(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createProductMutation.isPending}
            >
              Create Product & Initialize Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`Adjust Stock — ${selectedProduct?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <p className="text-xs text-slate-300">
            Current Stock: <strong className="text-white">{selectedProduct?.stock_quantity} units</strong>. Every adjustment is immutably logged in the stock ledger.
          </p>

          <Select
            label="Adjustment Direction"
            value={adjustDirection}
            onChange={(e) => setAdjustDirection(e.target.value as 'in' | 'out')}
            options={[
              { value: 'in', label: 'Stock IN (+) — Received shipment or found stock' },
              { value: 'out', label: 'Stock OUT (-) — Damaged, lost, or manual deduction' },
            ]}
          />

          <Input
            type="number"
            min="1"
            label="Quantity to Adjust"
            value={adjustQty}
            onChange={(e) => setAdjustQty(Number(e.target.value))}
            required
          />

          <Select
            label="Reason for Adjustment"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            options={[
              { value: 'manual_adjust', label: 'Manual Count Correction' },
              { value: 'supplier_received', label: 'Supplier Shipment Received' },
              { value: 'damaged_loss', label: 'Damaged or Expired Goods' },
              { value: 'audit_adjustment', label: 'Physical Store Audit Adjustment' },
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdjustModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={adjustStockMutation.isPending}
            >
              Commit Stock Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
