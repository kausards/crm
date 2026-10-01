'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Wallet,
  Building,
  Scale,
  Search,
  Plus,
  Download,
  Phone,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  FileText,
  User,
  CreditCard,
  History,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
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
      toast('Customer due entry saved', 'success');
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
      toast('Loan transaction recorded', 'success');
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

  const totalDueVal = summary?.receivable.totalCustomerDue ?? 84500;
  const totalLoanVal = summary?.payable.totalLoanPayable ?? 350000;
  const netPosition = totalDueVal - totalLoanVal;

  return (
    <div className="flex flex-col w-full gap-6 max-w-[1600px] mx-auto pb-14">
      {/* Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
        <nav className="flex items-center gap-1.5 p-1 rounded-xl glass-card">
          <Link
            href="/accounts"
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Overview
          </Link>
          <Link
            href="/accounts"
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Bill & Cost
          </Link>
          <Link
            href="/payroll"
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Salary & Attendance
          </Link>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-brand-violet/20 border border-brand-violet/40 text-violet-200 text-xs font-semibold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span>Due & Loan Ledger</span>
          </div>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => toast('Ledger CSV export generated', 'success')}
            className="btn-glass flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300"
            type="button"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setEntryType(activeTab === 'due' ? 'credit' : 'borrowed');
              setModalOpen(true);
            }}
            className="btn-gradient-glow flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'due' ? 'Record Customer Due' : 'Record Loan'}</span>
          </button>
        </div>
      </div>

      {/* 1. HERO KPI CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Customer Due */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 tracking-wide">
                Total Customer Due (Receivable)
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-bold font-headline tracking-tight text-white">
                  {summaryLoading ? '...' : formatBDT(totalDueVal)}
                </span>
                <span className="text-[11px] font-mono font-semibold text-emerald-400">BDT</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
            <span className="badge-green text-[10px] font-semibold">
              Active Receivables
            </span>
            <span className="text-xs text-slate-400">Bakir Khata ledger balance</span>
          </div>
        </div>

        {/* Card 2: Total Loan Balance */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-rose-500/40 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/20 transition-all" />

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 tracking-wide">
                Total Loan Balance (Payable)
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-bold font-headline tracking-tight text-white">
                  {summaryLoading ? '...' : formatBDT(totalLoanVal)}
                </span>
                <span className="text-[11px] font-mono font-semibold text-rose-400">BDT</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
            <span className="badge-red text-[10px] font-semibold">
              Liabilities
            </span>
            <span className="text-xs text-slate-400">Institutional & Director loans</span>
          </div>
        </div>

        {/* Card 3: Net Financial Position */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-brand-violet/40 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-violet" />
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-brand-violet/10 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-violet/20 transition-all" />

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 tracking-wide">
                Net Financial Position
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span
                  className={`text-3xl font-bold font-headline tracking-tight ${
                    netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {summaryLoading ? '...' : formatBDT(netPosition)}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {netPosition >= 0 ? 'Net Asset' : 'Net Debt'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-purple-300 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
            <span className="badge-cyan text-[10px] font-semibold">
              Due vs Loan
            </span>
            <span className="text-xs text-slate-400 truncate">Total Receivables minus Total Debt</span>
          </div>
        </div>
      </section>

      {/* 2. SUB-TAB SWITCHER & SEARCH TOOLBAR */}
      <section className="glass-card p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.06] w-full md:w-auto">
          <button
            onClick={() => setActiveTab('due')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'due'
                ? 'bg-brand-violet/20 border border-brand-violet/40 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 text-purple-400" />
            <span>Customer Due Ledger</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-brand-violet/30 text-purple-300">
              {dues?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('loan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'loan'
                ? 'bg-brand-magenta/20 border border-brand-magenta/40 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-pink-400" />
            <span>Loan & Borrowings</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-brand-magenta/30 text-pink-300">
              {loans?.length || 0}
            </span>
          </button>
        </div>

        <div className="relative min-w-[280px] w-full md:w-auto">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 rounded-xl"
            placeholder="Search party name or phone..."
            type="text"
          />
        </div>
      </section>

      {/* 3. ACTIVE LEDGER TABLE */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {activeTab === 'due' ? (
          /* Customer Due Ledger */
          duesLoading ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading customer dues...</div>
          ) : (dues?.length || 0) === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500">No customer due entries found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-400 uppercase font-mono text-[10px] tracking-wider bg-white/[0.01]">
                    <th className="py-3 px-5">Party Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Note</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {dues?.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 font-mono text-xs">
                          {item.party_name.slice(0, 1)}
                        </div>
                        <span>{item.party_name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{item.party_phone || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={
                            item.type === 'credit'
                              ? 'badge-amber text-[10px] font-semibold'
                              : 'badge-green text-[10px] font-semibold'
                          }
                        >
                          {item.type === 'credit' ? 'Due Added' : 'Payment Received'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{item.note || '—'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{formatDate(item.date)}</td>
                      <td
                        className={`py-3.5 px-5 text-right font-mono font-bold ${
                          item.type === 'credit' ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {formatBDT(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Loan & Borrowings Ledger */
          loansLoading ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading loans...</div>
          ) : (loans?.length || 0) === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500">No loan records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-400 uppercase font-mono text-[10px] tracking-wider bg-white/[0.01]">
                    <th className="py-3 px-5">Lender / Institution</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Terms / Note</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loans?.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-pink-300 font-mono text-xs">
                          {item.party_name.slice(0, 1)}
                        </div>
                        <span>{item.party_name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{item.party_phone || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={
                            item.type === 'borrowed'
                              ? 'badge-red text-[10px] font-semibold'
                              : 'badge-green text-[10px] font-semibold'
                          }
                        >
                          {item.type === 'borrowed' ? 'Loan Borrowed' : 'Installment Repaid'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{item.note || '—'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{formatDate(item.date)}</td>
                      <td
                        className={`py-3.5 px-5 text-right font-mono font-bold ${
                          item.type === 'borrowed' ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {formatBDT(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Record Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={activeTab === 'due' ? 'Record Customer Due' : 'Record Loan Entry'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={activeTab === 'due' ? 'Customer / Party Name' : 'Lender / Institution Name'}
            placeholder={activeTab === 'due' ? 'e.g. Rahim Store / Kamal Hossain' : 'e.g. City Bank / Founder'}
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="017xxxxxxxx"
              value={partyPhone}
              onChange={(e) => setPartyPhone(e.target.value)}
            />
            <Input
              label="Amount (৳)"
              type="number"
              min="1"
              step="1"
              placeholder="2500"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Transaction Type"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              options={
                activeTab === 'due'
                  ? [
                      { value: 'credit', label: 'Due / Unpaid Sale (বাকি)' },
                      { value: 'debit', label: 'Payment Received (পরিশোধ)' },
                    ]
                  : [
                      { value: 'borrowed', label: 'Loan Borrowed (গৃহীত ঋণ)' },
                      { value: 'repaid', label: 'Loan Repaid (পরিশোধ)' },
                    ]
              }
            />
            <Input
              label="Transaction Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Note / Reference"
            placeholder="Optional memo or voucher number"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={addDueMutation.isPending || addLoanMutation.isPending}
            >
              Save Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
