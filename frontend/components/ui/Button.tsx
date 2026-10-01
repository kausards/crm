import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-violet/50 focus:ring-offset-2 focus:ring-offset-[#0B0810] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs h-9 px-3 gap-1.5',
    md: 'text-sm h-[42px] px-5 gap-2',
    lg: 'text-base h-12 px-6 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#EC4899] hover:brightness-110 text-white shadow-glow-violet border border-white/10',
    secondary:
      'bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 border border-white/10 hover:border-white/20',
    danger:
      'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 shadow-lg shadow-rose-950/40 border border-rose-500/30',
    outline:
      'border border-brand-violet/40 bg-brand-violet/10 hover:bg-brand-violet/20 text-purple-200',
    ghost:
      'bg-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

