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
    pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    flagged: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    confirmed: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
    on_hold: { bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
    packed: { bg: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
    shipped: { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500' },
    in_transit: { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500' },
    delivered: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    returned: { bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
    cancelled: { bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    owner: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
    staff: { bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    pro: { bg: 'bg-pink-50 text-pink-700 border-pink-200', dot: 'bg-pink-500' },
    trial: { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500' },
    paid: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    unpaid: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    overdue: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  };

  const current = colorStyles[normalized] || {
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${current.bg} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot} ${normalized === 'active' || normalized === 'delivered' ? 'animate-pulse' : ''}`} />
      )}
      {formatStatus(status)}
    </span>
  );
}
