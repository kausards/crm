'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { fetchApi } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

interface RiskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RiskSettings {
  minDeliveryRatio: number;
  maxCancelRatio: number;
}

export function RiskSettingsModal({ isOpen, onClose }: RiskSettingsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [minDelivery, setMinDelivery] = useState<number>(50);
  const [maxCancel, setMaxCancel] = useState<number>(50);

  const { data: settings } = useQuery<RiskSettings>({
    queryKey: ['courier-risk-settings'],
    queryFn: () => fetchApi('/api/v1/courier/risk-settings'),
    enabled: isOpen,
  });

  useEffect(() => {
    if (settings) {
      setMinDelivery(settings.minDeliveryRatio ?? 50);
      setMaxCancel(settings.maxCancelRatio ?? 50);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (body: { minDeliveryRatio: number; maxCancelRatio: number }) =>
      fetchApi('/api/v1/courier/risk-settings', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Courier risk thresholds updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['courier-risk-settings'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      onClose();
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to update risk thresholds', 'error');
    },
  });

  const handleApplyPreset = (delivery: number, cancel: number) => {
    setMinDelivery(delivery);
    setMaxCancel(cancel);
  };

  const handleSave = () => {
    const minD = Math.max(0, Math.min(100, Number(minDelivery) || 0));
    const maxC = Math.max(0, Math.min(100, Number(maxCancel) || 0));
    saveMutation.mutate({
      minDeliveryRatio: minD,
      maxCancelRatio: maxC,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Courier Fraud & Risk Thresholds"
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs text-muted-foreground">
        {/* Banner */}
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-rose-300 text-sm">
              Automated Red Alert System
            </h4>
            <p className="text-muted-foreground leading-relaxed text-[11.5px]">
              Orders are highlighted in <span className="text-rose-400 font-bold uppercase">Red</span> if Steadfast flags fraud comments, if the customer&apos;s delivery ratio falls below your minimum, or if their cancel ratio exceeds your maximum.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            Quick Threshold Presets
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset(50, 50)}
              className={`p-2 rounded-xl border text-center transition-all ${
                minDelivery === 50 && maxCancel === 50
                  ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 font-semibold shadow-sm'
                  : 'bg-muted/50 border hover:bg-muted/50 text-muted-foreground hover:text-muted-foreground'
              }`}
            >
              <div className="text-xs font-bold text-foreground">Default (50/50)</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Deliv ≥50% | Cancel ≤50%</div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset(65, 35)}
              className={`p-2 rounded-xl border text-center transition-all ${
                minDelivery === 65 && maxCancel === 35
                  ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 font-semibold shadow-sm'
                  : 'bg-muted/50 border hover:bg-muted/50 text-muted-foreground hover:text-muted-foreground'
              }`}
            >
              <div className="text-xs font-bold text-foreground">Strict (65/35)</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">High reliability only</div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset(40, 60)}
              className={`p-2 rounded-xl border text-center transition-all ${
                minDelivery === 40 && maxCancel === 60
                  ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 font-semibold shadow-sm'
                  : 'bg-muted/50 border hover:bg-muted/50 text-muted-foreground hover:text-muted-foreground'
              }`}
            >
              <div className="text-xs font-bold text-foreground">Relaxed (40/60)</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Accept higher risks</div>
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 bg-muted/50 border border p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-muted-foreground text-xs">
                Min. Delivery Ratio (%)
              </label>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {minDelivery}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Orders will turn <strong className="text-rose-400">Red</strong> if customer delivery rate is below this percentage.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minDelivery}
                onChange={(e) => setMinDelivery(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={minDelivery}
                onChange={(e) => setMinDelivery(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-muted/50 border border rounded-lg text-center text-xs font-mono text-foreground focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="space-y-1.5 bg-muted/50 border border p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-muted-foreground text-xs">
                Max. Cancel Ratio (%)
              </label>
              <span className="text-[11px] font-mono text-rose-400 font-bold">
                {maxCancel}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Orders will turn <strong className="text-rose-400">Red</strong> if customer cancellation rate exceeds this percentage.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={maxCancel}
                onChange={(e) => setMaxCancel(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={maxCancel}
                onChange={(e) => setMaxCancel(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-muted/50 border border rounded-lg text-center text-xs font-mono text-foreground focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Diagnostic / Summary Card */}
        <div className="p-3 bg-muted/50 border border rounded-xl space-y-1 text-[11px] text-muted-foreground">
          <div className="font-semibold text-muted-foreground">How this operates in real-time:</div>
          <div>• Each customer&apos;s delivery track record is checked through Steadfast Courier&apos;s risk intelligence.</div>
          <div>• If delivery ratio &lt; <span className="text-amber-300 font-semibold">{minDelivery}%</span>, order flagged red.</div>
          <div>• If cancellation ratio &gt; <span className="text-rose-400 font-semibold">{maxCancel}%</span>, order flagged red.</div>
          <div>• If Steadfast returns any fraud remark, order is permanently flagged red with the comment displayed.</div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={saveMutation.isPending}
            onClick={handleSave}
            className="flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Thresholds</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
