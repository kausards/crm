'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Phone, MapPin, BookOpen, Edit2, Trash2 } from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

// Shadcn imports
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import {
  Card,
  CardContent,
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

// Old UI components
import { Input as FormInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  notes: string | null;
  current_due: number;
  created_at: string;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);

  // Form states
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // Fetch customers
  const { data, isLoading } = useQuery<{
    items: CustomerItem[];
    pagination: { total: number; totalPages: number; page: number };
  }>({
    queryKey: ['customers', search, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '25');
      return fetchApi(`/api/v1/customers?${params.toString()}`);
    },
  });

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: (body: unknown) =>
      fetchApi('/api/v1/customers', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Customer added to CRM directory!', 'success');
      setAddModalOpen(false);
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      setCustNotes('');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to add customer', 'error');
    },
  });

  // Edit customer mutation
  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      fetchApi(`/api/v1/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Customer profile updated!', 'success');
      setEditModalOpen(false);
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to update customer', 'error');
    },
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/v1/customers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast('Customer record deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to delete customer', 'error');
    },
  });

  const handleOpenEdit = (c: CustomerItem) => {
    setEditingCustomer(c);
    setCustName(c.name);
    setCustPhone(c.phone);
    setCustAddress(c.address || '');
    setCustNotes(c.notes || '');
    setEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    editMutation.mutate({
      id: editingCustomer.id,
      body: {
        name: custName,
        phone: custPhone,
        address: custAddress || undefined,
        notes: custNotes || undefined,
      },
    });
  };

  const handleDelete = (c: CustomerItem) => {
    if (confirm(`Are you sure you want to delete customer "${c.name}"?`)) {
      deleteMutation.mutate(c.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: custName,
      phone: custPhone,
      address: custAddress || undefined,
      notes: custNotes || undefined,
    });
  };

  const customers: CustomerItem[] = Array.isArray(data) ? data : data?.items || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1, page: 1 };
  const totalDue = customers.reduce((acc, c) => acc + (c.current_due || 0), 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your customer relationships and dues.</p>
        </div>

        <div className="flex items-center gap-2">
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
              Clear filter
            </Button>
          )}

          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{pagination.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total registered</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Dues</CardTitle>
            <BookOpen className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive tabular-nums font-mono">
              {formatBDT(totalDue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total unpaid balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers with Due</CardTitle>
            <Phone className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {customers.filter((c) => c.current_due > 0).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">With pending dues</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader className="p-4 sm:px-6 sm:pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <CardTitle>Directory</CardTitle>
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by customer name or phone (+880...)..."
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
          ) : customers.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">No customers registered</p>
              <Button className="mt-4" onClick={() => setAddModalOpen(true)}>
                Add First Customer
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Delivery Address</TableHead>
                  <TableHead>Internal Notes</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Due Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
                        <Phone className="w-3 h-3" />
                        {c.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate text-xs">
                      {c.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate text-xs">
                      {c.notes || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[11px]">
                      {formatDate(c.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono font-bold tabular-nums text-xs ${
                          c.current_due > 0
                            ? 'text-destructive'
                            : c.current_due < 0
                            ? 'text-emerald-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {c.current_due > 0
                          ? `${formatBDT(c.current_due)} owed`
                          : c.current_due < 0
                          ? `${formatBDT(Math.abs(c.current_due))} advance`
                          : 'Settled'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(c)}
                          disabled={deleteMutation.isPending}
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <span className="text-sm text-muted-foreground font-medium">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} customers)
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

      {/* Add Customer Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Customer Dossier"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Full Name"
            placeholder="e.g. Rahim Uddin"
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            required
          />

          <FormInput
            label="Phone Number"
            placeholder="017xxxxxxxx"
            value={custPhone}
            onChange={(e) => setCustPhone(e.target.value)}
            required
          />

          <FormInput
            label="Delivery Address"
            placeholder="House 12, Road 4, Mirpur, Dhaka"
            value={custAddress}
            onChange={(e) => setCustAddress(e.target.value)}
          />

          <FormInput
            label="Internal Notes"
            placeholder="e.g. Preferred delivery time, repeat buyer"
            value={custNotes}
            onChange={(e) => setCustNotes(e.target.value)}
          />

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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingCustomer(null);
        }}
        title="Edit Customer Profile"
        maxWidth="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <FormInput
            label="Full Name"
            placeholder="e.g. Rahim Uddin"
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            required
          />

          <FormInput
            label="Phone Number"
            placeholder="017xxxxxxxx"
            value={custPhone}
            onChange={(e) => setCustPhone(e.target.value)}
            required
          />

          <FormInput
            label="Delivery Address"
            placeholder="House 12, Road 4, Mirpur, Dhaka"
            value={custAddress}
            onChange={(e) => setCustAddress(e.target.value)}
          />

          <FormInput
            label="Internal Notes"
            placeholder="e.g. Preferred delivery time, repeat buyer"
            value={custNotes}
            onChange={(e) => setCustNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditingCustomer(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
