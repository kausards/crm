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
  Pencil,
  History,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useAuth, useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

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
  const isOwner =
    !user?.role ||
    user?.role === 'owner' ||
    user?.role === 'super_admin' ||
    user?.role === 'admin' ||
    Boolean((user as any)?.is_super_admin);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // Edit product state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editBuyPrice, setEditBuyPrice] = useState<number>(0);
  const [editSellPrice, setEditSellPrice] = useState<number>(0);
  const [editLowStockThreshold, setEditLowStockThreshold] = useState<number>(5);

  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<ProductItem | null>(null);

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

  // Edit product mutation
  const editProductMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      fetchApi(`/api/v1/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Product specifications updated successfully!', 'success');
      setEditModalOpen(false);
      setEditingProduct(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to update product', 'error');
    },
  });

  // Query stock movements history
  const { data: movementsData, isLoading: movementsLoading } = useQuery<{
    movements: Array<{
      id: string;
      direction: string;
      quantity: number;
      reason: string;
      created_at: string;
    }>;
  }>({
    queryKey: ['stock-movements', historyProduct?.id],
    queryFn: () => fetchApi(`/api/v1/products/${historyProduct!.id}/movements`),
    enabled: Boolean(historyProduct && historyModalOpen),
  });

  const openEditModal = (prod: ProductItem) => {
    setEditingProduct(prod);
    setEditName(prod.name);
    setEditSku(prod.sku || '');
    setEditBuyPrice(prod.buy_price);
    setSellPrice(prod.sell_price);
    setEditLowStockThreshold(prod.low_stock_threshold);
    setEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    editProductMutation.mutate({
      id: editingProduct.id,
      body: {
        name: editName,
        sku: editSku || null,
        buy_price: Number(editBuyPrice),
        sell_price: Number(editSellPrice),
        low_stock_threshold: Number(editLowStockThreshold),
      },
    });
  };

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
          <h1 className="font-bold text-xl text-white">
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track your products, stock, and pricing.
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Products</span>
            <Boxes className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 tabular-nums">
            {pagination.total}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total products</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Stock Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 tabular-nums font-mono">
            {formatBDT(products.reduce((acc, p) => acc + (p.buy_price * p.stock_quantity), 0))}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">Total stock value</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 tabular-nums">
            {products.filter((p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length}
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1">Need restocking</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 tabular-nums">
            {products.filter((p) => p.stock_quantity <= 0).length}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1">Out of stock</p>
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
          <TableSkeleton rows={6} cols={7} />
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
                          {isOwner && (
                            <button
                              onClick={() => openEditModal(prod)}
                              title="Edit Product Details"
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedProduct(prod);
                              setAdjustModalOpen(true);
                            }}
                            title="Adjust Stock"
                            className="px-2 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 rounded-lg text-xs font-label font-medium flex items-center gap-1 transition-all"
                          >
                            <ArrowUpDown className="w-3 h-3 text-violet-400" />
                            <span>Adjust</span>
                          </button>

                          <button
                            onClick={() => {
                              setHistoryProduct(prod);
                              setHistoryModalOpen(true);
                            }}
                            title="View Stock Movements History"
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-white/[0.08] rounded-lg transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
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

      {/* Edit Product Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Product Details"
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Product Title"
            placeholder="e.g. Premium Cotton Polo Shirt"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU / Barcode"
              placeholder="POLO-BLK-M"
              value={editSku}
              onChange={(e) => setEditSku(e.target.value)}
            />

            <Input
              type="number"
              min="0"
              label="Low Stock Threshold"
              helperText="Alert triggers when quantity ≤ this"
              value={editLowStockThreshold}
              onChange={(e) => setEditLowStockThreshold(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              min="0"
              step="any"
              label="Wholesale Buy Price (৳)"
              value={editBuyPrice || ''}
              onChange={(e) => setEditBuyPrice(Number(e.target.value))}
              required
            />

            <Input
              type="number"
              min="0"
              step="any"
              label="Retail Sell Price (৳)"
              value={editSellPrice || ''}
              onChange={(e) => setEditSellPrice(Number(e.target.value))}
              required
            />
          </div>

          <p className="text-xs text-slate-400 font-body">
            Note: To change inventory count, please use the dedicated <strong className="text-violet-400 font-semibold">Adjust</strong> button to maintain an immutable audit trail.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={editProductMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stock Movement History Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Stock Ledger History — ${historyProduct?.name}`}
        maxWidth="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/[0.08] pb-2">
            <span>SKU: <strong className="text-white font-mono">{historyProduct?.sku || 'None'}</strong></span>
            <span>Current Balance: <strong className="text-emerald-400 font-mono text-sm">{historyProduct?.stock_quantity} units</strong></span>
          </div>

          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            {movementsLoading ? (
              <TableSkeleton rows={4} cols={4} />
            ) : (!movementsData?.movements || movementsData.movements.length === 0) ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No stock movement transactions recorded yet for this product.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase font-label text-[10px] tracking-wider sticky top-0 bg-[#0d1117]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3 text-right">Units</th>
                    <th className="py-2.5 px-3">Reason / Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {movementsData.movements.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="py-2.5 px-3">
                        {m.direction === 'in' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            ▲ IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                            ▼ OUT
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white text-xs">
                        {m.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 capitalize text-[11px]">
                        {m.reason.replace(/_/g, ' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-white/[0.06]">
            <Button variant="outline" size="sm" onClick={() => setHistoryModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
