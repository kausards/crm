'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  Plus,
  Search,
  ArrowUpDown,
  AlertTriangle,
  TrendingUp,
  Trash2,
  PackageCheck,
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[10px] font-mono font-medium border border-violet-500/25">
              Stock Ledger
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl md:text-3xl text-white tracking-tight mt-1.5">
            Products &amp; Inventory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-body">
            Real-time stock valuation, wholesale margins &amp; warehouse allocations
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Total SKUs</span>
            <Boxes className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-white mt-2 tabular-nums">
            {pagination.total}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-body">Active items in catalog</p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Inventory Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-emerald-400 mt-2 tabular-nums font-mono">
            {formatBDT(products.reduce((acc, p) => acc + (p.buy_price * p.stock_quantity), 0))}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1 font-body">Wholesale buy valuation</p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-amber-400 mt-2 tabular-nums">
            {products.filter((p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length}
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1 font-body">Below safety threshold</p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-rose-400 mt-2 tabular-nums">
            {products.filter((p) => p.stock_quantity <= 0).length}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1 font-body">Requires immediate purchase</p>
        </div>
      </div>

      {/* Search Ribbon */}
      <div className="glass-card p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="catalog-search"
            type="text"
            placeholder="Search SKU tag, product title..."
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
            className="text-xs text-slate-400 hover:text-white px-2 py-1 font-label"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Products Glass Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-500 font-body">
            Loading products catalog...
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <Boxes className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-headline font-semibold">No products in inventory</p>
            {isOwner && (
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => setAddModalOpen(true)}
              >
                Add First Product
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase font-label text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Product Name</th>
                  <th className="py-3.5 px-4 font-semibold">SKU</th>
                  <th className="py-3.5 px-4 font-semibold">Buy Price</th>
                  <th className="py-3.5 px-4 font-semibold">Sell Price</th>
                  <th className="py-3.5 px-4 font-semibold">Margin</th>
                  <th className="py-3.5 px-4 font-semibold">Stock Qty</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {products.map((prod) => {
                  const isLow = prod.stock_quantity <= prod.low_stock_threshold && prod.stock_quantity > 0;
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
                      <td className="py-3.5 px-4 font-mono text-violet-300">
                        {prod.sku || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {formatBDT(prod.buy_price)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white tabular-nums">
                        {formatBDT(prod.sell_price)}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-mono font-medium">
                        +{formatBDT(unitMargin)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold font-mono tabular-nums ${
                              isOutOfStock
                                ? 'text-rose-400'
                                : isLow
                                ? 'text-amber-400'
                                : 'text-slate-100'
                            }`}
                          >
                            {prod.stock_quantity}
                          </span>
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Low Stock
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedProduct(prod);
                              setAdjustModalOpen(true);
                            }}
                            title="Adjust Stock"
                            className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 rounded-lg text-xs font-label font-medium flex items-center gap-1 transition-all"
                          >
                            <ArrowUpDown className="w-3 h-3 text-violet-400" />
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
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border-t border-white/10 text-xs">
            <span className="text-slate-400 font-label">
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
        title="Add Inventory Product"
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
              label="SKU / Barcode"
              placeholder="POLO-BLK-M"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />

            <Input
              type="number"
              min="0"
              label="Low Stock Threshold"
              helperText="Alerts trigger when quantity ≤ this"
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
              label="Wholesale Buy (৳)"
              placeholder="350"
              value={buyPrice || ''}
              onChange={(e) => setBuyPrice(Number(e.target.value))}
              required
            />

            <Input
              type="number"
              min="0"
              step="1"
              label="Retail Sell (৳)"
              placeholder="650"
              value={sellPrice || ''}
              onChange={(e) => setSellPrice(Number(e.target.value))}
              required
            />

            <Input
              type="number"
              min="0"
              step="1"
              label="Initial Quantity"
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
              Create Product
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
          <p className="text-xs text-slate-400 font-body">
            Current Stock: <strong className="text-white font-mono">{selectedProduct?.stock_quantity} units</strong>. Every adjustment is immutably logged.
          </p>

          <Select
            label="Adjustment Direction"
            value={adjustDirection}
            onChange={(e) => setAdjustDirection(e.target.value as 'in' | 'out')}
            options={[
              { value: 'in', label: 'Stock IN (+) — Received shipment / found inventory' },
              { value: 'out', label: 'Stock OUT (-) — Damaged, returned to supplier, or lost' },
            ]}
          />

          <Input
            type="number"
            min="1"
            label="Units to Adjust"
            value={adjustQty}
            onChange={(e) => setAdjustQty(Number(e.target.value))}
            required
          />

          <Select
            label="Reason"
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
              Commit Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
