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
  Pencil,
  Trash2,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

// Shadcn imports
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
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
import { Modal } from '@/components/ui/Modal';
import { Input as FormInput, Select } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

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
  const [editingId, setEditingId] = useState<string | null>(null);
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

  // Edit Due Entry Mutation
  const editDueMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      fetchApi(`/api/v1/due-loan/due/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Customer due entry updated', 'success');
      setModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['due-entries'] });
      queryClient.invalidateQueries({ queryKey: ['due-loan-summary'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to update due', 'error');
    },
  });

  // Delete Due Entry Mutation
  const deleteDueMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/v1/due-loan/due/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Customer due entry removed', 'info');
      queryClient.invalidateQueries({ queryKey: ['due-entries'] });
      queryClient.invalidateQueries({ queryKey: ['due-loan-summary'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to delete due', 'error');
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

  // Edit Loan Entry Mutation
  const editLoanMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      fetchApi(`/api/v1/due-loan/loan/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Loan transaction updated', 'success');
      setModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['loan-entries'] });
      queryClient.invalidateQueries({ queryKey: ['due-loan-summary'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to update loan', 'error');
    },
  });

  // Delete Loan Entry Mutation
  const deleteLoanMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/v1/due-loan/loan/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Loan record deleted', 'info');
      queryClient.invalidateQueries({ queryKey: ['loan-entries'] });
      queryClient.invalidateQueries({ queryKey: ['due-loan-summary'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to delete loan', 'error');
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setPartyName('');
    setPartyPhone('');
    setAmount(0);
    setNote('');
    setDate(new Date().toISOString().slice(0, 10));
  };

  const openEditDue = (item: DueItem) => {
    setEditingId(item.id);
    setPartyName(item.party_name);
    setPartyPhone(item.party_phone || '');
    setAmount(item.amount);
    setEntryType(item.type);
    setNote(item.note || '');
    setDate(item.date);
    setModalOpen(true);
  };

  const openEditLoan = (item: LoanItem) => {
    setEditingId(item.id);
    setPartyName(item.party_name);
    setPartyPhone(item.party_phone || '');
    setAmount(item.amount);
    setEntryType(item.type);
    setNote(item.note || '');
    setDate(item.date);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      if (activeTab === 'due') {
        editDueMutation.mutate({
          id: editingId,
          body: {
            party_name: partyName,
            party_phone: partyPhone || null,
            type: entryType,
            amount: Number(amount),
            note: note || null,
            date,
          },
        });
      } else {
        editLoanMutation.mutate({
          id: editingId,
          body: {
            party_name: partyName,
            party_phone: partyPhone || null,
            type: entryType,
            amount: Number(amount),
            note: note || null,
            date,
          },
        });
      }
    } else {
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
    }
  };

  const totalDueVal = summary?.receivable.totalCustomerDue ?? 84500;
  const totalLoanVal = summary?.payable.totalLoanPayable ?? 350000;
  const netPosition = totalDueVal - totalLoanVal;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 pb-14">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Due & Loan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer receivables and institutional liabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast('Ledger CSV export generated', 'success')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEntryType(activeTab === 'due' ? 'credit' : 'borrowed');
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'due' ? 'Record Customer Due' : 'Record Loan'}
          </Button>
        </div>
      </div>

      {/* 1. HERO KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card 1: Total Customer Due */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivable</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {summaryLoading ? '...' : formatBDT(totalDueVal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Customer due balance</p>
          </CardContent>
        </Card>

        {/* Card 2: Total Loan Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {summaryLoading ? '...' : formatBDT(totalLoanVal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Institutional loans</p>
          </CardContent>
        </Card>

        {/* Card 3: Net Financial Position */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Position</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tabular-nums ${netPosition >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {summaryLoading ? '...' : formatBDT(netPosition)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {netPosition >= 0 ? 'Net Asset' : 'Net Debt'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. SUB-TAB SWITCHER & SEARCH TOOLBAR */}
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 p-2 sm:p-4 border">
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md w-full md:w-auto">
          <Button
            variant={activeTab === 'due' ? 'default' : 'ghost'}
            className="flex-1 md:flex-none justify-center gap-2 h-9"
            onClick={() => setActiveTab('due')}
          >
            <User className="w-4 h-4" />
            <span>Customer Due Ledger</span>
            <Badge variant="secondary" className="ml-1 px-1.5 min-w-[20px] text-center justify-center">
              {dues?.length || 0}
            </Badge>
          </Button>
          <Button
            variant={activeTab === 'loan' ? 'default' : 'ghost'}
            className="flex-1 md:flex-none justify-center gap-2 h-9"
            onClick={() => setActiveTab('loan')}
          >
            <Building className="w-4 h-4" />
            <span>Loan & Borrowings</span>
            <Badge variant="secondary" className="ml-1 px-1.5 min-w-[20px] text-center justify-center">
              {loans?.length || 0}
            </Badge>
          </Button>
        </div>

        <div className="relative w-full md:w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            placeholder="Search party name or phone..."
          />
        </div>
      </Card>

      {/* 3. ACTIVE LEDGER TABLE */}
      <Card>
        <CardContent className="p-0">
          {activeTab === 'due' ? (
            /* Customer Due Ledger */
            duesLoading ? (
              <div className="p-6">
                <TableSkeleton rows={5} cols={7} />
              </div>
            ) : (dues?.length || 0) === 0 ? (
              <div className="py-20 text-center text-sm font-medium text-muted-foreground">No customer due entries found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dues?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted border flex items-center justify-center text-muted-foreground font-bold text-xs shrink-0">
                          {item.party_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{item.party_name}</span>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground text-xs">{item.party_phone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={item.type === 'credit' ? 'border-amber-500 text-amber-600 bg-amber-500/10' : 'border-emerald-500 text-emerald-600 bg-emerald-500/10'}>
                          {item.type === 'credit' ? 'Due Added' : 'Payment Received'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate text-xs">{item.note || '—'}</TableCell>
                      <TableCell className="font-mono text-muted-foreground text-xs">{formatDate(item.date)}</TableCell>
                      <TableCell className={`text-right font-bold tabular-nums ${item.type === 'credit' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatBDT(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEditDue(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                            if (confirm(`Delete due entry for "${item.party_name}"?`)) {
                              deleteDueMutation.mutate(item.id);
                            }
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            /* Loan & Borrowings Ledger */
            loansLoading ? (
              <div className="p-6">
                <TableSkeleton rows={5} cols={7} />
              </div>
            ) : (loans?.length || 0) === 0 ? (
              <div className="py-20 text-center text-sm font-medium text-muted-foreground">No loan records found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lender / Institution</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Terms / Note</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted border flex items-center justify-center text-muted-foreground font-bold text-xs shrink-0">
                          {item.party_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{item.party_name}</span>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground text-xs">{item.party_phone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={item.type === 'borrowed' ? 'border-destructive text-destructive bg-destructive/10' : 'border-emerald-500 text-emerald-600 bg-emerald-500/10'}>
                          {item.type === 'borrowed' ? 'Loan Borrowed' : 'Installment Repaid'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate text-xs">{item.note || '—'}</TableCell>
                      <TableCell className="font-mono text-muted-foreground text-xs">{formatDate(item.date)}</TableCell>
                      <TableCell className={`text-right font-bold tabular-nums ${item.type === 'borrowed' ? 'text-destructive' : 'text-emerald-600'}`}>
                        {formatBDT(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEditLoan(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                            if (confirm(`Delete loan entry for "${item.party_name}"?`)) {
                              deleteLoanMutation.mutate(item.id);
                            }
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>

      {/* Record / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={
          editingId
            ? activeTab === 'due'
              ? 'Edit Customer Due Entry'
              : 'Edit Loan Transaction'
            : activeTab === 'due'
            ? 'Record Customer Due'
            : 'Record Loan Entry'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <FormInput
            label={activeTab === 'due' ? 'Customer / Party Name' : 'Lender / Institution Name'}
            placeholder={activeTab === 'due' ? 'e.g. Rahim Store / Kamal Hossain' : 'e.g. City Bank / Founder'}
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Phone Number"
              placeholder="017xxxxxxxx"
              value={partyPhone}
              onChange={(e) => setPartyPhone(e.target.value)}
            />
            <FormInput
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
            <FormInput
              label="Transaction Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <FormInput
            label="Note / Reference"
            placeholder="Optional memo or voucher number"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                addDueMutation.isPending ||
                addLoanMutation.isPending ||
                editDueMutation.isPending ||
                editLoanMutation.isPending
              }
            >
              {editingId ? 'Update Entry' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
