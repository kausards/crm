import React from 'react';
import { formatStatus } from '@/lib/apiClient';

interface BadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export function Badge({ status, className = '', showDot = false }: BadgeProps) {
  const normalized = status.toLowerCase();

  const colorStyles: Record<string, { bg: string; dot: string }> = {
    pending: { bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
    flagged: { bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30', dot: 'bg-rose-400' },
    confirmed: { bg: 'bg-violet-500/15 text-violet-300 border-violet-500/30', dot: 'bg-violet-400' },
    on_hold: { bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30', dot: 'bg-sky-400' },
    packed: { bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', dot: 'bg-indigo-400' },
    shipped: { bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', dot: 'bg-cyan-400' },
    in_transit: { bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', dot: 'bg-cyan-400' },
    delivered: { bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
    returned: { bg: 'bg-orange-500/15 text-orange-300 border-orange-500/30', dot: 'bg-orange-400' },
    cancelled: { bg: 'bg-white/[0.06] text-slate-400 border-white/10', dot: 'bg-slate-400' },
    active: { bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
    owner: { bg: 'bg-violet-500/15 text-violet-300 border-violet-500/30', dot: 'bg-violet-400' },
    staff: { bg: 'bg-white/[0.06] text-slate-300 border-white/10', dot: 'bg-slate-300' },
    pro: { bg: 'bg-pink-500/15 text-pink-300 border-pink-500/30', dot: 'bg-pink-400' },
    trial: { bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', dot: 'bg-cyan-400' },
    paid: { bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
    unpaid: { bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30', dot: 'bg-rose-400' },
    overdue: { bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30', dot: 'bg-rose-400' },
  };

  const current = colorStyles[normalized] || {
    bg: 'bg-white/[0.06] text-slate-300 border-white/10',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-label font-medium border ${current.bg} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot} ${normalized === 'active' || normalized === 'delivered' ? 'animate-pulse' : ''}`} />
      )}
      {formatStatus(status)}
    </span>
  );
}
