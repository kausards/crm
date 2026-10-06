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
  Pencil,
  History,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useAuth, useToast } from '@/app/providers';

// Shadcn imports
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Input } from '@/components/ui/shadcn/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";

// Old UI components with internal state/logic that we shouldn't break
import { Input as FormInput, Select } from '@/components/ui/Input';
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
    setEditSellPrice(prod.sell_price);
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
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your catalog, stock levels, and adjustments.</p>
        </div>

        <div className="flex items-center gap-2">
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
              Clear filter
            </Button>
          )}

          {isOwner && (
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{pagination.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatBDT(products.reduce((acc, p) => acc + (p.buy_price * p.stock_quantity), 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {products.filter((p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-destructive">
              {products.filter((p) => p.stock_quantity <= 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader className="p-4 sm:px-6 sm:pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <CardTitle>Catalog</CardTitle>
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search SKU tag, product title..."
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:px-6 sm:pb-6">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={6} cols={7} />
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center">
              <Boxes className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">No products in inventory</p>
              {isOwner && (
                <Button className="mt-4" onClick={() => setAddModalOpen(true)}>
                  Add First Product
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Buy Price</TableHead>
                  <TableHead>Sell Price</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((prod) => {
                  const isLow = prod.stock_quantity <= prod.low_stock_threshold && prod.stock_quantity > 0;
                  const isOutOfStock = prod.stock_quantity <= 0;
                  const unitMargin = prod.sell_price - prod.buy_price;

                  return (
                    <TableRow key={prod.id}>
                      <TableCell className="font-medium">
                        {prod.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {prod.sku || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatBDT(prod.buy_price)}
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {formatBDT(prod.sell_price)}
                      </TableCell>
                      <TableCell className="text-emerald-600 font-medium">
                        +{formatBDT(unitMargin)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold tabular-nums ${
                            isOutOfStock ? 'text-destructive' : isLow ? 'text-amber-600' : ''
                          }`}>
                            {prod.stock_quantity}
                          </span>
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="h-5 text-[10px] px-1.5 font-semibold">
                              Out of Stock
                            </Badge>
                          ) : isLow ? (
                            <Badge variant="outline" className="h-5 text-[10px] px-1.5 border-amber-500 text-amber-600 bg-amber-500/10">
                              Low Stock
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => openEditModal(prod)}
                              title="Edit Product"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            onClick={() => {
                              setSelectedProduct(prod);
                              setAdjustModalOpen(true);
                            }}
                            title="Adjust Stock"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => {
                              setHistoryProduct(prod);
                              setHistoryModalOpen(true);
                            }}
                            title="View History"
                          >
                            <History className="h-4 w-4" />
                          </Button>

                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                if (confirm(`Archive product "${prod.name}"?`)) {
                                  archiveMutation.mutate(prod.id);
                                }
                              }}
                              title="Archive Product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <span className="text-sm text-muted-foreground font-medium">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} products)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
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
        </CardContent>
      </Card>

      {/* Add Product Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Inventory Product"
        maxWidth="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <FormInput
            label="Product Title"
            placeholder="e.g. Premium Cotton Polo Shirt"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="SKU / Barcode"
              placeholder="POLO-BLK-M"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />

            <FormInput
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
            <FormInput
              type="number"
              min="0"
              step="1"
              label="Wholesale Buy (৳)"
              placeholder="350"
              value={buyPrice || ''}
              onChange={(e) => setBuyPrice(Number(e.target.value))}
              required
            />

            <FormInput
              type="number"
              min="0"
              step="1"
              label="Retail Sell (৳)"
              placeholder="650"
              value={sellPrice || ''}
              onChange={(e) => setSellPrice(Number(e.target.value))}
              required
            />

            <FormInput
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
            <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProductMutation.isPending}>
              {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
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
          <p className="text-sm text-muted-foreground">
            Current Stock: <strong className="text-foreground">{selectedProduct?.stock_quantity} units</strong>. Every adjustment is immutably logged.
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

          <FormInput
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
            <Button type="button" variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={adjustStockMutation.isPending}>
              {adjustStockMutation.isPending ? 'Committing...' : 'Commit Adjustment'}
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
          <FormInput
            label="Product Title"
            placeholder="e.g. Premium Cotton Polo Shirt"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="SKU / Barcode"
              placeholder="POLO-BLK-M"
              value={editSku}
              onChange={(e) => setEditSku(e.target.value)}
            />

            <FormInput
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
            <FormInput
              type="number"
              min="0"
              step="any"
              label="Wholesale Buy Price (৳)"
              value={editBuyPrice || ''}
              onChange={(e) => setEditBuyPrice(Number(e.target.value))}
              required
            />

            <FormInput
              type="number"
              min="0"
              step="any"
              label="Retail Sell Price (৳)"
              value={editSellPrice || ''}
              onChange={(e) => setEditSellPrice(Number(e.target.value))}
              required
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Note: To change inventory count, please use the dedicated <strong className="text-primary font-medium">Adjust</strong> button to maintain an immutable audit trail.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={editProductMutation.isPending}>
              {editProductMutation.isPending ? 'Saving...' : 'Save Changes'}
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
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-3">
            <span>SKU: <strong className="text-foreground">{historyProduct?.sku || 'None'}</strong></span>
            <span>Current Balance: <strong className="text-foreground font-semibold">{historyProduct?.stock_quantity} units</strong></span>
          </div>

          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            {movementsLoading ? (
              <TableSkeleton rows={4} cols={4} />
            ) : (!movementsData?.movements || movementsData.movements.length === 0) ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No stock movement transactions recorded yet for this product.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead>Reason / Context</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsData.movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(m.created_at)}
                      </TableCell>
                      <TableCell>
                        {m.direction === 'in' ? (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-500/10 font-bold px-2 py-0.5 text-[10px]">
                            ▲ IN
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="font-bold px-2 py-0.5 text-[10px]">
                            ▼ OUT
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {m.quantity}
                      </TableCell>
                      <TableCell className="capitalize text-xs text-muted-foreground">
                        {m.reason.replace(/_/g, ' ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex justify-end pt-3">
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
