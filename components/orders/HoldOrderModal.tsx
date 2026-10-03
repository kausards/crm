'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PauseCircle, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

interface HoldOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  customerName?: string;
  totalAmount?: number;
  currentNotes?: string | null;
}

const QUICK_HOLD_REASONS = [
  'Customer requested delivery next week',
  'Customer phone switched off / unreachable',
  'Address needs verbal confirmation',
  'Customer wants to change product size/color',
  'Advance delivery charge pending payment',
  'Requested to call back in evening',
];

export function HoldOrderModal({
  isOpen,
  onClose,
  orderId,
  customerName,
  totalAmount,
  currentNotes,
}: HoldOrderModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<string>('');

  const holdMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      fetchApi(`/api/v1/orders/${id}/hold`, {
        method: 'POST',
        body: JSON.stringify({ reason: note.trim() }),
      }),
    onSuccess: () => {
      toast('Order placed on hold with sales note recorded', 'info');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      setReason('');
      onClose();
    },
    onError: (err: any) => {
      toast(err?.message || 'Failed to put order on hold', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    holdMutation.mutate({ id: orderId, note: reason });
  };

  const handleSelectQuickReason = (text: string) => {
    setReason((prev) => (prev ? `${prev}. ${text}` : text));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Put Order #${orderId?.slice(0, 8)} On Hold`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Order Details Brief */}
        <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span>Customer:</span>
            <span className="font-semibold text-slate-200">{customerName || 'N/A'}</span>
          </div>
          {totalAmount !== undefined && (
            <div className="flex justify-between items-center text-slate-400">
              <span>Order Amount:</span>
              <span className="font-mono font-bold text-white">{formatBDT(totalAmount)}</span>
            </div>
          )}
          {currentNotes && (
            <div className="pt-1 text-[11px] text-slate-400 border-t border-white/[0.06]">
              <span className="text-slate-500">Existing Note:</span> {currentNotes}
            </div>
          )}
        </div>

        {/* Quick Reason Chips */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Quick Sales Reason Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_HOLD_REASONS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSelectQuickReason(chip)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-sky-500/10 border border-white/10 hover:border-sky-500/30 text-slate-300 hover:text-sky-300 text-[11px] transition-all text-left"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Note input */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Sales Team Note / Reason</span>
            <span className="text-[10px] text-slate-500 font-normal">(Why is this order on hold?)</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g. Customer requested delivery on Friday after 4 PM due to office timing..."
            className="glass-input w-full p-2.5 text-xs text-slate-200 resize-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={holdMutation.isPending}
            className="bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Confirm Put On Hold</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
