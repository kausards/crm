'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { XCircle, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  customerName?: string;
  totalAmount?: number;
  currentNotes?: string | null;
}

const QUICK_CANCEL_REASONS = [
  'Customer changed mind / no longer needed',
  'Refused to pay advance delivery charge',
  'Found alternative product elsewhere',
  'Customer unreachable after multiple attempts',
  'Fake / Prank / Fraudulent order',
  'Duplicate order by mistake',
  'Delivery time too long for customer',
];

export function CancelOrderModal({
  isOpen,
  onClose,
  orderId,
  customerName,
  totalAmount,
  currentNotes,
}: CancelOrderModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<string>('');

  const cancelMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      fetchApi(`/api/v1/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: note.trim() }),
      }),
    onSuccess: () => {
      toast('Order cancelled and sales note recorded', 'info');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setReason('');
      onClose();
    },
    onError: (err: any) => {
      toast(err?.message || 'Failed to cancel order', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    cancelMutation.mutate({ id: orderId, note: reason });
  };

  const handleSelectQuickReason = (text: string) => {
    setReason((prev) => (prev ? `${prev}. ${text}` : text));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancel Order #${orderId?.slice(0, 8)}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Order Details Brief */}
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-slate-300">
            <span>Customer:</span>
            <span className="font-semibold text-white">{customerName || 'N/A'}</span>
          </div>
          {totalAmount !== undefined && (
            <div className="flex justify-between items-center text-slate-300">
              <span>Order Total:</span>
              <span className="font-mono font-bold text-rose-300">{formatBDT(totalAmount)}</span>
            </div>
          )}
          {currentNotes && (
            <div className="pt-1 text-[11px] text-slate-400 border-t border-rose-500/10">
              <span className="text-slate-500">Existing Note:</span> {currentNotes}
            </div>
          )}
        </div>

        {/* Quick Reason Chips */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Quick Reason Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CANCEL_REASONS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSelectQuickReason(chip)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 text-[11px] transition-all text-left"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Note input */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>Sales Team Reason Note</span>
            <span className="text-[10px] text-slate-500 font-normal">(Why did the customer cancel?)</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g. Customer cancelled order because they wanted same-day delivery..."
            className="glass-input w-full p-2.5 text-xs text-slate-200 resize-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="danger"
            size="sm"
            type="submit"
            isLoading={cancelMutation.isPending}
            className="flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Confirm Cancel Order</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
