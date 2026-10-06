import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatBDT } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { fetchApi } from '@/lib/apiClient';

interface OrderCardProps {
  order: any;
  onDispatch: () => void;
  isRedRiskAlert?: boolean;
}

export function OrderCard({ order, onDispatch, isRedRiskAlert }: OrderCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine initial selected status
  let initialDropdownStatus = order.status;
  let initialCleanNote = order.notes || '';
  if (order.status === 'on_hold' && order.notes?.includes('[Call Not Received]')) {
    initialDropdownStatus = 'call_not_received';
    initialCleanNote = order.notes.replace('[Call Not Received]', '').trim();
  }

  const [selectedStatus, setSelectedStatus] = useState<string>(
    ['pending', 'on_hold', 'call_not_received', 'cancelled', 'confirmed'].includes(initialDropdownStatus)
      ? initialDropdownStatus
      : order.status
  );
  const [note, setNote] = useState<string>(initialCleanNote);

  const needsNote = ['on_hold', 'call_not_received', 'cancelled'].includes(selectedStatus);

  const updateMutation = useMutation({
    mutationFn: (body: any) =>
      fetchApi(`/api/v1/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Order updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast(err?.message || 'Failed to update order', 'error');
    },
  });

  const handleSave = () => {
    if (needsNote && !note.trim()) {
      toast('Please provide a note for this status', 'error');
      return;
    }

    let actualStatus = selectedStatus;
    let actualNote = note.trim();

    if (selectedStatus === 'call_not_received') {
      actualStatus = 'on_hold';
      actualNote = `[Call Not Received] ${actualNote}`.trim();
    }

    updateMutation.mutate({
      status: actualStatus,
      notes: actualNote,
    });
  };

  return (
    <div className={`p-6 rounded-xl border flex flex-col md:flex-row gap-8 shadow-sm transition-colors ${isRedRiskAlert ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
      {/* Left: Order Info */}
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-start">
           <div>
              <h3 className={`text-base font-bold ${isRedRiskAlert ? 'text-rose-900' : 'text-muted-foreground'}`}>{order.customer_name}</h3>
              <p className={`text-sm font-mono font-medium ${isRedRiskAlert ? 'text-rose-700' : 'text-muted-foreground'} mt-0.5`}>{order.customer_phone}</p>
              <p className={`text-sm ${isRedRiskAlert ? 'text-rose-600' : 'text-muted-foreground'} mt-1`}>{order.customer_address}</p>
           </div>
           <div className="text-right">
              <span className={`text-sm font-bold ${isRedRiskAlert ? 'text-rose-700' : 'text-muted-foreground'}`}>#{order.id.slice(0,8)}</span>
              {isRedRiskAlert && <div className="text-xs font-bold text-rose-600 mt-1 uppercase tracking-wide">Risk Flagged</div>}
           </div>
        </div>

        <div>
          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Products</h4>
          <ul className="space-y-1">
            {order.order_items?.map((item: any) => (
              <li key={item.id} className="text-xs text-muted-foreground flex items-center justify-between border-b border-slate-200/50 pb-1">
                <span>{item.products?.name} <span className="text-muted-foreground font-mono">x{item.quantity}</span></span>
                <span className="font-mono font-medium">{formatBDT(item.sell_price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-sm font-extrabold text-indigo-700 flex justify-between">
            <span>Total Value</span>
            <span className="font-mono tabular-nums">{formatBDT(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">Update Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-muted-foreground focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            >
              <option value="pending">Pending</option>
              <option value="on_hold">On Hold</option>
              <option value="call_not_received">Call Not Received</option>
              <option value="cancelled">Cancelled</option>
              <option value="confirmed">Confirmed</option>
              {/* If the current status is outside these (e.g. shipped), still show it as an option so we don't break the UI */}
              {!['pending', 'on_hold', 'call_not_received', 'cancelled', 'confirmed'].includes(selectedStatus) && (
                <option value={selectedStatus} disabled>{selectedStatus.toUpperCase()}</option>
              )}
            </select>
          </div>

          {needsNote && (
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Note (Required) <span className="text-rose-500">*</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason or update note..."
                rows={2}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          )}

          {!needsNote && (
             <div>
               <label className="text-xs font-bold text-muted-foreground block mb-1">Optional Note</label>
               <input
                 type="text"
                 value={note}
                 onChange={(e) => setNote(e.target.value)}
                 placeholder="Any extra info..."
                 className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
               />
             </div>
          )}
        </div>

        <div className="flex gap-2 mt-auto pt-2">
          <Button 
            variant="primary" 
            className="flex-1" 
            isLoading={updateMutation.isPending}
            onClick={handleSave}
            disabled={needsNote && !note.trim()}
          >
            Save Status
          </Button>
        </div>

        {(order.status === 'confirmed' || selectedStatus === 'confirmed') && (
          <div className="pt-3 mt-1 border-t border-slate-200">
             <Button
                variant="primary"
                onClick={onDispatch}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground shadow-sm shadow-emerald-200"
             >
                Send to Courier
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}
