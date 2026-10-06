import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n';

interface OrderStatusDropdownProps {
  order: any;
  onDispatch: () => void;
}

export function OrderStatusDropdown({ order, onDispatch }: OrderStatusDropdownProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Note Modal State
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [note, setNote] = useState('');

  let currentUiStatus = order.status;
  if (order.status === 'on_hold' && order.notes?.includes('[Call Not Received]')) {
    currentUiStatus = 'call_not_received';
  }

  const updateMutation = useMutation({
    mutationFn: (body: any) =>
      fetchApi(`/api/v1/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Status updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setNoteModalOpen(false);
      setNote('');
      setIsUpdating(false);
    },
    onError: (err: any) => {
      toast(err?.message || 'Failed to update order', 'error');
      setIsUpdating(false);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (['on_hold', 'call_not_received', 'cancelled'].includes(newStatus)) {
      setPendingStatus(newStatus);
      setNoteModalOpen(true);
    } else {
      setIsUpdating(true);
      updateMutation.mutate({ status: newStatus });
    }
  };

  const handleSaveWithNote = () => {
    if (!note.trim()) {
      toast('Note is required for this status', 'error');
      return;
    }
    
    let actualStatus = pendingStatus;
    let actualNote = note.trim();
    if (pendingStatus === 'call_not_received') {
      actualStatus = 'on_hold';
      actualNote = `[Call Not Received] ${actualNote}`;
    }

    setIsUpdating(true);
    updateMutation.mutate({
      status: actualStatus,
      notes: actualNote,
    });
  };

  if (order.status === 'confirmed') {
    return (
      <button
        onClick={onDispatch}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-foreground font-bold text-xs py-2 px-3 rounded-md transition-colors whitespace-nowrap shadow-sm shadow-indigo-200"
      >
        {t('Send to Courier')}
      </button>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'on_hold': return 'bg-slate-100 text-muted-foreground border-slate-300';
      case 'call_not_received': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-muted-foreground border-slate-200';
    }
  };

  const getCaretColor = (status: string) => {
    switch (status) {
      case 'pending': return '%23B45309'; // amber-700 hex
      case 'on_hold': return '%23334155'; // slate-700 hex
      case 'call_not_received': return '%23C2410C'; // orange-700 hex
      case 'cancelled': return '%23BE123C'; // rose-700 hex
      default: return '%23334155'; // slate-700 hex
    }
  };

  const currentCaret = getCaretColor(currentUiStatus);

  return (
    <>
      <select
        value={currentUiStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        className={`w-full text-xs font-bold py-2 px-2 pr-6 rounded-md appearance-none border outline-none shadow-sm cursor-pointer transition-colors ${getStatusColor(currentUiStatus)}`}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${currentCaret}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat' }}
      >
        <option value="pending" className="bg-white text-muted-foreground">{t('Pending')}</option>
        <option value="on_hold" className="bg-white text-muted-foreground">{t('On Hold')}</option>
        <option value="call_not_received" className="bg-white text-muted-foreground">{t('Call Not Received')}</option>
        <option value="cancelled" className="bg-white text-muted-foreground">{t('Cancelled')}</option>
        <option value="confirmed" className="bg-white text-muted-foreground">{t('Confirmed')}</option>
      </select>

      <Modal
        isOpen={noteModalOpen}
        onClose={() => { setNoteModalOpen(false); setPendingStatus(null); setNote(''); }}
        title={t('Status Note Required')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please provide a note for why this order is being marked as <strong className="text-muted-foreground">{pendingStatus?.replace(/_/g, ' ').toUpperCase()}</strong>.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('Type your note here...')}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setNoteModalOpen(false); setPendingStatus(null); setNote(''); }}>{t('Cancel')}</Button>
            <Button variant="primary" onClick={handleSaveWithNote} disabled={!note.trim() || isUpdating} isLoading={isUpdating}>{t('Save Status')}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
