import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`glass-card p-5 ${
        hoverable ? 'hover:-translate-y-0.5 hover:border-violet-500/40 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: 'violet' | 'magenta' | 'pink' | 'cyan' | 'amber' | 'emerald' | 'rose' | 'blue';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = 'violet',
  trend,
  className = '',
}: StatCardProps) {
  const accentBars = {
    violet: 'bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.6)]',
    magenta: 'bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.6)]',
    pink: 'bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.6)]',
    cyan: 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]',
    amber: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]',
    emerald: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]',
    rose: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]',
    blue: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]',
  };

  const glowColors = {
    violet: 'bg-violet-600/10 group-hover:bg-violet-600/20',
    magenta: 'bg-pink-600/10 group-hover:bg-pink-600/20',
    pink: 'bg-pink-600/10 group-hover:bg-pink-600/20',
    cyan: 'bg-cyan-600/10 group-hover:bg-cyan-600/20',
    amber: 'bg-amber-600/10 group-hover:bg-amber-600/20',
    emerald: 'bg-emerald-600/10 group-hover:bg-emerald-600/20',
    rose: 'bg-rose-600/10 group-hover:bg-rose-600/20',
    blue: 'bg-indigo-600/10 group-hover:bg-indigo-600/20',
  };

  return (
    <div
      className={`group relative overflow-hidden glass-card p-5 hover:-translate-y-0.5 transition-all duration-200 ${className}`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentBars[accent]}`} />

      {/* Ambient corner glow */}
      <div
        className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-xl pointer-events-none transition-all ${glowColors[accent]}`}
      />

      <div className="flex items-start justify-between relative z-10 mb-2.5">
        <span className="text-xs font-label uppercase tracking-widest text-slate-400 font-semibold">
          {title}
        </span>
        {icon ? (
          <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300">
            {icon}
          </div>
        ) : trend ? (
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-label font-medium border ${
              trend.isPositive
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {trend.value}
          </span>
        ) : null}
      </div>

      <div className="relative z-10">
        <div className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight tabular-nums">
          {value}
        </div>
        {subtitle && (
          <div className="text-xs text-slate-400 mt-1.5 font-body flex items-center gap-1.5 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
