import React from 'react';
import { MovementType } from '../../core/types';

interface BadgeProps {
  type?: MovementType;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ type, variant, children }) => {
  if (type) {
    const config: Record<MovementType, { label: string; bg: string }> = {
      SHARED_EXPENSE: {
        label: 'Gasto Compartido',
        bg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
      },
      INDIVIDUAL_EXPENSE: {
        label: 'Gasto Individual',
        bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      },
      LOAN: {
        label: 'Préstamo',
        bg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
      },
      SETTLEMENT: {
        label: 'Liquidación',
        bg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60',
      },
      INCOME: {
        label: 'Ingreso',
        bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
      },
    };

    const current = config[type] || config.SHARED_EXPENSE;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${current.bg}`}>
        {children || current.label}
      </span>
    );
  }

  const variantClasses = {
    success: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    danger: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    warning: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    info: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  }[variant || 'neutral'];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses}`}>
      {children}
    </span>
  );
};
