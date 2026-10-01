import React from 'react';
import { formatStatus } from '@/lib/apiClient';

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className = '' }: BadgeProps) {
  const normalized = status.toLowerCase();

  const colorStyles: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    flagged: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    confirmed: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    on_hold: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    packed: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    shipped: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    returned: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    owner: 'bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-purple-200 border-violet-500/30',
    staff: 'bg-slate-800 text-slate-300 border-white/10',
    pro: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  };

  const style = colorStyles[normalized] || 'bg-white/[0.05] text-slate-300 border-white/10';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${style} ${className}`}
    >
      {formatStatus(status)}
    </span>
  );
}

