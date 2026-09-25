import React from 'react';
import { formatStatus } from '@/lib/apiClient';

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className = '' }: BadgeProps) {
  const normalized = status.toLowerCase();

  const colorStyles: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    flagged: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    confirmed: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    on_hold: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    packed: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    shipped: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    returned: 'bg-red-500/10 text-red-400 border-red-500/30',
    cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    owner: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    staff: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  };

  const style = colorStyles[normalized] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {formatStatus(status)}
    </span>
  );
}
