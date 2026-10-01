'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Phone, MapPin, BookOpen } from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[10px] font-mono font-medium border border-violet-500/25">
              Customer Dossier
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl md:text-3xl text-white tracking-tight mt-1.5">
            Customer CRM
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-body">
            Direct customer directory, purchase telemetry &amp; credit ledger
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-all w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Total Customers</span>
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-white mt-2 tabular-nums">
            {pagination.total}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-body">Registered client records</p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Outstanding Dues</span>
            <BookOpen className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-rose-400 mt-2 tabular-nums font-mono">
            {formatBDT(totalDue)}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1 font-body">Uncollected credit balance</p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Active Debtors</span>
            <Phone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-amber-400 mt-2 tabular-nums">
            {customers.filter((c) => c.current_due > 0).length}
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1 font-body">Customers with active ledger dues</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer name or phone (+880...)..."
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
            Clear
          </button>
        )}
      </div>

      {/* Customers Glass Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-500 font-body">
            Loading customers directory...
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-headline font-semibold">No customers registered</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={() => setAddModalOpen(true)}>
              Add First Customer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase font-label text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Name</th>
                  <th className="py-3.5 px-4 font-semibold">Phone</th>
                  <th className="py-3.5 px-4 font-semibold">Delivery Address</th>
                  <th className="py-3.5 px-4 font-semibold">Internal Notes</th>
                  <th className="py-3.5 px-4 font-semibold">Joined Date</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Due Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {c.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-[200px] truncate">
                      {c.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-[150px] truncate">
                      {c.notes || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-mono font-bold tabular-nums text-xs ${
                          c.current_due > 0
                            ? 'text-rose-400'
                            : c.current_due < 0
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {c.current_due > 0
                          ? `${formatBDT(c.current_due)} owed`
                          : c.current_due < 0
                          ? `${formatBDT(Math.abs(c.current_due))} advance`
                          : 'Settled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border-t border-white/10 text-xs">
            <span className="text-slate-400 font-label">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} customers)
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

      {/* Add Customer Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Customer Dossier"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Rahim Uddin"
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            placeholder="017xxxxxxxx"
            value={custPhone}
            onChange={(e) => setCustPhone(e.target.value)}
            required
          />

          <Input
            label="Delivery Address"
            placeholder="House 12, Road 4, Mirpur, Dhaka"
            value={custAddress}
            onChange={(e) => setCustAddress(e.target.value)}
          />

          <Input
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
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Save Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
