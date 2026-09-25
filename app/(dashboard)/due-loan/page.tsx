'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface DueLoanSummary {
  receivable: {
    baseline: number;
    ledgerNet: number;
    totalCustomerDue: number;
  };
  payable: {
    baseline: number;
    ledgerNet: number;
    totalLoanPayable: number;
  };
}

interface DueItem {
  id: string;
  party_name: string;
  party_phone: string | null;
  type: 'credit' | 'debit';
  amount: number;
  note: string | null;
  date: string;
}

interface LoanItem {
  id: string;
  party_name: string;
  party_phone: string | null;
  type: 'borrowed' | 'repaid';
  amount: number;
  note: string | null;
  date: string;
}

export default function DueLoanPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'due' | 'loan'>('due');
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form states
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [entryType, setEntryType] = useState<string>('credit');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Fetch summary
  const { data: summary, isLoading: summaryLoading } = useQuery<DueLoanSummary>({
    queryKey: ['due-loan-summary'],
    queryFn: () => fetchApi('/api/v1/due-loan'),
  });

  // Fetch due entries
  const { data: dues, isLoading: duesLoading } = useQuery<DueItem[]>({
    queryKey: ['due-entries', search],
    queryFn: () => {
      const q = search ? `?party=${encodeURIComponent(search)}` : '';
      return fetchApi(`/api/v1/due-loan/due${q}`);
    },
    enabled: activeTab === 'due',
  });

  // Fetch loan entries
  const { data: loans, isLoading: loansLoading } = useQuery<LoanItem[]>({
    queryKey: ['loan-entries', search],
    queryFn: () => {
      const q = search ? `?party=${encodeURIComponent(search)}` : '';
      return fetchApi(`/api/v1/due-loan/loan${q}`);
    },
    enabled: activeTab === 'loan',
  });

  // Add Due Entry Mutation
  const addDueMutation = useMutation({
    mutationFn: (body: unknown) =>
      fetchApi('/api/v1/due-loan/due', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Customer due entry saved!', 'success');
      setModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['due-entries'] });
      queryClient.invalidateQueries({ queryKey: ['due-loan-summary'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to save due', 'error');
    },
  });

  // Add Loan Entry Mutation
  const addLoanMutation = useMutation({
    mutationFn: (body: unknown) =>
      fetchApi('/api/v1/due-loan/loan', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Loan transaction recorded!', 'success');
      setModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['loan-entries'] });
      queryClient.invalidateQueries({ queryKey: ['due-loan-summary'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to save loan', 'error');
    },
  });

  const resetForm = () => {
    setPartyName('');
    setPartyPhone('');
    setAmount(0);
    setNote('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'due') {
      addDueMutation.mutate({
        party_name: partyName,
        party_phone: partyPhone || undefined,
        type: entryType,
        amount: Number(amount),
        note: note || undefined,
        date,
      });
    } else {
      addLoanMutation.mutate({
        party_name: partyName,
        party_phone: partyPhone || undefined,
        type: entryType,
        amount: Number(amount),
        note: note || undefined,
        date,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Due & Loan Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Track customer credit balances (Receivable) and supplier debts / loans (Payable)
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEntryType(activeTab === 'due' ? 'credit' : 'borrowed');
            setModalOpen(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{activeTab === 'due' ? 'Record Customer Due' : 'Record Loan Entry'}</span>
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Receivable (Customer Dues)"
          value={summaryLoading ? '...' : formatBDT(summary?.receivable.totalCustomerDue || 0)}
          subtitle="Money customers or dealers currently owe your business"
          icon={<ArrowDownLeft className="w-4 h-4 text-emerald-400" />}
          className="border-emerald-500/30 bg-gradient-to-b from-slate-900 to-emerald-950/20"
        />

        <StatCard
          title="Total Payable (Loans & Supplier Dues)"
          value={summaryLoading ? '...' : formatBDT(summary?.payable.totalLoanPayable || 0)}
          subtitle="Money your business currently owes to suppliers or lenders"
          icon={<ArrowUpRight className="w-4 h-4 text-rose-400" />}
          className="border-rose-500/30 bg-gradient-to-b from-slate-900 to-rose-950/20"
        />
      </div>

      {/* Tabs & Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveTab('due');
              setSearch('');
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'due'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Customer Dues (Receivable)
          </button>
          <button
            onClick={() => {
              setActiveTab('loan');
              setSearch('');
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'loan'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Loans & Debts (Payable)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search party name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {activeTab === 'due' ? (
          duesLoading ? (
            <div className="py-20 text-center text-xs text-slate-500">
              Loading customer dues...
            </div>
          ) : (dues || []).length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500">
              No customer dues recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Party / Customer</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Transaction Type</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(dues || []).map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-white">
                        {d.party_name}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {d.party_phone || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            d.type === 'credit'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {d.type === 'credit' ? 'Due Given (+)' : 'Due Paid (-)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{formatDate(d.date)}</td>
                      <td className="py-3 px-4 text-slate-400">{d.note || '—'}</td>
                      <td
                        className={`py-3 px-4 text-right font-bold font-mono ${
                          d.type === 'credit' ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {formatBDT(d.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : loansLoading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            Loading loan entries...
          </div>
        ) : (loans || []).length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            No loan or debt entries recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Lender / Supplier</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(loans || []).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-white">
                      {l.party_name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {l.party_phone || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          l.type === 'borrowed'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {l.type === 'borrowed' ? 'Borrowed (+)' : 'Repaid (-)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{formatDate(l.date)}</td>
                    <td className="py-3 px-4 text-slate-400">{l.note || '—'}</td>
                    <td
                      className={`py-3 px-4 text-right font-bold font-mono ${
                        l.type === 'borrowed' ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatBDT(l.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={activeTab === 'due' ? 'Record Customer Due' : 'Record Loan / Debt'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={activeTab === 'due' ? 'Customer / Party Name' : 'Lender / Supplier Name'}
            placeholder="e.g. Al-Amin Traders"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            placeholder="017xxxxxxxx"
            value={partyPhone}
            onChange={(e) => setPartyPhone(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              min="1"
              step="1"
              label="Amount (৳)"
              placeholder="5000"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />

            <Select
              label="Transaction Type"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              options={
                activeTab === 'due'
                  ? [
                      { value: 'credit', label: 'Credit (+) — New due to collect' },
                      { value: 'debit', label: 'Debit (-) — Customer paid due' },
                    ]
                  : [
                      { value: 'borrowed', label: 'Borrowed (+) — Loan taken' },
                      { value: 'repaid', label: 'Repaid (-) — Loan paid back' },
                    ]
              }
            />
          </div>

          <Input
            type="date"
            label="Transaction Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Input
            label="Notes / Reference"
            placeholder="e.g. Invoice #203 or Bank transfer"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={addDueMutation.isPending || addLoanMutation.isPending}
            >
              Commit Ledger Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
